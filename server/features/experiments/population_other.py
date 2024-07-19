"""
Population other feature. This feature is responsible for indicating 
any additional attributes about the participant population.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Population other feature. This feature is responsible for
    indicating any additional attributes about the participant population.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "population_other"
        feature_type = "string"
        feature_prompt = (
            "Is there anything else to mention about the participant population? "
            "Include any key attributes that are measured but not listed above, especially any that the researchers seem to indicate are important to describe the population."
        )
        feature_enum = None
        feature_description = "Anything else to mention about the participant population? Include any key attributes that are measured but not listed above, especially any that the researchers seem to indicate are important to describe the population."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
