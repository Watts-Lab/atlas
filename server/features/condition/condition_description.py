"""
Condition description feature. This feature is responsible for returning the description of the conditions in the experiment.
"""


class Feature:
    """
    This class represents a feature.
    """

    def __init__(self, *args, **kwargs):
        print("Feature initialized.", args, kwargs)

    def display(self):
        print("This is the Condition Description class.")
