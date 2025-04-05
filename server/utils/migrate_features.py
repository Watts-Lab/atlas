"""
This file is responsible for initializing the database connection and the beanie model.
"""

import json
import os
import pathlib

from bunnet import init_bunnet
from database.models.features import Features
from database.models.papers import Paper
from database.models.projects import Project
from database.models.results import Result
from database.models.users import User
from dotenv import load_dotenv
from pymongo import MongoClient


def init_db():
    """
    Initialize the database connection and the beanie model.
    """
    load_dotenv()
    # Create Motor client
    client = MongoClient(os.getenv("DB_URI"))

    client.admin.command("ping")
    print("Connected to the database.")

    # Init beanie with the Product document class
    init_bunnet(
        database=client.atlas_main,
        document_models=[User, Paper, Result, Project, Features],
    )


if __name__ == "__main__":
    init_db()

    # parent_objects = build_parent_objects(features)

    # Load the JSON file
    # Print the current path
    current_path = pathlib.Path(__file__).parent.resolve()

    with open(f"{current_path}/behaviors.json", "r", encoding="utf-8") as file:
        data = json.load(file)

    # Process the JSON data if needed
    for f in data:
        # print(f["feature_name"])
        # print(f["feature_parent"])
        # print(f["feature_identifier"])
        # print(f["feature_description"])
        # print(f["feature_gpt_interface"])

        new_feature = Features(
            feature_name=f["feature_name"],
            feature_parent=f["feature_parent"],
            feature_identifier=f["feature_identifier"],
            feature_description=f["feature_description"],
            feature_gpt_interface=f["feature_gpt_interface"],
        )

        new_feature.save()

        print(f"Feature saved. {new_feature.feature_name}")

    # feature_experiments_description = Features(
    #     feature_name="description",
    #     feature_parent="experiments",
    #     feature_identifier="paper.experiments.description",
    #     feature_description="The experiments in a paper.",
    #     feature_gpt_interface={
    #         "type": "string",
    #         "description": (
    #             "Describe the experiment in detail. "
    #             "Author's words: Provide a concise but comprehensive description of the experiment as mentioned by the authors in the paper. "
    #             "If the description is not clear or is too lengthy, paraphrase it to be more concise and understandable."
    #         ),
    #     },
    # )
