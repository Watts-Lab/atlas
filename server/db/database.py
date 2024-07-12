import asyncio
import os
from dotenv import load_dotenv
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from models.users import User


load_dotenv()


# Call this from within your event loop to get beanie setup.
async def init_db():
    # Create Motor client
    client = AsyncIOMotorClient(os.getenv("DB_URI"))

    # Init beanie with the Product document class
    await init_beanie(database=client.atlas_main, document_models=[User])


async def main():
    await init_db()
    us = User(
        email="example@example.com",
        magic_link="1234",
        magic_link_expiration="2021-01-01",
        number_of_tokens=5,
    )

    await us.create()


if __name__ == "__main__":
    asyncio.run(main())
