"""
Functions to interact with the OpenAI API.
"""

import json
import importlib
from datetime import datetime
from typing import Dict, List, Union
from openai import OpenAI
from dotenv import load_dotenv

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


def get_all_features() -> tuple[List[str], List[str]]:
    """
    Gets all the available features.

    Returns:
    - List of all available features.
    """

    # experiments_features = [
    #     "features.experiments.name",
    #     "features.experiments.description",
    #     "features.experiments.source",
    #     "features.experiments.source_category",
    #     "features.experiments.units_randomized",
    #     "features.experiments.units_analyzed",
    #     "features.experiments.sample_size_randomized",
    #     "features.experiments.sample_size_analyzed",
    #     "features.experiments.sample_size_notes",
    #     "features.experiments.adults",
    #     "features.experiments.age_mean",
    #     "features.experiments.age_sd",
    # ]

    return (
        [
            "features.experiments.conditions.name",
            "features.experiments.conditions.description",
            "features.experiments.conditions.type",
            "features.experiments.conditions.message",
        ],
        [
            "features.experiments.conditions.behaviors.name",
            "features.experiments.conditions.behaviors.description",
            "features.experiments.conditions.behaviors.priority",
            "features.experiments.conditions.behaviors.focal",
        ],
    )


def build_feature_functions(
    feature_list: tuple[List[str], List[str]]
) -> List[Dict[str, Union[int, str]]]:
    """
    Builds a list of dictionaries containing the feature functions.

    Args:
    - feature_list: List of feature functions.

    Returns:
    - List of dictionaries containing the feature functions.
    """

    experiments_function_call = {
        "name": "define_experiments_and_conditions_and_behaviors",
        "description": "Define the conditions and behaviors in each experiment. Each condition and behavior should be a separate object with specified properties and values under the experiments object.",
        "parameters": {
            "type": "object",
            "properties": {
                "experiments": {
                    "type": "array",
                    "description": "Array of experiments objects with detailed properties.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Name of the experiment.",
                            },
                            "description": {
                                "type": "string",
                                "description": "Description of the experiment.",
                            },
                            "participant_source": {
                                "type": "string",
                                "description": "Where do participants come from? mTurk, Prolific, students, retail workers, etc. Try to use just a few words to describe this. If it is an online panel, please write the name of the source: mTurk, Prolific, etc.",
                            },
                            "participant_source_category": {
                                "type": "string",
                                "description": "Where do participants come from? Pick one from this list.",
                                "enum": [
                                    "online panel",
                                    "university students",
                                    "high school or younger students",
                                    "executive students",
                                    "customers",
                                    "employees",
                                    "public or community",
                                    "other",
                                ],
                            },
                            "units_randomized": {
                                "type": "string",
                                "description": "What was randomized in the experiment? This might be individuals, teams, groups, schools, etc.",
                            },
                            "units_analyzed": {
                                "type": "string",
                                "description": "What was analyzed in the experiment? This may be the same as what was randomized (often, individual participants) but it may be a lower-level unit. For instance, restaurants may be the unit of randomization but orders placed might be the unit of analysis. Or schools may be the unit of randomization but students might be the unit of analysis.",
                            },
                            "sample_size_randomized": {
                                "type": "number",
                                "description": "What is the total sample size, at the unit of what was randomized?",
                            },
                            "sample_size_analyzed": {
                                "type": "number",
                                "description": "What is the total sample size, at the unit of what was analyzed? This should be after any exclusions, if any are mentioned. If the unit of randomization = the unit of analysis, this will often be the same number as above. If exclusions were made before analysis, this may be smaller.",
                            },
                            "sample_size_notes": {
                                "type": "string",
                                "description": "If anything was confusing or complicated about the sample size, please explain here. Otherwise, write 'NA'.",
                            },
                            "adults": {
                                "type": "string",
                                "description": "Is the target population adults (18 years old or older), children (<18 years old), or both?",
                                "enum": ["adults", "children", "both"],
                            },
                            "age_mean": {
                                "type": "number",
                                "description": "What is the average age of participants? If not mentioned, leave '--'.",
                            },
                            "age_sd": {
                                "type": "number",
                                "description": "What is the standard deviation of the age of participants? If not mentioned, leave '--'.",
                            },
                            "female_perc": {
                                "type": "number",
                                "description": "What is the percentage of participants identified as female? give a number between 0 and 1, If not mentioned, leave '--'.",
                            },
                            "male_perc": {
                                "type": "number",
                                "description": "What is the percentage of participants identified as male? give a number between 0 and 1, If not mentioned, leave '--'.",
                            },
                            "gender_other": {
                                "type": "number",
                                "description": "What is the percentage of participants identified as neither female nor male? give a number between 0 and 1, If not mentioned, leave '--'.",
                            },
                            "language": {
                                "type": "string",
                                "description": "What is the primary language used to communicate with the participants in the study, in particular in the stimuli or interventions? If unclear, please explain. (Note if there is any communication as part of the intervention, there should be a primary language listed.)",
                            },
                            "language_secondary": {
                                "type": "string",
                                "description": "What is the secondary language used to communicate with the participants in the study? If none, write NA.",
                            },
                            "compensation": {
                                "type": "string",
                                "description": "Were the participants compensated at all? Often, online participants are paid for their time. Sometimes bonuses or lotteries are used as well. If they were compensated, please describe the compensation.",
                            },
                            "demographics_conditions": {
                                "type": "string",
                                "description": "Does the study provide enough information to capture the age, gender, and/or ethnicity of participants by condition? (This is in contrast to overall, which is captured above.) For example, it might have a table of these demographic features by condition. Note this is not just about the paper providing inferential statistics to show balance across conditions; it is about showing proportions or means and standard deviations by condition.",
                                "enum": ["Y", "N"],
                            },
                            "population_other": {
                                "type": "string",
                                "description": "Anything else to mention about the participant population? Include any key attributes that are measured but not listed above, especially any that the researchers seem to indicate are important to describe the population.",
                            },
                            "conditions": {},
                        },
                    },
                },
            },
            "required": [
                "experiments",
            ],
        },
    }
    function_call = {
        "type": "array",
        "description": "Array of condition objects with detailed properties.",
        "items": {
            "type": "object",
            "properties": {},
        },
    }

    for feature in feature_list[0]:
        feature_module = importlib.import_module(feature)
        feature_class = feature_module.Feature()
        function_call["items"]["properties"] = {
            **function_call["items"]["properties"],
            **feature_class.get_functional_object_gpt(prefix=""),
        }

    function_call["items"]["properties"]["behaviors"] = {
        "type": "array",
        "description": "Array of behaviors objects with detailed properties.",
        "items": {
            "type": "object",
            "properties": {},
        },
    }

    for feature in feature_list[1]:
        feature_module = importlib.import_module(feature)
        feature_class = feature_module.Feature()

        function_call["items"]["properties"]["behaviors"]["items"]["properties"] = {
            **function_call["items"]["properties"]["behaviors"]["items"]["properties"],
            **feature_class.get_functional_object_gpt(prefix=""),
        }

    experiments_function_call["parameters"]["properties"]["experiments"]["items"][
        "properties"
    ]["conditions"] = function_call

    return experiments_function_call


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
    functions: List[Dict[str, Union[int, str]]],
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


