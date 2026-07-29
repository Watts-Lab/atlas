"""Provider-agnostic JSON-schema extraction strategy.

This is the single strategy that replaces the old per-provider
``OpenAIJSONSchemaStrategy`` / ``AnthropicJSONSchemaStrategy`` pair. It owns the
orchestration (build schema, resolve instructions, encode PDF, emit progress,
validate output) and delegates the one provider-specific step — the actual model
call — to an injected :class:`~services.llm.base.LLMService`.

Because the service is injected, this class contains no provider branching: swap
the service and the same code runs against OpenAI, Anthropic, or OpenRouter.
"""

import logging
from typing import Any, Dict, Optional

import jsonschema
from services.llm.base import LLMService
from workers.strategies.extraction_strategy import ExtractionStrategy

logger = logging.getLogger(__name__)


class JSONSchemaExtractionStrategy(ExtractionStrategy):
    """Extract features against a strict JSON schema using any LLM service."""

    def __init__(self, service: LLMService, project_id, emitter, api_key=None):
        # The base class stores an OpenAI `client` for legacy strategies; here we
        # ignore it and use the injected provider-agnostic service instead.
        super().__init__(client=None, project_id=project_id, emitter=emitter, api_key=api_key)
        self.service = service

    def get_strategy_name(self) -> str:
        return "json_schema"

    def extract(
        self,
        file_path: str,
        custom_prompt: Optional[str] = None,
        feature_ids: Optional[list[str]] = None,
        silent: bool = False,
    ) -> Dict[str, Any]:
        try:
            if not silent:
                self.emitter.emit_status(
                    message=f"Starting extraction ({self.service.name})...", progress=0
                )

            if not silent:
                self.emitter.emit_status(message="Building JSON schema...", progress=10)
            schema = self._build_json_schema(feature_ids)

            if not silent:
                self.emitter.emit_status(message="Reading file...", progress=20)
            pdf_base64 = self._encode_file_to_base64(file_path)
            filename = file_path.split("/")[-1]

            instructions = self._resolve_instructions(custom_prompt)

            if not silent:
                self.emitter.emit_status(
                    message=f"Calling {self.service.name} API...", progress=30
                )

            result = self.service.extract_structured(
                instructions=instructions,
                pdf_base64=pdf_base64,
                filename=filename,
                schema=schema,
                schema_name="extract_features",
            )

            if not silent:
                self.emitter.emit_status(message="Validating response...", progress=60)

            # Provider-agnostic correctness check: confirm the model's JSON really
            # matches the schema we asked for. Providers claim strict mode, but a
            # bad/hallucinated response is caught here uniformly for all of them.
            self._validate_against_schema(result.data, schema)

            return {
                "result": result.data,
                "model": result.model,
                "prompt_tokens": result.prompt_tokens,
                "completion_tokens": result.completion_tokens,
            }

        except Exception as e:
            logger.error("Error in JSONSchemaExtractionStrategy: %s", e)
            raise

    @staticmethod
    def _validate_against_schema(data: dict, schema: dict) -> None:
        """Raise a clear error if *data* does not satisfy *schema*."""
        try:
            jsonschema.validate(instance=data, schema=schema)
        except jsonschema.ValidationError as exc:
            path = "/".join(str(p) for p in exc.absolute_path) or "(root)"
            raise ValueError(
                f"Model output failed schema validation at '{path}': {exc.message}"
            ) from exc
