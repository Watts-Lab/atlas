"""
Behavior class.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Behavior class.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "behaviors"
        feature_type = "array"
        feature_prompt = "Array of behaviors objects with detailed properties."
        feature_enum = None
        feature_description = "The behaviors in the experiment."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
