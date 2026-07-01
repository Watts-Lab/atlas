"""Central resolution of LLM provider credentials and usage metering.

This module is the single source of truth for two tightly-coupled decisions:

1. **Which API key** to use for a given user and provider — the user's own
   (bring-your-own, "BYO") key if they have configured one, otherwise Atlas'
   platform key from the environment.
2. **Whether that call counts against the user's monthly budget** — it counts
   only when we used the platform key. BYO calls are never metered because the
   user pays the provider directly.

The two decisions are returned together in a single :class:`LlmCredentials`
object so they can never disagree: there is no code path where a caller uses the
user's own key but still decrements the budget, or uses the platform key for
free. Callers must obtain credentials here, use ``credentials.api_key`` to build
the client, and (on success) pass the *same* object to :func:`record_usage`.

Budgets are tracked in **USD** (stored as integer micro-dollars on the user; see
``services/model_pricing.py``). Budget resets on a calendar-month boundary (UTC):
the first metered usage in a new month rolls the counter back to zero.
"""

import logging
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal, Optional

from bunnet.operators import Inc, Set
from database.models.users import User
from services.model_pricing import cost_micros, micros_to_usd

logger = logging.getLogger(__name__)

Provider = Literal["openai", "anthropic"]

# Providers whose extraction runs consume the monthly budget when using the
# platform key. Maps provider -> platform key environment variable.
_PLATFORM_ENV = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


class BudgetExceededError(RuntimeError):
    """Raised when a user has no BYO key and their monthly budget is exhausted."""


class MissingPlatformKeyError(RuntimeError):
    """Raised when neither a BYO key nor a platform key is available."""


@dataclass(frozen=True)
class LlmCredentials:
    """The resolved key for one provider plus whether it is metered.

    Attributes
    ----------
    provider : the provider these credentials are for.
    api_key  : the plaintext key to pass to the provider client.
    is_byo   : True if this is the user's own key (NOT metered), False if it is
               the Atlas platform key (metered against the monthly budget).
    """

    provider: Provider
    api_key: str
    is_byo: bool


# ---------------------------------------------------------------------------
# Calendar-month window helpers
# ---------------------------------------------------------------------------
def _current_period_start(now: Optional[datetime] = None) -> datetime:
    """Return the UTC start of the current calendar month."""
    now = now or datetime.now(UTC)
    return datetime(now.year, now.month, 1, tzinfo=UTC)


def _is_same_period(
    period_start: Optional[datetime], now: Optional[datetime] = None
) -> bool:
    """True if *period_start* falls in the current calendar month."""
    if period_start is None:
        return False
    if period_start.tzinfo is None:
        period_start = period_start.replace(tzinfo=UTC)
    current = _current_period_start(now)
    return period_start.year == current.year and period_start.month == current.month


# ---------------------------------------------------------------------------
# BYO key access
# ---------------------------------------------------------------------------
def _decrypt_user_key(user: User, provider: Provider) -> Optional[str]:
    """Return the user's decrypted BYO key for *provider*, or None.

    Decryption failures are logged and treated as "no BYO key" so that a corrupt
    stored value falls back to the platform key rather than breaking extraction.
    """
    from utils.crypto import EncryptionError, decrypt_secret

    encrypted = (
        getattr(user, "openai_api_key_encrypted", None)
        if provider == "openai"
        else getattr(user, "anthropic_api_key_encrypted", None)
    )
    if not encrypted:
        return None
    try:
        return decrypt_secret(encrypted)
    except EncryptionError as exc:
        logger.error(
            "Failed to decrypt %s BYO key for user %s; falling back to platform key: %s",
            provider,
            user.email,
            exc,
        )
        return None


# ---------------------------------------------------------------------------
# Usage snapshot / reset
# ---------------------------------------------------------------------------
def get_usage(user: User) -> dict:
    """Return the user's current budget snapshot, applying a lazy monthly reset.

    Amounts are reported in USD (converted from the stored micro-dollars). If the
    stored usage window is stale (a new calendar month has begun), the persisted
    counter is reset before the snapshot is returned. Attributes are read
    defensively so legacy user documents lacking the newer fields still produce a
    sensible snapshot.
    """
    period_start = getattr(user, "usage_period_start", None)
    if period_start is not None and not _is_same_period(period_start):
        _reset_period(user)
        period_start = user.usage_period_start

    used_micros = getattr(user, "monthly_usd_used_micros", 0) or 0
    limit_micros = getattr(user, "monthly_usd_limit_micros", 0) or 0
    remaining_micros = max(0, limit_micros - used_micros)
    return {
        "currency": "usd",
        "limit_usd": micros_to_usd(limit_micros),
        "used_usd": micros_to_usd(used_micros),
        "remaining_usd": micros_to_usd(remaining_micros),
        "period_start": (
            _current_period_start().isoformat()
            if period_start is None
            else period_start.isoformat()
        ),
        "has_openai_key": bool(getattr(user, "openai_api_key_encrypted", None)),
        "has_anthropic_key": bool(getattr(user, "anthropic_api_key_encrypted", None)),
    }


