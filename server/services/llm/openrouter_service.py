"""OpenRouter adapter — uses the OpenAI-compatible Chat Completions API.

OpenRouter speaks the Chat Completions dialect (NOT the OpenAI Responses API),
exposes every model behind one base URL, and expects provider-prefixed model
ids (e.g. ``openai/gpt-5.4-mini``). PDFs are attached via a ``file`` content part and
parsed by OpenRouter's ``file-parser`` plugin. Structured output uses
``response_format: json_schema``.

Because this is always a bring-your-own key, the user pays OpenRouter directly
and the call is never metered against the Atlas budget.
"""

import json
import logging

from openai import OpenAI
from services.llm.base import LLMService, StructuredExtractionResult

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_MODEL = "openai/gpt-5.4-mini"


class OpenRouterService(LLMService):
    name = "openrouter"

    def __init__(self, api_key: str, model: str = DEFAULT_OPENROUTER_MODEL):
        self.model = model or DEFAULT_OPENROUTER_MODEL
        # Same OpenAI SDK, different base_url — OpenRouter is wire-compatible with
        # the Chat Completions API.
        self._client = OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)

    def extract_structured(
        self,
        *,
        instructions: str,
        pdf_base64: str,
        filename: str,
        schema: dict,
        schema_name: str = "extract_features",
    ) -> StructuredExtractionResult:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": instructions},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "file",
                            "file": {
                                "filename": filename,
                                "file_data": f"data:application/pdf;base64,{pdf_base64}",
                            },
                        }
                    ],
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": True,
                    "schema": schema,
                },
            },
            extra_body={
                # Let OpenRouter parse the PDF for models without native file input.
                "plugins": [{"id": "file-parser", "pdf": {"engine": "native"}}],
            },
        )

        usage = response.usage
        return StructuredExtractionResult(
            data=json.loads(response.choices[0].message.content),
            model=self.model,
            prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
            completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
        )

    def ping(self) -> None:
        self._client.models.list()
