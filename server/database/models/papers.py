"""
Papers model.
"""

from datetime import datetime
from typing import List
from bunnet import Document, Link, PydanticObjectId
from pydantic import BaseModel

from database.models.results import Result
from database.models.users import User


class Paper(Document):
    """
    Papers model.
    """

    user: Link[User]
    title: str
    run_ids: List[str]
    truth_ids: List[Link[Result]]
    s3_url: str
    file_hash: str
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    # Define the property for experiments
    @property
    def experiments(self) -> List[dict]:
        if self.truth_ids:
            # Assuming that truth_ids is a list of Result documents
            # Fetch the first Result document
            result = self.truth_ids[0]
            # Access the json_response field safely
            return result.json_response.get("experiments", [])
        else:
            return []

    class Settings:
        """
        Settings for the Papers model.
        """

        name = "papers"

    class Config:
        orm_mode = True
        underscore_attrs_are_private = True


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
