"""
Papers model.
"""

from datetime import datetime
from typing import List
from bunnet import Document, Link

from database.models.results import Result
from database.models.users import User


class Papers(Document):
    """
    Papers model.
    """

    user: Link[User]
    title: str
    run_ids: List[str]
    truth_ids: List[Link[Result]]
    s3_url: str
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        """
        Settings for the Papers model.
        """

        name = "papers"
