"""
Functions to interact with the OpenAI API.
"""

import json
import importlib
from datetime import datetime
from typing import Dict, List, Union
from openai import OpenAI


client = OpenAI()


class AssistantException(Exception):
    """
    Custom exception class for assistant errors.
    """

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self):
        return f"AssistantException: {self.message}"


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


def check_output_format(output):
    """
    Checks if the tool output is correctly formatted.
    Args:
    - output: The output to check.
    Returns:
    - True if the format is correct, raises an exception if not.
    """
    # Implement your format checking logic here
    if isinstance(output, dict) and "conditions" in output:
        return True
    else:
        raise AssistantException("Output format is incorrect")


def call_asssistant_api(file_path: str, sid: str, sio):
    try:
        sio.emit(
            "status", {"status": "Fetching all features...", "progress": 0}, to=sid
        )
        feature_list = get_all_features()

        sio.emit(
            "status",
            {"status": "Building feature functions...", "progress": 5},
            to=sid,
        )
        functions = build_feature_functions(feature_list)

        sio.emit(
            "status",
            {"status": "Uploading file to vector store...", "progress": 10},
            to=sid,
        )
        vector_store = upload_file_to_vector_store(file_path)

        sio.emit("status", {"status": "Updating assistant...", "progress": 15}, to=sid)
        updated_assistant = update_assistant(
            "asst_2THkE8dZlIZDDCZvd3ZBjara", vector_store, functions
        )

        sio.emit(
            "status", {"status": "Creating thread message...", "progress": 30}, to=sid
        )
        thread_message = client.beta.threads.create(
            messages=[
                {
                    "role": "user",
                    "content": "define_conditions",
                }
            ],
        )

        sio.emit("status", {"status": "Running assistant...", "progress": 40}, to=sid)
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread_message.id, assistant_id=updated_assistant.id
        )

        sio.emit(
            "status", {"status": "Getting tool outputs...", "progress": 50}, to=sid
        )
        tool_outputs = json.loads(
            run.required_action.submit_tool_outputs.tool_calls[0].function.arguments
        )

        sio.emit(
            "status", {"status": "Checking output format...", "progress": 60}, to=sid
        )
        check_output_format(tool_outputs)

    except json.JSONDecodeError as je:
        print(je)
        raise AssistantException("Assistant run failed - JSON Decode Error") from je
    except TypeError as te:
        print(te)
        raise AssistantException("Assistant run failed - Type Error") from te
    except Exception as e:
        print(e)
        raise AssistantException("Assistant run failed") from e
    finally:
        sio.emit(
            "status", {"status": "Cleaning up resources...", "progress": 70}, to=sid
        )
        # deleting the vector store
        vector_store_files = client.beta.vector_stores.files.list(
            vector_store_id=vector_store.id
        )
        file_ids = [file.id for file in vector_store_files.data]
        deleted_vector_store = client.beta.vector_stores.delete(
            vector_store_id=vector_store.id
        )
        if deleted_vector_store.deleted:
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

        client.beta.threads.delete(thread_id=thread_message.id)

    return tool_outputs
