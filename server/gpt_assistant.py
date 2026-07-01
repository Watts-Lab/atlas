"""
Functions to interact with the OpenAI API.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Tuple

from database.models.features import Features
from database.models.projects import Project
from dotenv import load_dotenv
from openai import OpenAI
from openai.types import VectorStore

load_dotenv()

logger = logging.getLogger(__name__)


class AssistantException(Exception):
    """
    Custom exception class for assistant errors.
    """

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self):
        return f"AssistantException: {self.message}"


def get_all_features(project_id: str) -> Tuple[List[str], Dict]:
    """
    Gets all the available features.

    Returns:
    - List of all available features.
    """

    current_project: Project = Project.get(project_id, fetch_links=True).run()

    feature_list = []
    user_features = {}

    for feature in current_project.features:
        if feature.feature_identifier.endswith("parent"):
            continue
        user_features[feature.feature_identifier] = (
            feature.feature_gpt_interface.model_dump(exclude_none=True)
        )
        feature_list.append(feature.feature_identifier)

    sorted_features = sorted(feature_list, key=lambda s: s.count("."))

    return sorted_features, user_features


def get_features_by_ids(feature_ids: List[str]) -> Tuple[List[str], Dict]:
    """
    Gets specified features by their IDs.
    Returns sorted_features (list of identifiers) and user_features (dict of schemas)
    """
    feature_list = []
    user_features = {}

    for fid in feature_ids:
        feature = Features.get(fid).run()
        if not feature:
            continue
        if feature.feature_identifier.endswith("parent"):
            continue
        user_features[feature.feature_identifier] = (
            feature.feature_gpt_interface.model_dump(exclude_none=True)
        )
        feature_list.append(feature.feature_identifier)

    sorted_features = sorted(feature_list, key=lambda s: s.count("."))
    return sorted_features, user_features


def enforce_additional_properties(schema):
    """
    Recursively enforce that every object in the schema has "additionalProperties": False.
    """
    if isinstance(schema, dict):
        if schema.get("type") == "object" and "additionalProperties" not in schema:
            schema["additionalProperties"] = False
        for key, value in schema.items():
            schema[key] = enforce_additional_properties(value)
    elif isinstance(schema, list):
        schema = [enforce_additional_properties(item) for item in schema]
    return schema


def build_parent_objects(feature_list: list[str], feature_object: dict) -> dict:
    """
    Builds the parent objects for the given features.
    """
    nested_dict = {}
    for feature in feature_list:
        keys = feature.split(".")
        current_dict = nested_dict
        # Create nested schema definitions as arrays with object items
        for key in keys[:-1]:
            if key not in current_dict:
                logger.info("Adding key %s to the dictionary", key)
                feature_class = Features.find_one(
                    Features.feature_identifier == f"{key}.parent"
                ).run()
                if feature_class:
                    schema = feature_class.feature_gpt_interface.parent_dump()
                    logger.info("Enforcing additional properties %s", schema)
                    # Ensure that the schema has additionalProperties set to False
                    schema = enforce_additional_properties(schema)
                    current_dict[key] = schema
                else:
                    current_dict[key] = {
                        "type": "array",
                        "description": f"Array of {key} objects with detailed properties.",
                        "items": {
                            "type": "object",
                            "properties": {},
                            "required": [],
                            "additionalProperties": False,
                        },
                    }
            # Move to the nested object properties for further definitions.
            current_dict = current_dict[key]["items"]["properties"]

        # Set the final property from feature_object, it should be a schema dict.
        current_dict[keys[-1]] = feature_object[feature]

    # Add required keys if necessary by traversing again
    for feature in feature_list:
        keys = feature.split(".")
        current_section = nested_dict
        for key in keys[:-1]:
            if key in current_section:
                current_section = current_section[key]["items"]
            else:
                if "required" not in current_section:
                    current_section["required"] = []
                if key not in current_section["required"]:
                    current_section["required"].append(key)
                current_section = current_section["properties"][key]["items"]
        if "required" not in current_section:
            current_section["required"] = []
        current_section["required"].append(keys[-1])
        current_section["additionalProperties"] = False

    # Finally, run the entire built schema through the enforcement function
    nested_dict = enforce_additional_properties(nested_dict)
    return nested_dict


def build_openai_feature_functions(
    feature_list: list[str], feature_object: dict
) -> dict:
    """
    Builds and returns a OPENAI function object.

    Args:
        feature_list (List[str]): A list of features.

    Returns:
        dict: The OpenAI function object.

    Raises:
        None
    """

    openai_function_object = {
        "name": "extract_features",
        "description": ("Extract features from a scientific paper. "),
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": build_parent_objects(feature_list, feature_object),
            "additionalProperties": False,
            "required": ["paper"],
        },
    }

    return openai_function_object


def upload_file_to_vector_store(client: OpenAI, file_path: str) -> VectorStore:
    """
    Uploads a file to the vector store.

    Args:
    - file_path: Path to the file to upload.

    Returns:
    - URL to the uploaded file.
    """

    with open(file_path, "rb") as file:
        file_info = client.files.create(file=file, purpose="assistants")

    now = datetime.now()
    date_time = now.strftime("%Y_%m_%d_%H_%M_%S")
    vector_store = client.vector_stores.create(
        name=f"atlas_run_{date_time}",
        file_ids=[file_info.id],
        expires_after={"anchor": "last_active_at", "days": 1},
    )

    return vector_store


def update_assistant(
    client: OpenAI, assistant_id: str, vector_store, function: Dict, schema: Dict = None
):
    """
    Updates the assistant with the new function.

    Args:
    - assistant_id: ID of the assistant to update.
    - function: List of dictionaries containing the feature function.
    """
    logger.info(
        "Updating assistant with ID: %s with new function %s", assistant_id, function
    )
    try:
        my_updated_assistant = client.beta.assistants.update(
            assistant_id=assistant_id,
            tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}},
            tools=[
                {"type": "file_search"},
                {"type": "function", "function": function},
            ],
            **(
                {
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "extract_features",
                            "strict": True,
                            "schema": schema,
                        },
                    }
                }
                if schema
                else {}
            ),
        )
    except Exception as e:
        logger.error("Failed to update assistant: %s", e)
        raise AssistantException("Assistant update failed") from e

    return my_updated_assistant


def check_output_format(output):
    """
    Checks if the tool output is correctly formatted.
    Args:
    - output: The output to check.
    Returns:
    - True if the format is correct, raises an exception if not.
    """
    # Implement your format checking logic here
    if isinstance(output, dict) and "paper" in output:
        return True

    raise AssistantException("Output format is incorrect")


def create_temporary_assistant(client: OpenAI, custom_prompt: str = None):
    """
    Creates a temporary assistant with the given functions.

    Args:
        - client: OpenAI client object.
        - custom_prompt: Custom prompt for the assistant.

    Returns:
        - The created assistant.
    """

    default_prompt = (
        "You are a research assistnant for a team of scientists tasked with research cartography. "
        "You are given a PDF of the paper and are asked to provide a summary of the key findings. Your response should be in JSON format. "
        "Just provide the JSON response without any additional text. Do not include ```json or any other formatting."
    )

    instructions = custom_prompt if custom_prompt else default_prompt

    logger.info(
        "Creating temporary assistant with model: %s",
        "gpt-4.1",
    )

    my_temporary_assistant = client.beta.assistants.create(
        instructions=instructions, name="Atlas explorer", model="gpt-4.1"
    )

    return my_temporary_assistant
