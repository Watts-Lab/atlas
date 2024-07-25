"""
Functions to interact with the OpenAI API.
"""

import json
import importlib
from datetime import datetime
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv
from sanic.request.form import File
import socketio

load_dotenv()


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


def build_parent_objects(features: List[str]) -> dict:
    """
    Builds the parent objects for the given features.
    """
    nested_dict = {}

    for feature in features:
        keys = feature.split(".")
        current_dict = nested_dict

        for key in keys[:-1]:
            if key not in current_dict:
                feature_module = importlib.import_module(
                    f"features.{feature.rsplit('.', 1)[0]}.parent"
                )
                feature_class = feature_module.Feature()
                current_dict[key] = feature_class.get_functional_object_parent_claude()
            current_dict = current_dict[key]["items"]["properties"]

        feature_module = importlib.import_module(f"features.{feature}")
        feature_class = feature_module.Feature()
        current_dict[keys[-1]] = feature_class.get_functional_object_claude()

    # add in the required keys
    for feature in features:
        keys = feature.split(".")
        current_dict = nested_dict
        for key in keys[:-1]:
            if key in current_dict:
                current_dict = current_dict[key]["items"]
            else:
                if key not in current_dict["required"]:
                    current_dict["required"].append(key)
                current_dict = current_dict["properties"][key]["items"]

        current_dict["required"].append(keys[-1])

    return nested_dict


def build_openai_feature_functions(feature_list: List[str]) -> dict:
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
        "name": "define_experiments_and_conditions_and_behaviors",
        "description": (
            "Define the conditions and behaviors in each experiment. Each condition and behavior "
            "should be a separate object with specified properties and values under the experiments object."
        ),
        "parameters": {
            "type": "object",
            "properties": build_parent_objects(feature_list),
            "required": ["experiments"],
        },
    }

    return openai_function_object


def upload_file_to_vector_store(client: OpenAI, file: File, sid: str) -> str:
    """
    Uploads a file to the vector store.

    Args:
    - file_path: Path to the file to upload.

    Returns:
    - URL to the uploaded file.
    """

    file_path = f"paper/{sid}{file.name}"

    with open(file_path, "wb") as f:
        f.write(file.body)
    f.close()

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
    client: OpenAI,
    assistant_id: str,
    vector_store,
    function: Dict,
):
    """
    Updates the assistant with the new function.

    Args:
    - assistant_id: ID of the assistant to update.
    - function: List of dictionaries containing the feature function.
    """

    my_updated_assistant = client.beta.assistants.update(
        assistant_id=assistant_id,
        tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}},
        tools=[
            {"type": "file_search"},
            {"type": "function", "function": function},
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
    if isinstance(output, dict) and "experiments" in output:
        return True
    else:
        raise AssistantException("Output format is incorrect")


def create_temporary_assistant(client: OpenAI):
    """
    Creates a temporary assistant with the given functions.

    Args:
        - client: OpenAI client object.

    Returns:
        - The created assistant.
    """

    my_temporary_assistant = client.beta.assistants.create(
        instructions=(
            "You are a research assistnant for a team of scientists. "
            "You are tasked with summarizing the key findings of a scientific paper. "
            "You are given a PDF of the paper and are asked to provide a summary of the key findings. Your response should be in JSON format."
        ),
        name="Atlas explorer",
        model="gpt-4o",
        temperature=1,
    )

    return my_temporary_assistant


async def call_asssistant_api(file: File, sid: str, sio: socketio.AsyncServer):
    """
    Calls the Assistant API to perform a task using OpenAI's GPT-3 model.

    Args:
        file (File): The file to be uploaded to the vector store.
        sid (str): The session ID.
        sio (socketio.AsyncServer): The socketio server.

    Returns:
        dict: The tool outputs generated by the Assistant API.
    """

    client = OpenAI()

    try:
        await sio.emit(
            "status",
            {"status": "Fetching all features...", "progress": 0},
            to=sid,
            namespace="/home",
        )
        feature_list = get_all_features()

        await sio.emit(
            "status",
            {"status": "Building feature functions...", "progress": 5},
            to=sid,
            namespace="/home",
        )
        functions = build_openai_feature_functions(feature_list)

        await sio.emit(
            "status",
            {"status": "Uploading file to vector store...", "progress": 10},
            to=sid,
            namespace="/home",
        )
        vector_store = upload_file_to_vector_store(client=client, file=file, sid=sid)

        await sio.emit(
            "status",
            {"status": "Creating an assistant for your task...", "progress": 12},
            to=sid,
            namespace="/home",
        )
        my_temporary_assistant = create_temporary_assistant(client)

        await sio.emit(
            "status",
            {"status": "Updating assistant...", "progress": 15},
            to=sid,
            namespace="/home",
        )
        updated_assistant = update_assistant(
            client, my_temporary_assistant.id, vector_store, functions
        )

        await sio.emit(
            "status",
            {"status": "Creating thread message...", "progress": 30},
            to=sid,
            namespace="/home",
        )
        thread_message = client.beta.threads.create(
            messages=[
                {
                    "role": "user",
                    "content": "run function define_experiments_conditions_and_behaviors",
                }
            ],
        )

        await sio.emit(
            "status",
            {"status": "Running assistant...", "progress": 40},
            to=sid,
            namespace="/home",
        )

        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread_message.id,
            assistant_id=updated_assistant.id,
        )

        await sio.emit(
            "status",
            {"status": "Getting tool outputs...", "progress": 50},
            to=sid,
            namespace="/home",
        )

        tool_outputs = json.loads(
            run.required_action.submit_tool_outputs.tool_calls[0].function.arguments
        )

        await sio.emit(
            "status",
            {"status": "Checking output format...", "progress": 60},
            to=sid,
            namespace="/home",
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
        await sio.emit(
            "status",
            {"status": "Cleaning up resources...", "progress": 70},
            to=sid,
            namespace="/home",
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
            if deleted_file.deleted is True:
                print("File deleted successfully")
            else:
                print("File deletion failed")

        client.beta.threads.delete(thread_id=thread_message.id)

        client.beta.assistants.delete(my_temporary_assistant.id)

    return tool_outputs
