"""
User model. This model is used to store user data in the database.
"""

from datetime import datetime, UTC
from typing import List, Optional
from bunnet import Document, Indexed
from pydantic import Field


class User(Document):
    """
    User model.
    """

    email: Indexed(str, unique=True)  # type: ignore
    magic_link: str
    magic_link_expired: bool = True
    magic_link_expiration_date: datetime
    number_of_tokens: Optional[int]

    # A list of recently viewed projects with their view timestamps
    # format : [{"project_id": str, "viewed_at": datetime}]
    recently_viewed_projects: List[dict] = Field(default_factory=list)

    created_at: datetime = datetime.now(UTC)
    updated_at: datetime = datetime.now(UTC)

    class Settings:
        """
        Settings for the User model.
        """

        name = "users"
        use_revision = True

    def __str__(self):
        return self.email

    def to_dict(self) -> dict:
        """
        Convert the User object to a dictionary.
        """
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.email,
            "magic_link": self.magic_link,
            "magic_link_expired": self.magic_link_expired,
            "magic_link_expiration_date": self.magic_link_expiration_date,
            "number_of_tokens": self.number_of_tokens,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
