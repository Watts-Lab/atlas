from datetime import datetime
from typing import Optional
from beanie import Document
from beanie.operators import *


class User(Document):
    email: str
    magic_link: str
    magic_link_expiration: datetime
    number_of_tokens: Optional[int]
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        name = "users"
