"""
This file is responsible for initializing the database connection and the beanie model.
"""

import asyncio
import os
from dotenv import load_dotenv
from beanie import init_beanie
import motor
import certifi

from db.models.users import User
from db.models.results import Result


load_dotenv()


# Call this from within your event loop to get beanie setup.
async def init_db():
    """
    Initialize the database connection and the beanie model.
    """
    ca = certifi.where()
    # Create Motor client
    client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("DB_URI"), tlsCAFile=ca)

    # Init beanie with the Product document class
    await init_beanie(database=client.atlas_main, document_models=[User, Result])


async def main():
    await init_db()

    my_user = await User.find_one(User.email == "example@example.com")

    print(my_user)
    if not my_user:
        us = User(
            email="example@example.com",
            magic_link="1234",
            magic_link_expiration="2021-01-01",
            number_of_tokens=5,
        )
        my_user = await us.create()

    res = Result(
        user_id=my_user.id,
        json_response={"response": "test"},
        tokens_prompt=5,
        tokens_response=5,
        quality=0.5,
        feature_list=["test"],
    )

    await res.create()


if __name__ == "__main__":
    asyncio.run(main())
