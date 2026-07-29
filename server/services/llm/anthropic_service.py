"""Anthropic adapter — uses the Messages API with JSON-schema output."""

import json
import logging

import anthropic
from services.llm.base import LLMService, StructuredExtractionResult

logger = logging.getLogger(__name__)

DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8"
_MAX_TOKENS = 16000


class AnthropicService(LLMService):
    name = "anthropic"

    def __init__(self, api_key: str, model: str = DEFAULT_ANTHROPIC_MODEL):
        self.model = model or DEFAULT_ANTHROPIC_MODEL
        self._client = anthropic.Anthropic(api_key=api_key)

    def extract_structured(
        self,
        *,
        instructions: str,
        pdf_base64: str,
        filename: str,
        schema: dict,
        schema_name: str = "extract_features",
    ) -> StructuredExtractionResult:
        response = self._client.messages.create(
            model=self.model,
            max_tokens=_MAX_TOKENS,
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
                                "data": pdf_base64,
                            },
                        }
                    ],
                }
            ],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )

        return StructuredExtractionResult(
            data=json.loads(response.content[0].text),
            model=self.model,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
        )

    def ping(self) -> None:
        # A 1-token message is the cheapest way to confirm the key is valid.
        self._client.messages.create(
            model=self.model,
            max_tokens=1,
            messages=[{"role": "user", "content": "ping"}],
        )
