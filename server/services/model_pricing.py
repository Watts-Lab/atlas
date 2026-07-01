"""LLM model pricing registry and cost computation.

Costs are tracked in **USD** rather than raw token counts because different
models have very different per-token prices, and we plan to let users pick a
model per project. Keeping prices in one table means metering, budgets, and the
UI all speak the same currency.

Prices are expressed in USD per 1,000,000 tokens (the unit providers publish).
Update ``MODEL_PRICING`` whenever a provider changes prices or a new model is
added.

Money is handled internally in **integer micro-dollars** (1 USD = 1,000,000
micros) to avoid floating-point drift when accumulating many small charges with
atomic ``$inc`` operations. Convert to/from USD only at the edges (display).
"""

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

MICROS_PER_USD = 1_000_000


@dataclass(frozen=True)
class ModelPrice:
    """Per-million-token prices (USD) for one model."""

    provider: str
    input_per_million: float
    output_per_million: float


# Canonical price list. Keys are the exact model identifiers passed to the
# provider APIs. Keep this in sync with provider pricing pages.
MODEL_PRICING: dict[str, ModelPrice] = {
    "gpt-5.4-mini": ModelPrice("openai", 0.75, 4.5),
    "gpt-5.4": ModelPrice("openai", 2.5, 15.0),
    "gpt-5.5": ModelPrice("openai", 5.0, 30.0),
    # Used by the Assistant API strategy (assistant_api).
    # TODO(pricing): confirm real gpt-4.1 prices — these are PLACEHOLDERS.
    "gpt-4.1": ModelPrice("openai", 2.0, 8.0),
}


def get_price(model: str) -> Optional[ModelPrice]:
    """Return the :class:`ModelPrice` for *model*, or None if unknown."""
    return MODEL_PRICING.get(model)


def cost_micros(model: str, prompt_tokens: int, completion_tokens: int) -> int:
    """Compute the cost of a call in integer micro-dollars.

    Returns 0 (and logs a warning) for an unknown model so that a successful
    extraction is never lost just because we can't price it yet — better to
    under-charge with a loud log than to fail the user's completed work.

    Because prices are per 1,000,000 tokens, the micro-dollar cost simplifies to
    ``tokens * price_per_million`` (the two factors of 1e6 cancel).
    """
    price = MODEL_PRICING.get(model)
    if price is None:
        logger.warning(
            "No pricing for model %r; charging 0. Add it to MODEL_PRICING.", model
        )
        return 0

    prompt_tokens = max(0, prompt_tokens or 0)
    completion_tokens = max(0, completion_tokens or 0)
    micros = (
        prompt_tokens * price.input_per_million
        + completion_tokens * price.output_per_million
    )
    return round(micros)


def micros_to_usd(micros: int) -> float:
    """Convert integer micro-dollars to a USD float rounded to 6 dp."""
    return round((micros or 0) / MICROS_PER_USD, 6)


def usd_to_micros(usd: float) -> int:
    """Convert a USD amount to integer micro-dollars."""
    return round((usd or 0) * MICROS_PER_USD)
