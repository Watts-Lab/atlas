"""
This file is responsible for initializing the database connection and the beanie model.
"""

import importlib
import os
from typing import List
from bunnet import init_bunnet
from dotenv import load_dotenv
from pymongo import MongoClient

from database.models.features import Features
from database.models.papers import Paper
from database.models.projects import Project
from database.models.users import User
from database.models.results import Result
from features.gpt_feature import GPTFeature
import json
import pathlib


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


def get_all_features() -> List[str]:
    """
    Gets all the available features.

    Returns:
    - List of all available features.
    """

    experiments_features = [
        "experiments.name",
        "experiments.description",
        "experiments.participant_source",
        "experiments.participant_source_category",
        "experiments.units_randomized",
        "experiments.units_analyzed",
        "experiments.sample_size_randomized",
        "experiments.sample_size_analyzed",
        "experiments.sample_size_notes",
        "experiments.adults",
        "experiments.age_mean",
        "experiments.age_sd",
        "experiments.female_perc",
        "experiments.male_perc",
        "experiments.gender_other",
        "experiments.language",
        "experiments.language_secondary",
        "experiments.compensation",
        "experiments.demographics_conditions",
        "experiments.population_other",
        "experiments.conditions.name",
        "experiments.conditions.description",
        "experiments.conditions.type",
        "experiments.conditions.message",
        "experiments.conditions.behaviors.name",
        "experiments.conditions.behaviors.description",
        "experiments.conditions.behaviors.priority",
        "experiments.conditions.behaviors.focal",
    ]

    sorted_features = sorted(experiments_features, key=lambda s: s.count("."))

    return sorted_features


def build_parent_objects(_features: List[str]) -> dict:
    """
    Builds the parent objects for the given _features.
    """
    nested_dict = {}
    for _feature in _features:
        feature_module: GPTFeature = importlib.import_module(
            f"features.{_feature}"
        ).Feature()
        nested_dict[_feature]["class"] = feature_module.get_json_object()
        nested_dict[_feature]["identifier"] = f"paper.{_feature}"
    return nested_dict


if __name__ == "__main__":
    init_db()

    features = get_all_features()
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
