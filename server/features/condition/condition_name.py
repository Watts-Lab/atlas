"""
Condition name feature. This feature is responsible for returning the name of the conditions in the experiment.
"""

from server.features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition name feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        print("Condition Name Feature initialized.", args, kwargs)

    def display(self) -> None:
        """
        Display method for the Condition Name class.
        """
        print("This is the Condition Name class.")
