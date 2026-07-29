"""
Strategy factory for creating extraction strategies.

Two kinds of strategy exist:

* ``json_schema`` — provider-agnostic. Runs against any injected
  :class:`~services.llm.base.LLMService` (OpenAI / Anthropic / OpenRouter).
* ``assistant_api`` — OpenAI-only, uses the Assistant API + vector stores. It
  needs a real OpenAI client, so we build one from the resolved service when it
  is OpenAI-backed.
"""

from typing import Optional

from services.llm.base import LLMService
from services.llm.openai_service import OpenAIService
from workers.services.socket_emitter import SocketEmmiter
from workers.strategies.assistant_strategy import AssistantAPIStrategy
from workers.strategies.extraction_strategy import ExtractionStrategy
from workers.strategies.json_schema_strategy import JSONSchemaExtractionStrategy

# Approaches that use the unified, provider-agnostic strategy. The legacy
# per-provider aliases map here too so old callers keep working.
_JSON_SCHEMA_ALIASES = {
    "json_schema",
    "openai_json_schema",
    "anthropic_json_schema",
    "openrouter_json_schema",
}


class ExtractionStrategyFactory:
    """Factory for creating extraction strategies."""

    @classmethod
    def create_strategy(
        cls,
        strategy_type: str,
        service: LLMService,
        project_id: Optional[str],
        emitter: SocketEmmiter,
    ) -> ExtractionStrategy:
        """
        Create an extraction strategy.

        Args:
            strategy_type: "json_schema" (or a legacy per-provider alias) or
                "assistant_api".
            service: The resolved, provider-agnostic LLM service.
            project_id: Project ID (or None).
            emitter: Socket emitter for progress updates.

        Raises:
            ValueError: If the strategy type is not recognized, or assistant_api
                is requested with a non-OpenAI service.
        """
        if strategy_type in _JSON_SCHEMA_ALIASES:
            return JSONSchemaExtractionStrategy(service, project_id, emitter)

        if strategy_type == "assistant_api":
            # The Assistant API is OpenAI-specific and needs a real OpenAI client.
            if not isinstance(service, OpenAIService):
                raise ValueError(
                    "The assistant_api strategy only supports OpenAI. Set the "
                    "project provider to 'atlas' or 'openai', or use json_schema."
                )
            return AssistantAPIStrategy(
                service._client,  # noqa: SLF001 - the strategy needs the raw client
                project_id,
                emitter,
                api_key=None,
            )

        raise ValueError(
            f"Unknown strategy type: {strategy_type}. "
            f"Available: {sorted(_JSON_SCHEMA_ALIASES)} + ['assistant_api']"
        )

    @classmethod
    def get_available_strategies(cls) -> list[str]:
        """Get list of available strategy types (for request validation)."""
        return sorted(_JSON_SCHEMA_ALIASES | {"assistant_api"})
