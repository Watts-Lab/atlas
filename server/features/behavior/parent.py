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
        feature_type = "object"
        feature_prompt = (
            "Define the behaviors in the experiment.  "
            "Each behavior should be a separate object with the following properties. "  # This could be moved to where aggregation is done
            "Put each behavior in a JSON object and answer the questions below for each behavior."  # This could be moved to where aggregation is done
        )
        feature_enum = None
        super().__init__(
            feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
        )

    def display(self) -> None:
        """
        Display method for the Condition type class.
        """
        print("features.behavior.")

    def get_functional_object(self, prefix="") -> dict:
        return super().get_functional_object(prefix=prefix)
