"""Tests for the LLM resolver: provider selection + metering decision."""

from types import SimpleNamespace

import pytest
from database.models.projects import ProjectLLMConfig
from services.llm import resolver as R
from services.llm.anthropic_service import AnthropicService
from services.llm.openai_service import OpenAIService
from services.llm.openrouter_service import OpenRouterService
from utils.crypto import encrypt_secret

pytestmark = [pytest.mark.unit]


def _user(**kwargs):
    base = dict(
        email="u@example.com",
        openai_api_key_encrypted=None,
        anthropic_api_key_encrypted=None,
        openrouter_api_key_encrypted=None,
        monthly_usd_used_micros=0,
        monthly_usd_limit_micros=5_000_000,
        usage_period_start=None,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_atlas_uses_platform_key_and_is_metered(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-platform")
    # Budget check should pass; patch it to a no-op to isolate resolution.
    monkeypatch.setattr(R, "check_budget", lambda user: None)

    resolved = R.resolve_llm(_user(), ProjectLLMConfig(provider="atlas"))

    assert isinstance(resolved.service, OpenAIService)
    assert resolved.is_byo is False
    assert resolved.metered is True


def test_atlas_missing_platform_key_raises(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(R.MissingPlatformKeyError):
        R.resolve_llm(_user(), ProjectLLMConfig(provider="atlas"))


def test_byo_openrouter_is_not_metered():
    user = _user(openrouter_api_key_encrypted=encrypt_secret("sk-or-abc"))
    resolved = R.resolve_llm(user, ProjectLLMConfig(provider="openrouter"))
    assert isinstance(resolved.service, OpenRouterService)
    assert resolved.is_byo is True
    assert resolved.metered is False


def test_byo_openai_and_anthropic():
    u1 = _user(openai_api_key_encrypted=encrypt_secret("sk-x"))
    r1 = R.resolve_llm(u1, ProjectLLMConfig(provider="openai"))
    assert isinstance(r1.service, OpenAIService) and r1.is_byo

    u2 = _user(anthropic_api_key_encrypted=encrypt_secret("sk-ant-x"))
    r2 = R.resolve_llm(u2, ProjectLLMConfig(provider="anthropic"))
    assert isinstance(r2.service, AnthropicService) and r2.is_byo


def test_byo_provider_without_key_raises():
    with pytest.raises(R.ProviderKeyMissingError):
        R.resolve_llm(_user(), ProjectLLMConfig(provider="openrouter"))


def test_custom_model_is_respected():
    user = _user(openrouter_api_key_encrypted=encrypt_secret("sk-or-abc"))
    resolved = R.resolve_llm(
        user, ProjectLLMConfig(provider="openrouter", model="anthropic/claude-x")
    )
    assert resolved.service.model == "anthropic/claude-x"


def test_build_test_service():
    svc = R.build_test_service("openai", "sk-test")
    assert isinstance(svc, OpenAIService)
    with pytest.raises(ValueError):
        R.build_test_service("bogus", "x")