def call_asssistant_api(file_path: str, sid: str, sio):
    """
    Calls the assistant API to run the assistant.

    Args:
    - file_path: Path to the file to upload.
    - sid: Session ID.
    - sio: Socket IO object.

    Returns:
    - The output of the assistant.
    """

    client = OpenAI()

    try:
        sio.emit(
            "status",
            {"status": "Fetching all features...", "progress": 0},
            to=sid,
            namespace="/home",
        )
        feature_list = get_all_features()

        sio.emit(
            "status",
            {"status": "Building feature functions...", "progress": 5},
            to=sid,
            namespace="/home",
        )
        functions = build_feature_functions(feature_list)

        sio.emit(
            "status",
            {"status": "Uploading file to vector store...", "progress": 10},
            to=sid,
            namespace="/home",
        )
        vector_store = upload_file_to_vector_store(client, file_path)

        sio.emit(
            "status",
            {"status": "Creating an assistant for your task...", "progress": 12},
            to=sid,
            namespace="/home",
        )
        my_temporary_assistant = create_temporary_assistant(client)

        sio.emit(
            "status",
            {"status": "Updating assistant...", "progress": 15},
            to=sid,
            namespace="/home",
        )
        updated_assistant = update_assistant(
            client, my_temporary_assistant.id, vector_store, functions
        )

        sio.emit(
            "status",
            {"status": "Creating thread message...", "progress": 30},
            to=sid,
            namespace="/home",
        )
        thread_message = client.beta.threads.create(
            messages=[
                {
                    "role": "user",
                    "content": "define_experiments_and_conditions_and_behaviors",
                }
            ],
        )

        sio.emit(
            "status",
            {"status": "Running assistant...", "progress": 40},
            to=sid,
            namespace="/home",
        )

        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread_message.id, assistant_id=updated_assistant.id
        )

        sio.emit(
            "status",
            {"status": "Getting tool outputs...", "progress": 50},
            to=sid,
            namespace="/home",
        )

        tool_outputs = json.loads(
            run.required_action.submit_tool_outputs.tool_calls[0].function.arguments
        )

        sio.emit(
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
        sio.emit(
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


if __name__ == "__main__":
    s = build_feature_functions(get_all_features())
    print(json.dumps(s))
