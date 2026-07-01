"""Tests for the user-settings controller (BYO provider keys).

Verifies validation, encryption-at-rest, masking, and removal without touching
the database (``user.save`` is a no-op fake).
"""

import os
from types import SimpleNamespace

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "ejLBwioJGDEHsU2B81jWR_RAQg5DMSglU8b7VDYbnm4=")

from controllers import user_settings as S  # noqa: E402
from utils.crypto import decrypt_secret  # noqa: E402


def _user():
    u = SimpleNamespace(
        email="test@example.com",
        openai_api_key_encrypted=None,
        openai_api_key_prefix=None,
        anthropic_api_key_encrypted=None,
        anthropic_api_key_prefix=None,
        monthly_usd_limit_micros=5_000_000,
        monthly_usd_used_micros=0,
        usage_period_start=None,
        updated_at=None,
    )
    u.save = lambda: None
    return u


def test_set_openai_key_encrypts_and_masks():
    user = _user()
    result = S.set_provider_key(user, "openai", "sk-abcdef1234567890")
    assert result["configured"] is True
    # Stored value is ciphertext, not the raw key.
    assert user.openai_api_key_encrypted is not None
    assert user.openai_api_key_encrypted != "sk-abcdef1234567890"
    # And it decrypts back to the original.
    assert decrypt_secret(user.openai_api_key_encrypted) == "sk-abcdef1234567890"
    # The displayed prefix is masked.
    assert user.openai_api_key_prefix == "sk-...7890"
    assert "7890" in result["prefix"]


def test_set_anthropic_key():
    user = _user()
    S.set_provider_key(user, "anthropic", "sk-ant-abcdef1234")
    assert user.anthropic_api_key_encrypted is not None
    assert decrypt_secret(user.anthropic_api_key_encrypted) == "sk-ant-abcdef1234"


def test_rejects_empty_key():
    with pytest.raises(ValueError):
        S.set_provider_key(_user(), "openai", "   ")


def test_rejects_wrong_prefix():
    with pytest.raises(ValueError):
        S.set_provider_key(_user(), "openai", "totally-not-a-key")


def test_rejects_unknown_provider():
    with pytest.raises(ValueError):
        S.set_provider_key(_user(), "gemini", "sk-whatever")


def test_delete_provider_key_clears_fields():
    user = _user()
    S.set_provider_key(user, "openai", "sk-abcdef1234567890")
    assert user.openai_api_key_encrypted is not None

    result = S.delete_provider_key(user, "openai")
    assert result["configured"] is False
    assert user.openai_api_key_encrypted is None
    assert user.openai_api_key_prefix is None


def test_get_settings_reports_configured_state():
    user = _user()
    S.set_provider_key(user, "openai", "sk-abcdef1234567890")

    settings = S.get_settings(user)
    assert settings["provider_keys"]["openai"]["configured"] is True
    assert settings["provider_keys"]["anthropic"]["configured"] is False
    assert "usage" in settings
    assert settings["usage"]["limit_usd"] == 5.0
