"""
Strategy factory for creating extraction strategies.
"""

from typing import Optional

from openai import OpenAI
from workers.services.socket_emitter import SocketEmmiter
from workers.strategies.anthropic_json_schema_strategy import (
    AnthropicJSONSchemaStrategy,
)
from workers.strategies.assistant_strategy import AssistantAPIStrategy
from workers.strategies.extraction_strategy import ExtractionStrategy
from workers.strategies.openai_json_schema_strategy import OpenAIJSONSchemaStrategy


class ExtractionStrategyFactory:
    """Factory for creating extraction strategies."""

    _strategies = {
        "assistant_api": AssistantAPIStrategy,
        "openai_json_schema": OpenAIJSONSchemaStrategy,
        "anthropic_json_schema": AnthropicJSONSchemaStrategy,
        # Backwards-compatible alias for the original OpenAI JSON schema strategy.
        "json_schema": OpenAIJSONSchemaStrategy,
    }

    @classmethod
    def create_strategy(
        cls,
        strategy_type: str,
        client: OpenAI,
        project_id: str,
        emitter: SocketEmmiter,
        api_key: Optional[str] = None,
    ) -> ExtractionStrategy:
        """
        Create an extraction strategy based on the specified type.

        Args:
            strategy_type: Type of strategy ('assistant_api', 'openai_json_schema',
                or 'anthropic_json_schema')
            client: OpenAI client (already built from the resolved key)
            project_id: Project ID
            emitter: Socket emitter for progress updates
            api_key: The resolved provider key. Passed to strategies (e.g. the
                Anthropic strategy) that build their own provider client so they
                use the same credential the caller resolved, never an env default.

        Returns:
            ExtractionStrategy instance

        Raises:
            ValueError: If strategy type is not recognized
        """
        strategy_class = cls._strategies.get(strategy_type)
        if not strategy_class:
            raise ValueError(
                f"Unknown strategy type: {strategy_type}. "
                f"Available strategies: {list(cls._strategies.keys())}"
            )

        return strategy_class(client, project_id, emitter, api_key=api_key)

    @classmethod
    def get_available_strategies(cls) -> list[str]:
        """Get list of available strategy types."""
        return list(cls._strategies.keys())
