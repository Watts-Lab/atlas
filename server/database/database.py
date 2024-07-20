"""
This file is responsible for initializing the database connection and the beanie model.
"""

import os
from dotenv import load_dotenv
from beanie import init_beanie
import motor
import certifi

from database.models.users import User
from database.models.results import Result


# Call this from within your event loop to get beanie setup.
async def init_db():
    """
    Initialize the database connection and the beanie model.
    """
    load_dotenv()
    ca = certifi.where()
    # Create Motor client
    client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("DB_URI"), tlsCAFile=ca)

    # Init beanie with the Product document class
    await init_beanie(database=client.atlas_main, document_models=[User, Result])
