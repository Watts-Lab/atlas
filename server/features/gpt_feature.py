"""
    Module providing a function printing python version.
"""


class GPTFeature:
    """This class represents a feature."""

    def __init__(
        self, feature_name, feature_type, feature_prompt, feature_enum, *args, **kwargs
    ):
        self.feature_name = feature_name
        self.feature_type = feature_type
        self.feature_prompt = feature_prompt
        self.feature_enum = feature_enum if feature_enum is not None else []
        self.feature_description = kwargs.get("feature_description", "")

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
            "feature_description": self.feature_description,
        }

    def get_functional_object_gpt(self, prefix=""):
        """Returns a functional object representing the feature."""

        feature_name = prefix + self.feature_name

        res = {
            feature_name: {
                "type": self.feature_type,
                "description": self.feature_prompt,
            },
        }

        if self.feature_enum:
            res[feature_name]["enum"] = self.feature_enum

        return res

    def get_functional_object_claude(self, prefix=""):
        """Returns a functional object representing the feature."""

        res = {
            "type": self.feature_type,
            "description": self.feature_prompt,
        }

        if self.feature_enum:
            res["enum"] = self.feature_enum

        return res

    def get_functional_object_parent_claude(self):
        """Returns a functional object representing the feature as a parent."""

        res = {
            "type": self.feature_type,
            "description": self.feature_prompt,
            "items": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        }

        if self.feature_enum:
            res["enum"] = self.feature_enum

        return res

    def __str__(self) -> str:
        return f"Feature {self.feature_name}"
