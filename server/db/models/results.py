from datetime import datetime
from beanie import Document, PydanticObjectId


class Result(Document):
    user_id: PydanticObjectId
    json_response: dict
    tokens_prompt: int
    tokens_response: int
    quality: float
    feature_list: list
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        """
        Settings for the User model.
        """

        name = "results"
