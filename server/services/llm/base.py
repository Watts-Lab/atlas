"""The LLM service *port* — the single interface every provider adapter implements.

This is the "bridge" that decouples *what* we want (structured extraction from a
PDF against a JSON schema) from *where* it runs (OpenAI, Anthropic, OpenRouter).
The extraction strategy depends only on this interface, so it never contains a
single ``if provider == ...`` branch — each adapter hides its own wire format and
returns the same normalized :class:`StructuredExtractionResult`.

Adding a new provider later means writing one new adapter here; nothing in the
strategy, metering, or routes changes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class StructuredExtractionResult:
    """The normalized result every adapter returns, regardless of provider.

    Attributes
    ----------
    data : the parsed JSON object the model produced.
    model : the concrete model id that ran (used for pricing/metering).
    prompt_tokens / completion_tokens : token usage for metering.
    """

    data: dict
    model: str
    prompt_tokens: int
    completion_tokens: int


class LLMService(ABC):
    """A provider-agnostic structured-extraction backend."""

    #: Stable identifier for logs/metering, e.g. "openai", "anthropic", "openrouter".
    name: str = "llm"

    #: The concrete model id this instance will call.
    model: str = ""

    @abstractmethod
    def extract_structured(
        self,
        *,
        instructions: str,
        pdf_base64: str,
        filename: str,
        schema: dict,
        schema_name: str = "extract_features",
    ) -> StructuredExtractionResult:
        """Send *pdf_base64* + *schema* to the model and return normalized output.

        Each adapter is the ONLY place that knows how to (a) attach a PDF in its
        provider's format, (b) request strict JSON-schema output, and (c) dig the
        JSON text and token counts out of its provider's response shape.
        """
        raise NotImplementedError

    @abstractmethod
    def ping(self) -> None:
        """Make a tiny call to verify the credentials work.

        Raises on failure (invalid key, network, etc.). Used by the "test key"
        button. Kept intentionally cheap.
        """
        raise NotImplementedError
