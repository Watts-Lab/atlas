"""
Results model.
"""

from datetime import datetime
from typing import Optional
from bunnet import Document, Link, PydanticObjectId
from pydantic import BaseModel, Field

from database.models.projects import Project
from database.models.users import User
from database.models.papers import Paper


class Result(Document):
    """
    Result model with versioning support.
    """

    user: Link[User]
    paper: Optional[Link[Paper]] = None
    json_response: dict
    prompt_token: int
    completion_token: int
    feature_list: list
    project: Link[Project]
    task_id: Optional[str] = None
    finished: bool = False

    # Versioning fields
    version: int = 1
    is_latest: bool = True
    previous_version: Optional[Link["Result"]] = None

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        """
        Settings for the Result model.
        """

        name = "results"
        indexes = [
            "task_id",
            [
                ("paper", 1),
                ("project", 1),
                ("is_latest", 1),
            ],  # Compound index for efficient lookups
        ]


class ResultViewId(BaseModel):
    """
    Result view model.
    """

    id: PydanticObjectId
    project: Link[Project]

    class Settings:
        projection = {
            "id": "$_id",
            "project": "$project",
        }