def _reset_period(user: User) -> None:
    """Persist a reset of the user's monthly counter to the current window."""
    period_start = _current_period_start()
    User.find_one(User.id == user.id).update(
        Set(
            {
                User.monthly_usd_used_micros: 0,
                User.usage_period_start: period_start,
                User.updated_at: datetime.now(UTC),
            }
        )
    ).run()
    user.monthly_usd_used_micros = 0
    user.usage_period_start = period_start


# ---------------------------------------------------------------------------
# Core resolution + metering
# ---------------------------------------------------------------------------
def resolve_llm_credentials(user: User, provider: Provider) -> LlmCredentials:
    """Resolve the key to use for *provider* and whether it is metered.

    Preference order:
    1. The user's BYO key for this provider  -> is_byo=True (never metered).
    2. The Atlas platform key from the env   -> is_byo=False (metered).

    Raises
    ------
    MissingPlatformKeyError
        If the user has no BYO key and no platform key is configured.
    """
    if provider not in _PLATFORM_ENV:
        raise ValueError(f"Unknown provider: {provider!r}")

    byo_key = _decrypt_user_key(user, provider)
    if byo_key:
        return LlmCredentials(provider=provider, api_key=byo_key, is_byo=True)

    platform_key = os.getenv(_PLATFORM_ENV[provider])
    if not platform_key:
        raise MissingPlatformKeyError(
            f"No BYO key for {provider} and platform key "
            f"({_PLATFORM_ENV[provider]}) is not configured."
        )
    return LlmCredentials(provider=provider, api_key=platform_key, is_byo=False)


def check_budget(user: User) -> None:
    """Raise :class:`BudgetExceededError` if the platform budget is exhausted.

    No-op safety check to call *before* a metered platform call. Applies the
    lazy monthly reset first so a new month restores availability.
    """
    usage = get_usage(user)
    if usage["remaining_usd"] <= 0:
        raise BudgetExceededError(
            f"Monthly budget reached (${usage['used_usd']:.2f}/"
            f"${usage['limit_usd']:.2f}). Add your own OpenAI/Anthropic API key "
            "to continue, or wait for the monthly reset."
        )


def resolve_and_check(user: User, provider: Provider) -> LlmCredentials:
    """Resolve credentials and, if metered, verify budget is available.

    This is the recommended entry point for workers: call it once, before doing
    any provider work, then build the client from the returned key.
    """
    credentials = resolve_llm_credentials(user, provider)
    if not credentials.is_byo:
        check_budget(user)
    return credentials


def record_usage(
    user: User,
    credentials: LlmCredentials,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> int:
    """Record the USD cost of a call against the monthly budget.

    Cost is computed from *model* pricing and the input/output token split, then
    charged in micro-dollars. Only platform (non-BYO) calls are metered; BYO
    calls are ignored because the user pays the provider directly.

    The increment is atomic (Mongo ``$inc``) so concurrent workers for the same
    user cannot clobber each other's counts. A stale monthly window is reset
    before the increment. Returns the micro-dollars charged (0 for BYO / unknown
    model / zero usage).
    """
    if credentials.is_byo:
        return 0

    charge_micros = cost_micros(model, prompt_tokens, completion_tokens)
    if charge_micros <= 0:
        return 0

    # Ensure we are counting into the current month's window.
    period_start = getattr(user, "usage_period_start", None)
    if period_start is None or not _is_same_period(period_start):
        _reset_period(user)

    User.find_one(User.id == user.id).update(
        Inc({User.monthly_usd_used_micros: charge_micros}),
        Set({User.updated_at: datetime.now(UTC)}),
    ).run()
    # Keep the in-memory object roughly in sync for any later reads in this task.
    user.monthly_usd_used_micros = (
        getattr(user, "monthly_usd_used_micros", 0) or 0
    ) + charge_micros
    return charge_micros
