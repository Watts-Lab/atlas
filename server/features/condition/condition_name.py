"""
Condition name feature. This feature is responsible for returning the name of the conditions in the experiment.
"""

from ..gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition name feature. This feature is responsible for returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        print("Condition Name Feature initialized.", args, kwargs)

    def display(self):
        print("This is the Condition Name class.")
