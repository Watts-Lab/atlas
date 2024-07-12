"""
User model. This model is used to store user data in the database.
"""

from datetime import datetime, UTC
from typing import Optional
from beanie import Document, Indexed


class User(Document):
    """
    User model.
    """

    email: Indexed(str, unique=True)
    magic_link: str
    magic_link_expired: bool = True
    magic_link_expiration_date: datetime
    number_of_tokens: Optional[int]
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
