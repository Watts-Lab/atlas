"""
Secondary language feature. This feature is responsible for indicating 
the secondary language used to communicate with the participants in the study.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Secondary language feature. This feature is responsible for
    indicating the secondary language used to communicate with the participants in the study.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "language_secondary"
        feature_type = "string"
        feature_prompt = (
            "What is the secondary language used to communicate with the participants in the study? "
            "If none, write NA."
        )
        feature_enum = None
        feature_description = "What is the secondary language used to communicate with the participants in the study? If none, write NA."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
