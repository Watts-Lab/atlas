"""
This module contains the task to save a file to S3.
"""

import logging
import hashlib
from database.models.papers import Paper
from workers.celery_config import AWS_S3_BUCKET, s3
from workers.celery_config import celery

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="save_file_to_s3")
def save_file_to_s3(_self, file_path: str, uniuqe_id: str, user_id: str):
    """
    Get the paper information.
    e.g. Title, Authors, Abstract, etc.
    """
    try:
        # Calculate the hash of the file to check if it already exists in the database
        with open(file_path, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()

        found_paper = Paper.find_one(Paper.file_hash == file_hash).run()

        if found_paper:
            logger.info("Paper already exists in the database: %s", found_paper.id)
            return {"paper": str(found_paper.id)}

        file_name = file_path.replace(f"{uniuqe_id}-", "")

        s3.upload_file(
            file_path,
            AWS_S3_BUCKET,
            f"{file_name}",
            ExtraArgs=None,
            Callback=None,
            Config=None,
        )

        uri = f"https://{AWS_S3_BUCKET}.s3.us-east-1.amazonaws.com/{file_name}"

        logger.info("File uploaded to S3: %s", uri)

        new_paper = Paper(
            user=user_id,
            title=file_name.replace("papers/", ""),
            s3_url=uri,
            file_hash=file_hash,
        )

        new_paper.create()

    except s3.exceptions.S3UploadFailedError as e:
        logger.error("S3 upload failed: %s", e)
    except s3.exceptions.NoCredentialsError as e:
        logger.error("Credentials not available: %s", e)
    except Exception as e:
        logger.exception("An unexpected error occurred")

    return {"paper": str(new_paper.id)}
