"""
    Module providing a function printing python version.
"""


class GPTFeature:
    """This class represents a feature."""

    def __init__(
        self, feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
    ):
        print("Feature initialized.", args, kwargs)
        self.feature_name = feature_name
        self.feature_type = feature_type
        self.feature_prompt = feature_prompt
        self.feature_enum = feature_enum if feature_enum is not None else []

    def display(self):
        """Displays a message indicating that this is the GPT Feature class."""
        print("This is the GPT Feature class.")

    def get_json_object(self):
        """Returns a JSON object representing the feature."""
        return {
            "feature_name": self.feature_name,
            "feature_type": self.feature_type,
            "feature_prompt": self.feature_prompt,
            "feature_enum": self.feature_enum,
        }

    def get_functional_object(self):
        """Returns a functional object representing the feature."""
        return {
            "feature_name": self.feature_name,
            "feature_type": self.feature_type,
            "feature_prompt": self.feature_prompt,
            "feature_enum": self.feature_enum,
        }

    def __str__(self) -> str:
        return f"Feature {self.feature_name}"
