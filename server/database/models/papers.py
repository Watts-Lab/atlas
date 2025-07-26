"""
Papers model.
"""

from datetime import datetime
from bunnet import Document, Link, PydanticObjectId
from pydantic import BaseModel, Field
from database.models.users import User


class Paper(Document):
    """
    Papers model.
    """

    user: Link[User]
    title: str
    s3_url: str  # URL to the S3 object
    s3_key: str  # S3 object key
    file_hash: str
    file_size: int
    original_filename: str
    mime_type: str = "application/pdf"
    metadata: dict = Field(default_factory=dict)  # Store additional metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        """
        Settings for the Papers model.
        """

        name = "papers"
        indexes = [
            "file_hash",  # Index for quick hash lookups
            "s3_key",  # Index for S3 key lookups
        ]

    class Config:
        from_attributes = True


class PaperView(BaseModel):
    """
    Project view model.
    """

    id: PydanticObjectId
    title: str
    file_hash: str
    updated_at: datetime

    class Settings:
        projection = {
            "id": "$_id",
            "title": 1,
            "file_hash": 1,
            "updated_at": 1,
        }
