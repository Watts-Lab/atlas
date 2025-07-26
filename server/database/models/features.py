"""
Features model.
"""

from typing import Optional
from bunnet import Document, Link, PydanticObjectId
from pydantic import BaseModel

from database.models.users import User
from database.schemas.gpt_interface import GPTInterface


class Features(Document):
    """This class represents a feature stored in MongoDB."""

    # TODO: Add a versioning
    feature_name: str
    feature_parent: str
    feature_identifier: str
    feature_description: str
    feature_gpt_interface: GPTInterface
    user: Optional[Link[User]] = None
    is_shared: Optional[bool] = False

    class Settings:
        """Settings for the Features model."""

        name = "features"  # The name of the MongoDB collection

    def __str__(self) -> str:
        return f"Feature {self.feature_name}"


class FeaturesView(BaseModel):
    """
    Features view model.
    """

    id: PydanticObjectId
    feature_name: str
    feature_description: str

    class Settings:
        projection = {
            "id": "$_id",
            "feature_name": 1,
            "feature_description": 1,
        }
