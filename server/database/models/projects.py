"""
Papers model.
"""

from datetime import datetime
from typing import List
from uuid import UUID, uuid4
from bunnet import Document, Link

from pydantic import Field

from database.models.papers import Paper
from database.models.users import User


class Project(Document):
    """
    Papers model.
    """

    user: Link[User]
    title: str
    slug: UUID = Field(default_factory=uuid4)
    papers: List[Link[Paper]] = []
    features: List[str] = (
        []
    )  # selected features (give user a list of features to choose from in a checkbox format for now)
    rules: List[str] = (
        []
    )  # on feature [experiments.conditions.number] (rule) [value] rule can be [greater than, less than, equal to, not equal to, contains, does not contain]

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        """
        Settings for the Projects model.
        """

        name = "projects"


class ProjectVersion(Document):
    """
    Aggregate the project versions.
    it should keep track of who made changes and when.

    """

    user: Link[User]
    title: str
    slug: UUID = Field(default_factory=uuid4)
    versions: List[Link[Project]] = []

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
