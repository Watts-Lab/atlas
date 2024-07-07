"""
Runs the Claude function call API.
"""

import importlib
import json
from typing import List
from dotenv import load_dotenv
import anthropic

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


if __name__ == "__main__":
    f = get_all_features()
    claude_function_object = {
        "name": "define_experiments_and_conditions_and_behaviors",
        "description": (
            "Defines the experiments with their conditions and behaviors in each experiment. "
            "Each condition and behavior should be a separate object with specified properties and values under the experiments object."
        ),
        "input_schema": {
            "type": "object",
            "properties": build_parent_objects(f),
            "required": ["experiments"],
        },
    }

    client = anthropic.Anthropic()

    i_paper = ""
    i_paper += open(f"server/paper/A_24a_2022_EffectsOfDigital.md", "r").read()

    message = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=4000,
        temperature=0,
        system="You are an assitant helping with exploring scientific papers.",
        tools=[claude_function_object],
        messages=[{
            "role": 'user', "content":  i_paper
        }],
        tool_choice = {"type": "tool", "name": "define_experiments_and_conditions_and_behaviors"},
    )

    r = message.content[0].input

    print(json.dumps(r, indent=4))
