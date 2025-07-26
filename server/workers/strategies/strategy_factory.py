"""
Strategy factory for creating extraction strategies.
"""

from openai import OpenAI

from workers.services.socket_emitter import SocketEmmiter
from workers.strategies.assistant_strategy import AssistantAPIStrategy
from workers.strategies.extraction_strategy import ExtractionStrategy
from workers.strategies.json_schema_strategy import JSONSchemaStrategy


class ExtractionStrategyFactory:
    """Factory for creating extraction strategies."""

    _strategies = {
        "assistant_api": AssistantAPIStrategy,
        "json_schema": JSONSchemaStrategy,
    }

    @classmethod
    def create_strategy(
        cls, strategy_type: str, client: OpenAI, project_id: str, emitter: SocketEmmiter
    ) -> ExtractionStrategy:
        """
        Create an extraction strategy based on the specified type.

        Args:
            strategy_type: Type of strategy ('assistant_api' or 'json_schema')
            client: OpenAI client
            project_id: Project ID
            emitter: Socket emitter for progress updates

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

        return strategy_class(client, project_id, emitter)

    @classmethod
    def get_available_strategies(cls) -> list[str]:
        """Get list of available strategy types."""
        return list(cls._strategies.keys())
