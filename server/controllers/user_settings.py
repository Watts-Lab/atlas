"""Controller functions for user self-service settings.

Covers two related areas:

* **Monthly usage** — a read-only snapshot of the user's platform token budget.
* **Bring-your-own (BYO) provider keys** — storing/removing the user's own
  OpenAI / Anthropic keys. Keys are stored *encrypted* (reversible) via
  ``utils.crypto`` because we must decrypt them to call the provider; only a
  masked prefix is ever returned to the client.

All functions operate on a :class:`~database.models.users.User` resolved by the
route layer (cookie session only — see the routes module).
"""

import logging
from datetime import UTC, datetime
from typing import Literal

from database.models.users import User
from services.llm_credentials import get_usage
from utils.crypto import encrypt_secret

logger = logging.getLogger(__name__)

Provider = Literal["openai", "anthropic"]

# Minimal, provider-specific sanity checks. We deliberately keep these loose —
# providers change key formats over time and we don't want to reject valid keys.
_PROVIDER_PREFIXES = {
    "openai": ("sk-",),
    "anthropic": ("sk-ant-", "sk-"),
}

_MAX_KEY_LENGTH = 500


def _mask(raw_key: str) -> str:
    """Return a safe-to-display mask like ``sk-...ab12``."""
    raw_key = raw_key.strip()
    if len(raw_key) <= 8:
        return "****"
    return f"{raw_key[:3]}...{raw_key[-4:]}"


def _field_names(provider: Provider) -> tuple[str, str]:
    """Return (encrypted_field, prefix_field) attribute names for *provider*."""
    if provider == "openai":
        return "openai_api_key_encrypted", "openai_api_key_prefix"
    if provider == "anthropic":
        return "anthropic_api_key_encrypted", "anthropic_api_key_prefix"
    raise ValueError(f"Unknown provider: {provider!r}")


def get_settings(user: User) -> dict:
    """Return the user's usage snapshot plus BYO-key presence/masks."""
    usage = get_usage(user)
    return {
        "usage": usage,
        "provider_keys": {
            "openai": {
                "configured": bool(user.openai_api_key_encrypted),
                "prefix": user.openai_api_key_prefix,
            },
            "anthropic": {
                "configured": bool(user.anthropic_api_key_encrypted),
                "prefix": user.anthropic_api_key_prefix,
            },
        },
    }


def set_provider_key(user: User, provider: Provider, raw_key: str) -> dict:
    """Encrypt and store *raw_key* for *provider* on *user*.

    Returns a masked confirmation. Raises ``ValueError`` on validation failure.
    """
    if provider not in _PROVIDER_PREFIXES:
        raise ValueError(f"Unsupported provider: {provider!r}")

    raw_key = (raw_key or "").strip()
    if not raw_key:
        raise ValueError("API key must not be empty.")
    if len(raw_key) > _MAX_KEY_LENGTH:
        raise ValueError("API key is unexpectedly long.")
    if not raw_key.startswith(_PROVIDER_PREFIXES[provider]):
        expected = " or ".join(_PROVIDER_PREFIXES[provider])
        raise ValueError(
            f"That does not look like a valid {provider} key (expected it to "
            f"start with {expected})."
        )

    encrypted = encrypt_secret(raw_key)
    prefix = _mask(raw_key)
    enc_field, prefix_field = _field_names(provider)

    setattr(user, enc_field, encrypted)
    setattr(user, prefix_field, prefix)
    user.updated_at = datetime.now(UTC)
    user.save()

    logger.info("Stored %s BYO key for user %s", provider, user.email)
    return {
        "provider": provider,
        "configured": True,
        "prefix": prefix,
        "message": f"{provider.capitalize()} API key saved.",
    }


def delete_provider_key(user: User, provider: Provider) -> dict:
    """Remove the stored BYO key for *provider* on *user*."""
    if provider not in _PROVIDER_PREFIXES:
        raise ValueError(f"Unsupported provider: {provider!r}")

    enc_field, prefix_field = _field_names(provider)
    setattr(user, enc_field, None)
    setattr(user, prefix_field, None)
    user.updated_at = datetime.now(UTC)
    user.save()

    logger.info("Removed %s BYO key for user %s", provider, user.email)
    return {
        "provider": provider,
        "configured": False,
        "message": f"{provider.capitalize()} API key removed.",
    }
