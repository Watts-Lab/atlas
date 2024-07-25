"""
Age mean feature. This feature is responsible for indicating
the average age of participants in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Age mean feature. This feature is responsible for indicating
    the average age of participants in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "max_age"
        feature_type = "number"
        feature_prompt = (
            "What is the maximum age of participants? "
            "Provide the maximum age. If the maximum age is not mentioned, leave NA."
        )
        feature_enum = None
        feature_description = (
            "What is the maximum age of participants? If not mentioned, leave NA."
        )
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
