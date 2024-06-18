"""
This file contains the class for the Behavior priority feature.
"""

from ..gpt_feature import GPTFeature


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
        super().__init__(
            feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
        )
        print("Behavior priority Feature initialized.", args, kwargs)

    def display(self) -> None:
        """
        Display method for the Behavior type class.
        """
        print("This is the Behavior priority class.")

    def get_functional_object(self, prefix="condition") -> dict:
        return super().get_functional_object(prefix=prefix)
