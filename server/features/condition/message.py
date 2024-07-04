"""
Condition message feature. This feature is responsible 
for returning the name of the conditions in the experiment.
"""

from ..gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition message feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "message"
        feature_type = "string"
        feature_prompt = (
            "Does the condition contain a major messaging component? "
            '"Yes" indicates that a big part of the condition is about changing language and / or visuals, '
            "rather than exclusively about structuring a process, digital, or physical environment or changing incentives."
            "If it is a do-nothing intervention, select do-nothing.  "
        )
        feature_enum = ["Yes", "No", "Do-nothing"]
        super().__init__(
            feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
        )

    def display(self) -> None:
        """
        Display method for the Condition message class.
        """
        print("features.condition.message")

    def get_functional_object(self, prefix="condition") -> dict:
        return super().get_functional_object(prefix=prefix)
