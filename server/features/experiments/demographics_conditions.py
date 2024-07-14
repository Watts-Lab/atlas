"""
Demographics by conditions feature. This feature is responsible for indicating 
whether the study provides enough information to capture the age, gender, and/or ethnicity of participants by condition.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Demographics by conditions feature. This feature is responsible for
    indicating whether the study provides enough information to capture the age, gender, and/or ethnicity of participants by condition.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "demographics_conditions"
        feature_type = "string"
        feature_prompt = (
            "Does the study provide enough information to capture the age, gender, and/or ethnicity of participants by condition? "
            "This is in contrast to overall, which is captured above. For example, it might have a table of these demographic features by condition. "
            "Note: this is not just about the paper providing inferential statistics to show balance across conditions; "
            "it is about showing proportions or means and standard deviations by condition."
        )
        feature_enum = ["Yes", "No"]
        feature_description = "Does the study provide enough information to capture the age, gender, and/or ethnicity of participants by condition? (This is in contrast to overall, which is captured above.) For example, it might have a table of these demographic features by condition. Note this is not just about the paper providing inferential statistics to show balance across conditions; it is about showing proportions or means and standard deviations by condition."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
