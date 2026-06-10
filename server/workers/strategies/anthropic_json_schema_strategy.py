"""
Anthropic JSON Schema Strategy for Feature Extraction.

Uses the Anthropic Messages API with a strict JSON schema output format.
"""

import json
import logging
from typing import Dict, Any, Optional

import anthropic

from workers.strategies.extraction_strategy import ExtractionStrategy

logger = logging.getLogger(__name__)


class AnthropicJSONSchemaStrategy(ExtractionStrategy):
    """Extract features using the Anthropic Messages API with JSON Schema output."""

    MODEL = "claude-opus-4-8"
    MAX_TOKENS = 16000

    def __init__(self, client, project_id, emitter):
        super().__init__(client, project_id, emitter)
        # This strategy talks to Anthropic, not OpenAI; use a dedicated client.
        self.anthropic_client = anthropic.Anthropic()

    def get_strategy_name(self) -> str:
        return "anthropic_json_schema"

    def extract(
        self,
        file_path: str,
        temperature: float = 0.7,
        custom_prompt: Optional[str] = None,
        feature_ids: Optional[list[str]] = None,
        silent: bool = False,
    ) -> Dict[str, Any]:
        """Extract features using the Anthropic Messages API with structured output."""

        try:
            if not silent:
                self.emitter.emit_status(
                    message="Starting Anthropic JSON Schema extraction...", progress=0
                )

            if not silent:
                self.emitter.emit_status(message="Building JSON schema...", progress=10)
            schema = self._build_json_schema(feature_ids)

            if not silent:
                self.emitter.emit_status(message="Reading file...", progress=20)
            file_content = self._encode_file_to_base64(file_path)

            instructions = self._resolve_instructions(custom_prompt)

            if not silent:
                self.emitter.emit_status(
                    message="Calling Anthropic API...", progress=30
                )

            response = self.anthropic_client.messages.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=instructions,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "document",
                                "source": {
                                    "type": "base64",
                                    "media_type": "application/pdf",
                                    "data": file_content,
                                },
                            }
                        ],
                    }
                ],
                output_config={
                    "format": {
                        "type": "json_schema",
                        "schema": schema,
                    }
                },
            )

            if not silent:
                self.emitter.emit_status(message="Processing response...", progress=60)

            result = json.loads(response.content[0].text)

            return {
                "result": result,
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
            }

        except Exception as e:
            logger.error("Error in AnthropicJSONSchemaStrategy: %s", e)
            raise
