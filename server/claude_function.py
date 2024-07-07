"""
Runs the Claude function call API.
"""

import importlib
import json
from typing import List
from dotenv import load_dotenv
from pypdf import PdfReader
import anthropic

from gpt_assistant import AssistantException

load_dotenv()

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
                feature_module = importlib.import_module(f"features.{feature.rsplit(".", 1)[0]}.parent")
                feature_class = feature_module.Feature()
                current_dict[key] = feature_class.get_functional_object_parent_claude()
            current_dict = current_dict[key]['items']['properties']

        feature_module = importlib.import_module(f"features.{feature}")
        feature_class = feature_module.Feature()
        current_dict[keys[-1]] = feature_class.get_functional_object_claude()


    # add in the required keys
    for feature in features:
        keys = feature.split(".")
        current_dict = nested_dict
        for key in keys[:-1]:
            if key in current_dict:
                current_dict = current_dict[key]['items']
            else:
                if key not in current_dict['required']:
                    current_dict['required'].append(key)
                current_dict = current_dict['properties'][key]['items']

        current_dict['required'].append(keys[-1])


    return nested_dict


def build_claude_feature_functions(feature_list: List[str]) -> dict:
    """
    Builds and returns a Claude function object.

    Args:
        feature_list (List[str]): A list of features.

    Returns:
        dict: The Claude function object.

    Raises:
        None
    """
    
    claude_function_object = {
        "name": "define_experiments_and_conditions_and_behaviors",
        "description": (
            "Defines the experiments with their conditions and behaviors and each of their properties in each experiment. "
        ),
        "input_schema": {
            "type": "object",
            "properties": build_parent_objects(feature_list),
            "required": ["experiments"],
        },
    }

    return claude_function_object



def build_openai_feature_functions(feature_list: List[str]) -> dict:
    """
    Builds and returns a Claude function object.

    Args:
        feature_list (List[str]): A list of features.

    Returns:
        dict: The Claude function object.

    Raises:
        None
    """
    
    openai_function_call = {
        "type": "function",
        "function": {
            "name": "define_experiments_and_conditions_and_behaviors",
            "description": "Defines the experiments with their conditions and behaviors and each of their properties in each experiment.",
            "parameters": {
                "type": "object",
                "properties": build_parent_objects(feature_list),
                "required": ["experiments"],
            },
        },
    }
    
    return openai_function_call


def convert_pdf_to_text(file_path: str) -> str:
    """
    Converts the PDF file to text.

    Args:
    - file_path: The path to the file.

    Returns:
    - The text extracted from the PDF.
    """

    reader = PdfReader(file_path)
    text = ''.join(page.extract_text() for page in reader.pages)
    return text


def call_claude_api(file_path: str, sid: str, sio) -> dict:
    """
    Calls the Claude API.

    Args:
    - file_path: The path to the file.
    - sid: The session ID.
    - socketio: The socketio object.

    Returns:
    - The result from the API.
    """

    client = anthropic.Anthropic()

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
            {"status": "Building feature functions...", "progress": 10},
            to=sid,
            namespace="/home",
        )
        claude_function = build_claude_feature_functions(feature_list)

        sio.emit(
            "status",
            {"status": "Converting pdf to text...", "progress": 30},
            to=sid,
            namespace="/home",
        )

        file_text = convert_pdf_to_text(file_path)
        # full_text, images, out_meta = convert_single_pdf(file_path, models, langs=["English"])
        # fname = os.path.basename(file_path)
        # subfolder_path = save_markdown("paper/output", fname, full_text, images, out_meta)
        # paper = ""
        # paper += open(f"{subfolder_path}/{fname.replace(".pdf", ".md")}", "r").read()

        sio.emit(
            "status",
            {"status": "Running assistant...", "progress": 40},
            to=sid,
            namespace="/home",
        )

        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=4000,
            temperature=0,
            system="You are an assitant helping with exploring scientific papers.",
            tools=[claude_function],
            messages=[{
                "role": 'user', "content":  file_text
            }],
            tool_choice = {"type": "tool", "name": "define_experiments_and_conditions_and_behaviors"},
        )


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

    return message.content[0].input
