"""
Results model.
"""

from datetime import datetime
from bunnet import Document, Link

from database.models.projects import Project
from database.models.users import User


class Result(Document):
    """
    Result model.
    """

    user: Link[User]
    json_response: dict
    prompt_token: int
    completion_token: int
    quality: float
    feature_list: list
    project_id: Link[Project]
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        """
        Settings for the User model.
        """

        name = "results"
