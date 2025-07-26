"""
This file is responsible for initializing the database connection and the bunnet model.
"""

import os
from bunnet import init_bunnet
from dotenv import load_dotenv
from pymongo import MongoClient

from database.models.features import Features
from database.models.features_quality import FeaturesQuality
from database.models.papers import Paper
from database.models.project_paper_result import ProjectPaperResult
from database.models.projects import Project
from database.models.users import User
from database.models.results import Result


# Call this from within your event loop to get bunnet setup.
def init_db():
    """
    Initialize the database connection and the bunnet model.
    """
    load_dotenv()
    # Create Motor client
    client = MongoClient(os.getenv("DB_URI"))

    client.admin.command("ping")
    print("Connected to the database.")

    # Init bunnet with the Product document class
    init_bunnet(
        database=client.atlas_main,
        document_models=[
            User,
            Paper,
            Result,
            Project,
            Features,
            ProjectPaperResult,
            FeaturesQuality,
        ],
    )
