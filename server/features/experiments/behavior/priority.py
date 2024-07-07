"""
This file contains the class for the Behavior priority feature.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Behavior priority feature. This feature is responsible for
    """

    def __init__(self, *args, **kwargs):
        feature_name = "priority"
        feature_type = "string"
        feature_prompt = (
            "Is the behavioral outcome labeled as primary, secondary, or given no label by the authors? "
            "If there is no label, but there is only one or a handful of behaviors, typically these are considered primary.  "
            "(By definition of our inclusion criteria, it should not be labeled exploratory.)"
        )
        feature_enum = [
            "primary",
            "secondary",
            "none",
        ]
        feature_description = "The priority of the behavior. meaning whether it is primary, secondary, or not labeled by the authors."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
