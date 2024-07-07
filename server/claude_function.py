"""
Runs the Claude function call API.
"""

from typing import List


def get_all_features() -> List[str]:
    """
    Gets all the available features.

    Returns:
    - List of all available features.
    """

    experiments_features = [
        "features.experiments.experiment_name",
        "features.experiments.experiment_description",
        "features.experiments.participant_source",
        "features.experiments.participant_source_category",
        "features.experiments.units_randomized",
        "features.experiments.units_analyzed",
        "features.experiments.sample_size_randomized",
        "features.experiments.sample_size_analyzed",
        "features.experiments.sample_size_notes",
        "features.experiments.adults",
        "features.experiments.age_mean",
        "features.experiments.age_sd",
        "features.experiments.female_perc",
        "features.experiments.male_perc",
        "features.experiments.gender_other",
        "features.experiments.language",
        "features.experiments.language_secondary",
        "features.experiments.compensation",
        "features.experiments.demographics_conditions",
        "features.experiments.population_other",
        "features.experiments.condition.name",
        "features.experiments.condition.description",
        "features.experiments.condition.type",
        "features.experiments.condition.message",
        "features.experiments.condition.behavior.name",
        "features.experiments.condition.behavior.description",
        "features.experiments.condition.behavior.priority",
        "features.experiments.condition.behavior.focal",
    ]


experiments_function_call = {
    "name": "define_experiments_conditions_and_behaviors",
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
