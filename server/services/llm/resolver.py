"""Resolve a ready-to-use :class:`LLMService` from a user + project config.

This is the single place that decides:

1. **Which backend** to build (atlas platform / BYO OpenAI / Anthropic / OpenRouter).
2. **Whether the call is metered** — only the shared Atlas platform key is metered
   against the monthly budget; every BYO key is billed by the provider directly.

Keeping both decisions here means they can never disagree (the same guarantee the
old ``LlmCredentials`` gave), and the extraction strategy stays provider-agnostic.
"""

import logging
import os
from dataclasses import dataclass
from typing import Optional

from database.models.projects import ProjectLLMConfig
from database.models.users import User
from services.llm.anthropic_service import DEFAULT_ANTHROPIC_MODEL, AnthropicService
from services.llm.base import LLMService
from services.llm.openai_service import DEFAULT_OPENAI_MODEL, OpenAIService
from services.llm.openrouter_service import DEFAULT_OPENROUTER_MODEL, OpenRouterService
from services.llm_credentials import (
    BudgetExceededError,  # noqa: F401 (re-exported for callers)
    MissingPlatformKeyError,
    check_budget,
)

logger = logging.getLogger(__name__)

# BYO provider -> (encrypted field, default model, service class)
_BYO_PROVIDERS = {
    "openai": ("openai_api_key_encrypted", DEFAULT_OPENAI_MODEL, OpenAIService),
    "anthropic": (
        "anthropic_api_key_encrypted",
        DEFAULT_ANTHROPIC_MODEL,
        AnthropicService,
    ),
    "openrouter": (
        "openrouter_api_key_encrypted",
        DEFAULT_OPENROUTER_MODEL,
        OpenRouterService,
    ),
}

# The platform (atlas) provider is always OpenAI under the hood.
_PLATFORM_ENV = "OPENAI_API_KEY"


class ProviderKeyMissingError(RuntimeError):
    """Raised when a project selects a BYO provider the user has no key for."""


@dataclass(frozen=True)
class ResolvedLLM:
    """A built service plus the metering decision for this run."""

    service: LLMService
    is_byo: bool  # True -> not metered; False -> platform key, metered

    @property
    def metered(self) -> bool:
        return not self.is_byo


def _decrypt_byo_key(user: User, encrypted_field: str) -> Optional[str]:
    """Return the user's decrypted BYO key from *encrypted_field*, or None."""
    from utils.crypto import EncryptionError, decrypt_secret

    encrypted = getattr(user, encrypted_field, None)
    if not encrypted:
        return None
    try:
        return decrypt_secret(encrypted)
    except EncryptionError as exc:
        logger.error("Failed to decrypt BYO key for user %s: %s", user.email, exc)
        return None


def resolve_llm(
    user: User, llm_config: Optional[ProjectLLMConfig] = None
) -> ResolvedLLM:
    """Build the service for *user* according to *llm_config*.

    Raises
    ------
    ProviderKeyMissingError
        The project selected a BYO provider the user hasn't configured.
    MissingPlatformKeyError
        The project uses the platform key but none is configured.
    BudgetExceededError
        The platform budget is exhausted (checked here for platform calls).
    """
    config = llm_config or ProjectLLMConfig()
    provider = (config.provider or "atlas").lower()

    # ----- Platform (metered) --------------------------------------------
    if provider == "atlas":
        platform_key = os.getenv(_PLATFORM_ENV)
        if not platform_key:
            raise MissingPlatformKeyError(
                "Atlas platform key is not configured on the server."
            )
        check_budget(user)  # fail fast before spending money
        model = config.model or DEFAULT_OPENAI_MODEL
        return ResolvedLLM(service=OpenAIService(platform_key, model), is_byo=False)

    # ----- Bring-your-own (not metered) ----------------------------------
    if provider not in _BYO_PROVIDERS:
        raise ValueError(f"Unknown provider: {provider!r}")

    encrypted_field, default_model, service_cls = _BYO_PROVIDERS[provider]
    key = _decrypt_byo_key(user, encrypted_field)
    if not key:
        raise ProviderKeyMissingError(
            f"This project is set to use your {provider} key, but you haven't "
            f"added one. Add it in Settings, or switch the project's provider."
        )
    service = service_cls(key, config.model or default_model)
    return ResolvedLLM(service=service, is_byo=True)


def build_test_service(provider: str, api_key: str) -> LLMService:
    """Build a service instance for a raw key, for the 'test key' button.

    Uses the provider's default model. Does not touch the database or metering.
    """
    provider = (provider or "").lower()
    if provider not in _BYO_PROVIDERS:
        raise ValueError(f"Unknown provider: {provider!r}")
    _, default_model, service_cls = _BYO_PROVIDERS[provider]
    return service_cls(api_key, default_model)
