"""
This file contains the Behavior focal feature class.
"""

from ..gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Behavior focal feature. This feature is responsible for returning the focal behavior in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "focal"
        feature_type = "string"
        feature_prompt = (
            "Select the ONE behavior that is focal for the authors. It should be a primary outcome. "
            "if you're not sure, read the abstract and discussion of the paper. Which variable to the authors highlight most? "
            "If that is still unclear, which variable is closest to the real world action that the authors care about?"
        )
        feature_enum = [
            "focal",
            "not focal",
        ]
        super().__init__(
            feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
        )

    def display(self) -> None:
        """
        Display method for the Behavior type class.
        """
        print("features.behavior.focal")

    def get_functional_object(self, prefix="condition") -> dict:
        return super().get_functional_object(prefix=prefix)
