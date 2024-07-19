"""
Male percentage feature. This feature is responsible for indicating 
the percentage of participants identified as male.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Male percentage feature. This feature is responsible for
    indicating the percentage of participants identified as male.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "male_perc"
        feature_type = "number"
        feature_prompt = (
            "What is the percentage of participants identified as male? "
            "Provide a number between 0 and 1. If not mentioned, leave NA."
        )
        feature_enum = None
        feature_description = "What is the percentage of participants identified as male? give a number between 0 and 1, If not mentioned, leave NA."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
