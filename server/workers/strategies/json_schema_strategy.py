"""
JSON Schema Strategy for Feature Extraction
"""

import base64
import json
import logging
from typing import Dict, Any, Optional

from database.models.projects import Project
from gpt_assistant import (
    build_parent_objects,
    enforce_additional_properties,
    get_all_features,
)
from workers.strategies.extraction_strategy import ExtractionStrategy


logger = logging.getLogger(__name__)


class JSONSchemaStrategy(ExtractionStrategy):
    """Strategy for extracting features using Chat Completions with JSON Schema."""

    def get_strategy_name(self) -> str:
        return "json_schema"

    def extract(
        self,
        file_path: str,
        temperature: float = 0.7,
        custom_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extract features using Chat Completions API with structured output."""

        try:
            self.emitter.emit_status(
                message="Starting JSON Schema extraction...", progress=0
            )

            # Get features and build schema
            feature_list, feature_obj = get_all_features(self.project_id)

            self.emitter.emit_status(message="Building JSON schema...", progress=10)
            schema = self._build_json_schema(feature_list, feature_obj)

            self.emitter.emit_status(message="Reading file...", progress=20)
            file_content = self._encode_file_to_base64(file_path)
            filename = file_path.split("/")[-1]

            # Get custom prompt from project
            project = Project.get(self.project_id).run()
            instructions = custom_prompt or project.prompt or self._get_default_prompt()

            self.emitter.emit_status(message="Calling OpenAI API...", progress=30)

            messages = [
                {"role": "system", "content": instructions},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "file",
                            "file": {
                                "filename": filename,
                                "file_data": f"data:application/pdf;base64,{file_content}",
                            },
                        }
                    ],
                },
            ]

            response = self.client.chat.completions.create(
                model="o4-mini",
                messages=messages,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "extract_features",
                        "strict": True,
                        "schema": schema,
                    },
                },
                reasoning_effort="medium",
            )

            self.emitter.emit_status(message="Processing response...", progress=60)

            # Parse the response
            result = json.loads(response.choices[0].message.content)

            return {
                "result": result,
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }

        except Exception as e:
            logger.error("Error in JSONSchemaStrategy: %s", e)
            raise

    def _build_json_schema(self, feature_list: list, feature_obj: dict) -> dict:
        """Build the JSON schema from features."""
        properties = build_parent_objects(feature_list, feature_obj)

        schema = {
            "type": "object",
            "properties": properties,
            "required": ["paper"],
            "additionalProperties": False,
        }

        # Ensure all objects have additionalProperties: False
        return enforce_additional_properties(schema)

    def _encode_file_to_base64(self, file_path: str) -> str:
        """Encode file content to base64."""
        with open(file_path, "rb") as file:
            return base64.b64encode(file.read()).decode("utf-8")

    def _get_default_prompt(self) -> str:
        """Get default system prompt."""
        return (
            "You are a research assistant for a team of scientists tasked with research cartography. "
            "You are given a PDF of the paper and are asked to extract specific features according to the provided schema. "
            "Your response should be in JSON format that strictly adheres to the schema. "
            "Extract all relevant information from the paper that matches the requested features."
        )
