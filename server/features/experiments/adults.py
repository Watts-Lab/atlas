"""
Adults feature. This feature is responsible for indicating
the target population's age group in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Adults feature. This feature is responsible for indicating
    the target population's age group in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "adults"
        feature_type = "string"
        feature_prompt = (
            "Is the target population adults (18 years old or older), children (<18 years old), or both? "
            "Select one from the following options: adults, children, both."
        )
        feature_enum = ["adults", "children", "both"]
        feature_description = "Is the target population adults (18 years old or older), children (<18 years old), or both?"
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
