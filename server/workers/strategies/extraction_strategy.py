"""
Extraction strategy abstract base class.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from openai import OpenAI
from workers.services.socket_emitter import SocketEmmiter


class ExtractionStrategy(ABC):
    """Abstract base class for different extraction strategies."""

    def __init__(self, client: OpenAI, project_id: str, emitter: SocketEmmiter):
        self.client = client
        self.project_id = project_id
        self.emitter = emitter

    @abstractmethod
    def extract(
        self,
        file_path: str,
        temperature: float = 0.7,
        custom_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extract features from the provided file."""
        pass

    @abstractmethod
    def get_strategy_name(self) -> str:
        """Return the name of this strategy."""
        pass
