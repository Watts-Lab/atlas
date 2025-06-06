"""
GPTInterface schema for defining the structure of prompts and responses
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator


class GPTInterface(BaseModel):
    """
    Represents a schema for interfacing with GPT-based LLMs, supporting basic types, enums, and nested array structures.

    Attributes:
        type (Literal["string", "number", "boolean", "array"]): The data type expected by the LLM.
        description (str): Prompt text or description for the LLM input.
        enum (Optional[List[str]]): List of allowed values if the type is an enum (typically for "string" types).
        items (Optional[GPTInterface]): Schema definition for items if the type is "array", allowing for recursive/nested structures.

    Config:
        - Allows arbitrary types for recursive references.
        - Provides schema examples for string, enum, and array/object types.
    """

    type: Literal["string", "number", "array", "integer"]
    description: str = Field(..., description="Prompt text for the LLM")
    # only used for enums
    enum: Optional[List[str]] = None
    # only used for array (parent containers)
    items: Optional[dict] = None

    model_config = {
        "stripped_none": True,
        "json_schema_extra": {
            "example_string": {"type": "string", "description": "The paper title."},
            "example_enum": {
                "type": "string",
                "description": "Did participants opt in? Answer Yes or No.",
                "enum": ["Yes", "No"],
            },
            "example_parent": {
                "type": "array",
                "description": "Array of experiment objects.",
                "items": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
        },
    }

    def parent_dump(self) -> dict:
        """
        Convert the GPTInterface to a dictionary suitable for parent features.
        This is used to build the JSON schema for parent features.
        """
        return {
            "type": self.type,
            "description": self.description,
            "items": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        }


GPTInterface.model_rebuild()


class FeatureCreate(BaseModel):
    """
    Feature creation schema for checking input
    """

    feature_name: str
    feature_identifier: str
    feature_parent: Optional[str] = ""
    feature_description: Optional[str] = ""
    feature_type: Literal["text", "number", "boolean", "enum", "parent"]
    feature_prompt: str
    enum_options: Optional[List[str]] = None

    @model_validator(mode="before")
    def check_enum_options(cls, values):  # pylint: disable=no-self-argument
        """
        Validate that enum_options is a non-empty list when feature_type is 'enum'.
        """
        t = values.get("feature_type")
        opts = values.get("enum_options") or []
        if t == "enum" and len([o for o in opts if o.strip()]) == 0:
            raise ValueError(
                "enum_options must be a nonempty list when feature_type is 'enum'"
            )
        return values

    def to_gpt_interface(self) -> GPTInterface:
        """
        Build the JSON-Schema dict for GPT from the lightweight input.
        """
        desc = self.feature_prompt.strip()
        t = self.feature_type

        if t == "text":
            return GPTInterface(type="string", description=desc)

        if t == "number":
            return GPTInterface(type="number", description=desc)

        if t == "boolean":
            # we store actual JSON boolean
            # but in the prompt we ask for true/false
            return GPTInterface(
                type="string",
                description=f"{desc}.  Answer true or false.",
                enum=["True", "False"],
            )

        if t == "enum":
            return GPTInterface(
                type="string",
                description=f"{desc}  Choose one of [{', '.join(self.enum_options or [])}].",
                enum=self.enum_options,
            )

        if t == "parent":
            # array of objects; we leave an empty schema for child objects
            return GPTInterface(
                type="array",
                description=f"Array of {self.feature_name} objects with detailed properties",
                items={
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            )

        # fallback
        return GPTInterface(type="string", description=desc)
