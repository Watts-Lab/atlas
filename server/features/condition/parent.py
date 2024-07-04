"""
Condition type feature. This feature is responsible 
for returning the name of the conditions in the experiment.
"""

from ..gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition type feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "conditions"
        feature_type = "object"
        feature_prompt = (
            "Define the conditions in the experiment.  "
            "Each condition should be a separate object with the following properties. "  # This could be moved to where aggregation is done
            "Put each condition in a JSON object and answer the questions below for each condition."  # This could be moved to where aggregation is done
        )
        feature_enum = None
        super().__init__(
            feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
        )

    def display(self) -> None:
        """
        Display method for the Condition type class.
        """
        print("features.conditions")

    def get_functional_object(self, prefix="") -> dict:
        return super().get_functional_object(prefix=prefix)
