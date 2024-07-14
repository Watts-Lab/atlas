"""
Age standard deviation feature. This feature is responsible 
for indicating the standard deviation of the age of participants in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Age standard deviation feature. This feature is responsible for
    indicating the standard deviation of the age of participants in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "age_sd"
        feature_type = "number"
        feature_prompt = (
            "What is the standard deviation of the age of participants? "
            "Provide the standard deviation of the age. If not mentioned, leave NA."
        )
        feature_enum = None
        feature_description = "What is the standard deviation of the age of participants? If not mentioned, leave NA."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
