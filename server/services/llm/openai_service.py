"""OpenAI adapter — uses the Responses API with strict JSON-schema output.

Serves BOTH the Atlas platform key and a user's bring-your-own OpenAI key; only
the key (and whether the call is metered) differs, and that decision is made by
the resolver, not here.
"""

import json
import logging

from openai import OpenAI
from services.llm.base import LLMService, StructuredExtractionResult

logger = logging.getLogger(__name__)

DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"


class OpenAIService(LLMService):
    name = "openai"

    def __init__(self, api_key: str, model: str = DEFAULT_OPENAI_MODEL):
        self.model = model or DEFAULT_OPENAI_MODEL
        self._client = OpenAI(api_key=api_key)

    def extract_structured(
        self,
        *,
        instructions: str,
        pdf_base64: str,
        filename: str,
        schema: dict,
        schema_name: str = "extract_features",
    ) -> StructuredExtractionResult:
        response = self._client.responses.create(
            model=self.model,
            input=[
                {"role": "system", "content": instructions},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_file",
                            "filename": filename,
                            "file_data": f"data:application/pdf;base64,{pdf_base64}",
                        }
                    ],
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
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

        return StructuredExtractionResult(
            data=json.loads(response.output_text),
            model=self.model,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
        )

    def ping(self) -> None:
        # Cheapest possible sanity check that the key is accepted.
        self._client.models.list()
