"""
Language feature. This feature is responsible for indicating 
the primary language used to communicate with the participants in the study.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Language feature. This feature is responsible for
    indicating the primary language used to communicate with the participants in the study.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "language"
        feature_type = "string"
        feature_prompt = (
            "What is the primary language used to communicate with the participants in the study, "
            "especially in the stimuli or interventions? "
            "If unclear, please explain."
            "Note: If there is any communication as part of the intervention, there should be a primary language listed."
        )
        feature_enum = None
        feature_description = "What is the primary language used to communicate with the participants in the study, in particular in the stimuli or interventions? If unclear, please explain. (Note if there is any communication as part of the intervention, there should be a primary language listed.)"
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
