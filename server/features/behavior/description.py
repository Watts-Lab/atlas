"""
Describe the behavioral outcome in a few words. 

"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition description feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "description"
        feature_type = "string"
        feature_prompt = (
            "Describe the behavioral outcome in a few words (4 at most). "
            "Author's words: If the authors have a clear, short description of each behavior in the paper itself, copy their words here instead of paraphrasing.  "
            "If their description is not clear enough on its own, or is very verbose, please paraphrase here."
        )
        feature_enum = None
        super().__init__(
            feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
        )

    def display(self) -> None:
        """
        Display method for the Condition Name class.
        """
        print("features.behavior.description")

    def get_functional_object(self, prefix="condition") -> dict:
        return super().get_functional_object(prefix=prefix)
