"""
Extraction strategy abstract base class.
"""

import base64
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

from openai import OpenAI

from database.models.projects import Project
from gpt_assistant import (
    build_parent_objects,
    enforce_additional_properties,
    get_all_features,
    get_features_by_ids,
)
from workers.services.socket_emitter import SocketEmmiter


class ExtractionStrategy(ABC):
    """Abstract base class for different extraction strategies."""

    def __init__(
        self, client: OpenAI, project_id: Optional[str], emitter: SocketEmmiter
    ):
        self.client = client
        self.project_id = project_id
        self.emitter = emitter

    @abstractmethod
    def extract(
        self,
        file_path: str,
        temperature: float = 0.7,
        custom_prompt: Optional[str] = None,
        feature_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Extract features from the provided file."""
        pass

    @abstractmethod
    def get_strategy_name(self) -> str:
        """Return the name of this strategy."""
        pass

    # ------------------------------------------------------------------
    # Shared helpers for JSON-schema based strategies
    # ------------------------------------------------------------------
    def _build_json_schema(self, feature_ids: Optional[List[str]] = None) -> dict:
        """Resolve the project/feature set and build a strict JSON schema."""
        if feature_ids:
            feature_list, feature_obj = get_features_by_ids(feature_ids)
        elif self.project_id:
            feature_list, feature_obj = get_all_features(self.project_id)
        else:
            raise ValueError("Either project_id or feature_ids must be provided")

        if not feature_list:
            raise ValueError("No features found for extraction")

        properties = build_parent_objects(feature_list, feature_obj)
        schema = {
            "type": "object",
            "properties": properties,
            "required": ["paper"],
            "additionalProperties": False,
        }
        return enforce_additional_properties(schema)

    def _encode_file_to_base64(self, file_path: str) -> str:
        """Encode file content to base64."""
        with open(file_path, "rb") as file:
            return base64.b64encode(file.read()).decode("utf-8")

    def _resolve_instructions(self, custom_prompt: Optional[str]) -> str:
        """Pick the system prompt: custom > project prompt > default."""
        instructions = custom_prompt
        if not instructions and self.project_id:
            project = Project.get(self.project_id).run()
            if project:
                instructions = project.prompt
        if not instructions:
            instructions = self._get_default_prompt()
        return instructions

    def _get_default_prompt(self) -> str:
        """Get default system prompt."""
        return (
            "You are a research assistant for a team of scientists tasked with research cartography. "
            "You are given a PDF of the paper and are asked to extract specific features according to the provided schema. "
            "Your response should be in JSON format that strictly adheres to the schema. "
            "Extract all relevant information from the paper that matches the requested features."
        )
