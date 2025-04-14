"""
Functions to interact with the OpenAI API.
"""

import json
from datetime import datetime
import logging
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv
import socketio

from database.models.features import Features
from database.models.projects import Project
from workers.utils.socket_emitter import SocketEmmiter


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


def get_all_class_features(user_requested_features: List[str]) -> List[str]:
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

    # Check if all user requested features are within available experiments_features
    for feature in user_requested_features:
        if feature not in experiments_features:
            raise AssistantException(
                f"Feature '{feature}' is not a valid experiment feature."
            )

    sorted_features = sorted(user_requested_features, key=lambda s: s.count("."))

    return sorted_features


def get_all_features(project_id: str) -> List[str]:
    """
    Gets all the available features.

    Returns:
    - List of all available features.
    """

    current_project: Project = Project.get(project_id, fetch_links=True).run()

    feature_list = []
    user_features = {}

    for feature in current_project.features:
        user_features[feature.feature_identifier] = feature.feature_gpt_interface
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
                    schema = feature_class.feature_gpt_interface
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
        "name": "define_experiments_and_conditions_and_behaviors",
        "description": (
            "Define the conditions and behaviors in each experiment. Each condition and behavior "
            "should be a separate object with specified properties and values under the experiments object."
        ),
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": build_parent_objects(feature_list, feature_object),
            "additionalProperties": False,
            "required": ["paper"],
        },
    }

    return openai_function_object


def upload_file_to_vector_store(client: OpenAI, file_path: str) -> str:
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
    vector_store = client.vector_stores.create(
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
    try:
        my_updated_assistant = client.beta.assistants.update(
            assistant_id=assistant_id,
            tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}},
            tools=[
                {"type": "file_search"},
                {"type": "function", "function": function},
            ],
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


def create_temporary_assistant(client: OpenAI, gpt_temperature: float = 1.0):
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
        model="o3-mini",
        # temperature=gpt_temperature,
    )

    return my_temporary_assistant


def emit_status(
    sio: socketio.RedisManager, status: str, progress: int, task_id: str, sid: str
):
    """
    Emits a status message to the client.

    Args:
    - sio: The socketio server.
    - status: The status message to send.
    - progress: The progress percentage.
    - task_id: The task ID.
    """

    sio.emit(
        "status",
        {
            "status": status,
            "progress": progress,
            "task_id": task_id,
            "done": False,
        },
        to=sid,
        namespace="/home",
    )


def call_asssistant_api(
    file_path: str, project_id: str, gpt_temperature: float, emitter: SocketEmmiter
):
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
        emitter.emit_status(
            message="Starting task...",
            progress=0,
        )

        feature_list, feature_obj = get_all_features(project_id)

        emitter.emit_status(
            message="Building feature functions...",
            progress=5,
        )

        functions = build_openai_feature_functions(feature_list, feature_obj)

        emitter.emit_status(
            message="Uploading file to vector store...",
            progress=10,
        )

        vector_store = upload_file_to_vector_store(
            client=client,
            file_path=file_path,
        )

        emitter.emit_status(
            message="Creating assistant...",
            progress=15,
        )

        my_temporary_assistant = create_temporary_assistant(client, gpt_temperature)

        updated_assistant = update_assistant(
            client, my_temporary_assistant.id, vector_store, functions
        )

        emitter.emit_status(
            message="Running assistant...",
            progress=20,
        )

        thread_message = client.beta.threads.create(
            messages=[
                {
                    "role": "user",
                    "content": "Please define the experiments, conditions and behaviors in the paper.",
                }
            ],
        )

        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread_message.id,
            assistant_id=updated_assistant.id,
        )

        emitter.emit_status(
            message="Assistant run completed.",
            progress=60,
        )

        with open("logfile.log", "w", encoding="utf-8") as log_file:
            log_file.write(f"RUN RESULTS: {run.to_json()}\n")

        tool_outputs = json.loads(
            run.required_action.submit_tool_outputs.tool_calls[0].function.arguments
        )

        check_output_format(tool_outputs)

    except json.JSONDecodeError as je:
        logger.error("JSON Decode Error: %s", je)
        raise AssistantException("Assistant run failed - JSON Decode Error") from je
    except TypeError as te:
        logger.error("Type Error: %s", te)
        raise AssistantException("Assistant run failed - Type Error") from te
    except Exception as e:
        logger.error("General Error: %s", e)
        raise AssistantException(run.to_json()) from e
    finally:
        emitter.emit_status(
            message="Cleaning up resources...",
            progress=70,
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
            logger.info("Vector store deleted successfully")
        else:
            logger.error("Vector store deletion failed")

        # deleting the file
        for file_id in file_ids:
            deleted_file = client.files.delete(file_id)
            if deleted_file.deleted is True:
                logger.info("File deleted successfully")
            else:
                logger.error("File deletion failed")

        client.beta.threads.delete(thread_id=thread_message.id)

        client.beta.assistants.delete(my_temporary_assistant.id)

    return {
        "result": tool_outputs,
        "prompt_token": 5419,
        "completion_token": 91,
    }
