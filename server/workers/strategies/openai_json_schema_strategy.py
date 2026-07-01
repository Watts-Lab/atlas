"""
OpenAI JSON Schema Strategy for Feature Extraction.

Uses the OpenAI Responses API with a strict JSON schema output format.
"""

import json
import logging
from typing import Any, Dict, Optional

from workers.strategies.extraction_strategy import ExtractionStrategy

logger = logging.getLogger(__name__)


class OpenAIJSONSchemaStrategy(ExtractionStrategy):
    """Extract features using the OpenAI Responses API with JSON Schema output."""

    MODEL = "gpt-5.4-mini"

    def get_strategy_name(self) -> str:
        return "openai_json_schema"

    def extract(
        self,
        file_path: str,
        custom_prompt: Optional[str] = None,
        feature_ids: Optional[list[str]] = None,
        silent: bool = False,
    ) -> Dict[str, Any]:
        """Extract features using the OpenAI Responses API with structured output."""

        try:
            if not silent:
                self.emitter.emit_status(
                    message="Starting OpenAI JSON Schema extraction...", progress=0
                )

            if not silent:
                self.emitter.emit_status(message="Building JSON schema...", progress=10)
            schema = self._build_json_schema(feature_ids)

            if not silent:
                self.emitter.emit_status(message="Reading file...", progress=20)
            file_content = self._encode_file_to_base64(file_path)
            filename = file_path.split("/")[-1]

            instructions = self._resolve_instructions(custom_prompt)

            if not silent:
                self.emitter.emit_status(message="Calling OpenAI API...", progress=30)

            response = self.client.responses.create(
                model=self.MODEL,
                input=[
                    {"role": "system", "content": instructions},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_file",
                                "filename": filename,
                                "file_data": f"data:application/pdf;base64,{file_content}",
                            }
                        ],
                    },
                ],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "extract_features",
                        "strict": True,
                        "schema": schema,
                    },
                    "verbosity": "medium",
                },
                reasoning={"effort": "medium", "summary": "auto"},
                tools=[],
                store=False,
                include=[],
            )

            if not silent:
                self.emitter.emit_status(message="Processing response...", progress=60)

            result = json.loads(response.output_text)

            return {
                "result": result,
                "model": self.MODEL,
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
            }

        except Exception as e:
            logger.error("Error in OpenAIJSONSchemaStrategy: %s", e)
            raise
