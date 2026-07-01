"""
File service for handling file operations with S3.
"""

import hashlib
import logging
import os
import tempfile
import time
from datetime import datetime
from typing import Optional, Tuple

import boto3
import redis
from botocore.exceptions import ClientError
from database.models.papers import Paper
from database.models.users import User
from pymongo.errors import DuplicateKeyError
from workers.celery_config import AWS_REGION, AWS_S3_BUCKET, AWS_S3_KEY, AWS_S3_SECRET

logger = logging.getLogger(__name__)

# Maximum size (bytes) accepted for a directly-uploaded paper PDF. Mirrors the
# nginx `client_max_body_size` used for uploads that pass through the API, since
# presigned uploads go straight to S3 and never touch nginx. Override with the
# MAX_UPLOAD_BYTES env var if needed.
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))

# PDF magic number: every valid PDF begins with these bytes ("%PDF-").
_PDF_MAGIC = b"%PDF-"


class FileService:
    """Service for handling file operations with S3."""

    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_S3_KEY,
            aws_secret_access_key=AWS_S3_SECRET,
            region_name=AWS_REGION,
        )
        self.bucket_name = AWS_S3_BUCKET
        # Initialize Redis client for distributed locks
        self.redis_client = redis.from_url(
            os.getenv("CELERY_BROKER_URL", "redis://localhost:6379")
        )

    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """Calculate SHA-256 hash of a file for better uniqueness."""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    def generate_s3_key(self, filename: str, user_id: str, file_hash: str) -> str:
        """Generate a unique S3 key for the file using hash."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = filename.replace(" ", "_").replace("/", "_")
        # Include hash in the path to ensure uniqueness
        return f"papers/{file_hash[:8]}/{user_id}/{timestamp}_{safe_filename}"

    def acquire_upload_lock(self, file_hash: str, timeout: int = 30) -> bool:
        """
        Acquire a distributed lock for uploading a specific file.

        Args:
            file_hash: The hash of the file to lock
            timeout: Maximum time to wait for lock in seconds

        Returns:
            True if lock was acquired, False otherwise
        """
        lock_key = f"paper_upload_lock:{file_hash}"

        for _ in range(timeout):
            # Try to set the lock with 60 second expiration
            if self.redis_client.set(lock_key, "locked", nx=True, ex=60):
                return True
            time.sleep(1)

        return False

    def release_upload_lock(self, file_hash: str):
        """Release the upload lock for a file."""
        lock_key = f"paper_upload_lock:{file_hash}"
        self.redis_client.delete(lock_key)

    def get_or_create_paper(
        self, file_path: str, user: User, original_filename: str
    ) -> Tuple[Paper, bool]:
        """
        Get existing paper by hash or create new one with S3 upload.
        Handles concurrent uploads gracefully.

        Returns:
            Tuple of (Paper, is_new) where is_new indicates if paper was newly created
        """
        # Calculate file hash
        file_hash = self.calculate_file_hash(file_path)
        file_size = os.path.getsize(file_path)

        # First check without lock
        existing_paper = Paper.find_one(Paper.file_hash == file_hash).run()
        if existing_paper:
            logger.info("Paper already exists with hash %s", file_hash)
            return existing_paper, False

        # Try to acquire lock for this file
        lock_acquired = self.acquire_upload_lock(file_hash)

        try:
            # Double-check after acquiring lock (or timeout)
            existing_paper = Paper.find_one(Paper.file_hash == file_hash).run()
            if existing_paper:
                logger.info(
                    "Paper was created by another process with hash %s", file_hash
                )
                return existing_paper, False

            if not lock_acquired:
                # Lock timeout - check one more time
                existing_paper = Paper.find_one(Paper.file_hash == file_hash).run()
                if existing_paper:
                    return existing_paper, False

                logger.warning(
                    "Could not acquire lock for file %s, proceeding anyway", file_hash
                )

            # Upload to S3
            s3_key = self.generate_s3_key(original_filename, str(user.id), file_hash)

            # Check if file already exists in S3 (another safety check)
            if self.check_s3_exists(s3_key):
                logger.info("File already exists in S3 with key %s", s3_key)
                # Try to find the paper again
                existing_paper = Paper.find_one(Paper.file_hash == file_hash).run()
                if existing_paper:
                    return existing_paper, False

            s3_url = self.upload_to_s3(file_path, s3_key)

            # Create new paper record
            new_paper = Paper(
                user=user,
                title=original_filename,
                s3_url=s3_url,
                s3_key=s3_key,
                file_hash=file_hash,
                file_size=file_size,
                original_filename=original_filename,
                metadata={
                    "uploaded_by": str(user.id),
                    "upload_timestamp": datetime.now().isoformat(),
                },
            )

            try:
                new_paper.save()
                logger.info("Created new paper with ID %s", new_paper.id)
                return new_paper, True

            except DuplicateKeyError:
                # Another process created the paper while we were uploading
                logger.info("Paper was created by another process during save")
                existing_paper = Paper.find_one(Paper.file_hash == file_hash).run()
                if existing_paper:
                    # Clean up our S3 upload since we won't use it
                    try:
                        self.s3_client.delete_object(
                            Bucket=self.bucket_name, Key=s3_key
                        )
                    except Exception as e:
                        logger.warning("Failed to clean up duplicate S3 upload: %s", e)

                    return existing_paper, False
                else:
                    # This shouldn't happen, but re-raise if it does
                    raise

        finally:
            # Always release the lock if we acquired it
            if lock_acquired:
                self.release_upload_lock(file_hash)

    def generate_presigned_put(self, s3_key: str, expires_in: int = 3600) -> str:
        """Return a presigned URL the client can PUT a file to directly.

        Note: a presigned PUT cannot enforce a size limit or content type — use
        :meth:`generate_presigned_post` for uploads that must be bounded.
        """
        try:
            return self.s3_client.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket_name, "Key": s3_key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            logger.error("Failed to presign upload URL: %s", e)
            raise

    def generate_presigned_post(
        self,
        s3_key: str,
        expires_in: int = 3600,
        max_bytes: int = MAX_UPLOAD_BYTES,
        content_type: str = "application/pdf",
    ) -> dict:
        """Return a presigned POST (url + form fields) for a bounded direct upload.

        Unlike a presigned PUT, a presigned POST supports policy *conditions*
        that S3 enforces at upload time. We use:

        * ``content-length-range`` — S3 rejects uploads larger than ``max_bytes``
          (and empty ones), so a client cannot push a 50GB file straight to S3.
        * a fixed ``Content-Type`` — declared type must match (this is a weak
          check since it can be spoofed; the actual PDF magic bytes are verified
          server-side at finalize).

        The returned dict has ``url`` and ``fields``; the client must send every
        field plus the file (as the ``file`` part) in a multipart/form-data POST.
        """
        try:
            return self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, max_bytes],
                ],
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            logger.error("Failed to presign upload POST: %s", e)
            raise

    def head_object_size(self, s3_key: str) -> Optional[int]:
        """Return the size in bytes of an S3 object, or None if it is missing."""
        try:
            resp = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return int(resp["ContentLength"])
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
                return None
            raise

    def looks_like_pdf(self, s3_key: str) -> bool:
        """Return True if the S3 object starts with the PDF magic bytes.

        Reads only the first few bytes (HTTP Range request) so it is cheap even
        for large objects. Content-Type headers can be spoofed; the leading
        ``%PDF-`` signature is the reliable check that the bytes are really a PDF.
        """
        try:
            resp = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Range=f"bytes=0-{len(_PDF_MAGIC) - 1}",
            )
            head = resp["Body"].read(len(_PDF_MAGIC))
            return head.startswith(_PDF_MAGIC)
        except ClientError as e:
            logger.error("Failed to read object header for %s: %s", s3_key, e)
            return False

    def check_s3_exists(self, s3_key: str) -> bool:
        """Check if an object exists in S3."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise

    def upload_to_s3(self, file_path: str, s3_key: str) -> str:
        """Upload file to S3 and return the URL."""
        try:
            extra_args = {
                "ContentType": "application/pdf",
                "ServerSideEncryption": "AES256",
                "Metadata": {
                    "upload_timestamp": datetime.now().isoformat(),
                },
            }

            self.s3_client.upload_file(
                file_path, self.bucket_name, s3_key, ExtraArgs=extra_args
            )

            # Generate URL
            s3_url = (
                f"https://{self.bucket_name}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
            )
            logger.info("Successfully uploaded file to S3: %s", s3_url)
            return s3_url

        except ClientError as e:
            logger.error("Failed to upload file to S3: %s", e)
            raise

    def download_from_s3(self, s3_key: str, target_path: Optional[str] = None) -> str:
        """
        Download file from S3 to local path.

        Returns:
            Path to downloaded file
        """
        try:
            if target_path is None:
                # Create temporary file
                fd, target_path = tempfile.mkstemp(suffix=".pdf")
                os.close(fd)

            self.s3_client.download_file(self.bucket_name, s3_key, target_path)

            logger.info("Successfully downloaded file from S3 to %s", target_path)
            return target_path

        except ClientError as e:
            logger.error("Failed to download file from S3: %s", e)
            raise
