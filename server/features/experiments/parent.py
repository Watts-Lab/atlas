"""
Experiments feature module. 
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Experiments feature. This feature is responsible for indicating the experiments in the study.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "experiments"
        feature_type = "array"
        feature_prompt = "Array of experiments objects with detailed properties."
        feature_enum = None
        feature_description = "The experiments in a paper."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
