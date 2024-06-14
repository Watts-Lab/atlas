"""
Functions to interact with the OpenAI API.
"""

import json
import importlib
from datetime import datetime
from typing import Dict, List, Union
from openai import OpenAI

client = OpenAI()


def get_all_features() -> List[str]:
    """
    Gets all the available features.

    Returns:
    - List of all available features.
    """
    return [
        "features.condition.name",
        "features.condition.description",
        "features.condition.type",
        "features.condition.message",
    ]


def build_feature_functions(
    feature_list: List[str],
) -> List[Dict[str, Union[int, str]]]:
    """
    Builds a list of dictionaries containing the feature functions.

    Args:
    - feature_list: List of feature functions.

    Returns:
    - List of dictionaries containing the feature functions.
    """

    parent = "features.condition.parent"
    parent_module = importlib.import_module(parent)
    parent_class = parent_module.Feature()
    print(parent_class.get_functional_object())

    function_call = {
        "name": "define_conditions",
        "description": "Define the conditions in the experiment. Each condition should be a separate object with specified properties.",
        "parameters": {
            "type": "object",
            "properties": {
                "conditions": {
                    "type": "array",
                    "description": "Array of condition objects with detailed properties.",
                    "items": {
                        "type": "object",
                        "properties": {},
                    },
                }
            },
            "required": ["conditions"],
        },
    }

    for feature in feature_list:
        feature_module = importlib.import_module(feature)
        feature_class = feature_module.Feature()
        function_call["parameters"]["properties"]["conditions"]["items"][
            "properties"
        ] = {
            **function_call["parameters"]["properties"]["conditions"]["items"][
                "properties"
            ],
            **feature_class.get_functional_object(prefix="condition_"),
        }

    return function_call


def upload_file_to_vector_store(file_path: str) -> str:
    """
    Uploads a file to the vector store.

    Args:
    - file_path: Path to the file to upload.

    Returns:
    - URL to the uploaded file.
    """

    file_info = client.files.create(file=open(file_path, "rb"), purpose="assistants")

    now = datetime.now()
    date_time = now.strftime("%Y_%m_%d_%H_%M_%S")
    vector_store = client.beta.vector_stores.create(
        name=f"atlas_run_{date_time}",
        file_ids=[file_info.id],
        expires_after={"anchor": "last_active_at", "days": 1},
    )

    return vector_store


def update_assistant(
    assistant_id: str, vector_store, functions: List[Dict[str, Union[int, str]]]
):
    """
    Updates the assistant with the new functions.

    Args:
    - assistant_id: ID of the assistant to update.
    - functions: List of dictionaries containing the feature functions.
    """

    my_updated_assistant = client.beta.assistants.update(
        assistant_id=assistant_id,
        tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}},
        tools=[
            {"type": "file_search"},
            {"type": "function", "function": functions},
        ],
    )

    return my_updated_assistant


def call_asssistant_api(file_path: str):
    feature_list = get_all_features()
    functions = build_feature_functions(feature_list)
    vector_store = upload_file_to_vector_store(file_path)
    updated_assistant = update_assistant(
        "asst_2THkE8dZlIZDDCZvd3ZBjara", vector_store, functions
    )

    thread_message = client.beta.threads.create(
        messages=[
            {
                "role": "user",
                "content": "define_conditions",
            }
        ],
    )

    run = client.beta.threads.runs.create_and_poll(
        thread_id=thread_message.id, assistant_id=updated_assistant.id
    )

    tool_outputs = json.loads(
        run.required_action.submit_tool_outputs.tool_calls[0].function.arguments
    )

    # deleting the vector store
    vector_store_files = client.beta.vector_stores.files.list(
        vector_store_id=vector_store.id
    )
    file_ids = [file.id for file in vector_store_files.data]

    deleted_vector_store = client.beta.vector_stores.delete(
        vector_store_id=vector_store.id
    )

    if deleted_vector_store.deleted == True:
        print("Vector store deleted successfully")
    else:
        print("Vector store deletion failed")

    # deleting the file
    for file_id in file_ids:
        deleted_file = client.files.delete(file_id)
        if deleted_file.deleted == True:
            print("File deleted successfully")
        else:
            print("File deletion failed")

    return tool_outputs


if __name__ == "__main__":
    call_asssistant_api("paper/A_67a_2021_BehaviouralNudgesIncrease.pdf")
