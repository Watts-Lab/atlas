"""
File service for handling file operations with S3.
"""

import hashlib
import logging
import os
from typing import Optional, Tuple, BinaryIO
from datetime import datetime
import tempfile

import boto3
from botocore.exceptions import ClientError

from database.models.papers import Paper
from database.models.users import User
from workers.celery_config import AWS_REGION, AWS_S3_BUCKET, AWS_S3_KEY, AWS_S3_SECRET


logger = logging.getLogger(__name__)


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

    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """Calculate MD5 hash of a file."""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    @staticmethod
    def calculate_file_hash_from_stream(file_stream: BinaryIO) -> str:
        """Calculate MD5 hash from a file stream."""
        hash_md5 = hashlib.md5()
        file_stream.seek(0)
        for chunk in iter(lambda: file_stream.read(4096), b""):
            hash_md5.update(chunk)
        file_stream.seek(0)  # Reset stream position
        return hash_md5.hexdigest()

    def generate_s3_key(self, filename: str, user_id: str) -> str:
        """Generate a unique S3 key for the file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = filename.replace(" ", "_").replace("/", "_")
        return f"papers/{user_id}/{timestamp}_{safe_filename}"

    async def get_or_create_paper(
        self, file_path: str, user: User, original_filename: str
    ) -> Tuple[Paper, bool]:
        """
        Get existing paper by hash or create new one with S3 upload.

        Returns:
            Tuple of (Paper, is_new) where is_new indicates if paper was newly created
        """
        # Calculate file hash
        file_hash = self.calculate_file_hash(file_path)
        file_size = os.path.getsize(file_path)

        # Check if paper already exists
        existing_paper = await Paper.find_one(Paper.file_hash == file_hash).run()
        if existing_paper:
            logger.info("Paper already exists with hash %s", file_hash)
            return existing_paper, False

        # Upload to S3
        s3_key = self.generate_s3_key(original_filename, str(user.id))
        s3_url = await self.upload_to_s3(file_path, s3_key)

        # Create new paper record
        new_paper = Paper(
            user=user,
            title=original_filename,
            s3_url=s3_url,
            s3_key=s3_key,
            file_hash=file_hash,
            file_size=file_size,
            original_filename=original_filename,
        )
        await new_paper.create()

        logger.info("Created new paper with ID %s", new_paper.id)
        return new_paper, True

    async def upload_to_s3(self, file_path: str, s3_key: str) -> str:
        """Upload file to S3 and return the URL."""
        try:
            extra_args = {
                "ContentType": "application/pdf",
                "ServerSideEncryption": "AES256",
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

    async def download_from_s3(
        self, s3_key: str, target_path: Optional[str] = None
    ) -> str:
        """
        Download file from S3 to local path.

        Args:
            s3_key: S3 object key
            target_path: Optional target path. If not provided, creates temp file.

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

    def get_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """Generate a presigned URL for S3 object access."""
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": s3_key},
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            logger.error("Failed to generate presigned URL: %s", e)
            raise
