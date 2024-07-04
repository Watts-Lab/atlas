"""
Condition name feature. This feature is responsible 
for returning the name of the conditions in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition name feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "name"
        feature_type = "string"
        feature_prompt = (
            "Give each condition a one or two word name to describe it. "
            "Author's words: Where possible, use the label the research authors give it. "
            "Look at tables/figures to see their naming conventions for the conditions and use those if they exist. "
            "**Make sure the FIRST (1) condition is considered the CONTROL. This should be the condition you indicate is the focal comparator, in the results tab."
        )
        feature_enum = None
        super().__init__(
            feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
        )

    def display(self) -> None:
        """
        Display method for the Condition Name class.
        """
        print("This is the Condition Name class.")

    def get_functional_object(self, prefix="condition") -> dict:
        return super().get_functional_object(prefix=prefix)
