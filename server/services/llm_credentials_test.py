"""Tests for LLM credential resolution and monthly USD-budget metering.

These are the robustness core of the BYO-key feature: they lock in the invariant
that a user's own key is never metered and the platform key always is, and that
USD budget/reset accounting behaves correctly. DB writes are stubbed so the logic
can be exercised without MongoDB.
"""

import os
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

# Fernet key required before importing crypto (used transitively).
os.environ.setdefault("ENCRYPTION_KEY", "ejLBwioJGDEHsU2B81jWR_RAQg5DMSglU8b7VDYbnm4=")

from services import llm_credentials as L  # noqa: E402
from services.model_pricing import MICROS_PER_USD, cost_micros  # noqa: E402
from utils.crypto import encrypt_secret  # noqa: E402


def _user(**overrides):
    base = dict(
        id="u1",
        email="test@example.com",
        openai_api_key_encrypted=None,
        anthropic_api_key_encrypted=None,
        monthly_usd_limit_micros=5_000_000,  # $5.00
        monthly_usd_used_micros=0,
        usage_period_start=None,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.fixture(autouse=True)
def _no_db(monkeypatch):
    """Replace the User model with a fake so tests never touch Mongo.

    Building the real query ``User.find_one(User.id == user.id)`` requires a
    bunnet-initialized DB (for the ``User.id`` field expression), which we don't
    have in unit tests. Swapping in a fake model whose ``id`` is an ordinary
    attribute and whose ``find_one().update().run()`` is a no-op lets us exercise
    the pure accounting logic in isolation.
    """
    monkeypatch.setattr(L, "_reset_period", lambda user: None)

    fake_query = SimpleNamespace(
        update=lambda *a, **k: SimpleNamespace(run=lambda: None)
    )
    fake_user_model = SimpleNamespace(
        id="id-field",
        monthly_usd_used_micros="used-field",
        usage_period_start="period-field",
        monthly_usd_limit_micros="limit-field",
        updated_at="updated-field",
        find_one=lambda *a, **k: fake_query,
    )
    monkeypatch.setattr(L, "User", fake_user_model)


# ---------------------------------------------------------------------------
# resolve_llm_credentials
# ---------------------------------------------------------------------------
def test_platform_key_used_when_no_byo(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-platform")
    cred = L.resolve_llm_credentials(_user(), "openai")
    assert cred.api_key == "sk-platform"
    assert cred.is_byo is False


def test_byo_key_preferred_and_not_metered(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-platform")
    user = _user(openai_api_key_encrypted=encrypt_secret("sk-user"))
    cred = L.resolve_llm_credentials(user, "openai")
    assert cred.api_key == "sk-user"
    assert cred.is_byo is True


def test_missing_platform_key_raises(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(L.MissingPlatformKeyError):
        L.resolve_llm_credentials(_user(), "openai")


def test_corrupt_byo_key_falls_back_to_platform(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-platform")
    user = _user(openai_api_key_encrypted="not-valid-ciphertext")
    cred = L.resolve_llm_credentials(user, "openai")
    assert cred.api_key == "sk-platform"
    assert cred.is_byo is False


# ---------------------------------------------------------------------------
# budget checks (USD)
# ---------------------------------------------------------------------------
def test_check_budget_passes_when_remaining():
    L.check_budget(
        _user(
            monthly_usd_used_micros=1_000_000,
            monthly_usd_limit_micros=5_000_000,
            usage_period_start=L._current_period_start(),
        )
    )


def test_check_budget_raises_when_exhausted():
    user = _user(
        monthly_usd_used_micros=5_000_000,
        monthly_usd_limit_micros=5_000_000,
        usage_period_start=L._current_period_start(),
    )
    with pytest.raises(L.BudgetExceededError):
        L.check_budget(user)


def test_resolve_and_check_skips_budget_for_byo(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-platform")
    user = _user(
        openai_api_key_encrypted=encrypt_secret("sk-user"),
        monthly_usd_used_micros=999_999_999,
        usage_period_start=L._current_period_start(),
    )
    cred = L.resolve_and_check(user, "openai")
    assert cred.is_byo is True


def test_resolve_and_check_enforces_budget_for_platform(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-platform")
    user = _user(
        monthly_usd_used_micros=5_000_000,
        monthly_usd_limit_micros=5_000_000,
        usage_period_start=L._current_period_start(),
    )
    with pytest.raises(L.BudgetExceededError):
        L.resolve_and_check(user, "openai")


# ---------------------------------------------------------------------------
# record_usage (USD cost)
# ---------------------------------------------------------------------------
def test_record_usage_noop_for_byo():
    user = _user(
        monthly_usd_used_micros=1_000_000,
        usage_period_start=L._current_period_start(),
    )
    cred = L.LlmCredentials(provider="openai", api_key="sk-user", is_byo=True)
    charged = L.record_usage(
        user, cred, model="gpt-5.4-mini", prompt_tokens=1000, completion_tokens=1000
    )
    assert charged == 0
    assert user.monthly_usd_used_micros == 1_000_000  # unchanged


def test_record_usage_charges_platform_by_model_price():
    user = _user(
        monthly_usd_used_micros=0, usage_period_start=L._current_period_start()
    )
    cred = L.LlmCredentials(provider="openai", api_key="sk-platform", is_byo=False)
    # gpt-5.4-mini: $0.75/1M input, $4.5/1M output.
    # 1M input + 1M output = 0.75 + 4.5 = $5.25 = 5_250_000 micros.
    charged = L.record_usage(
        user,
        cred,
        model="gpt-5.4-mini",
        prompt_tokens=1_000_000,
        completion_tokens=1_000_000,
    )
    assert charged == 5_250_000
    assert user.monthly_usd_used_micros == 5_250_000


def test_record_usage_unknown_model_charges_zero():
    user = _user(
        monthly_usd_used_micros=10, usage_period_start=L._current_period_start()
    )
    cred = L.LlmCredentials(provider="openai", api_key="sk-platform", is_byo=False)
    charged = L.record_usage(
        user, cred, model="totally-unknown", prompt_tokens=1000, completion_tokens=1000
    )
    assert charged == 0
    assert user.monthly_usd_used_micros == 10


# ---------------------------------------------------------------------------
# pricing math
# ---------------------------------------------------------------------------
def test_cost_micros_small_call():
    # 16,000 input + 2,000 output on gpt-5.4-mini:
    # 16000 * 0.75 + 2000 * 4.5 = 12000 + 9000 = 21000 micros = $0.021
    micros = cost_micros("gpt-5.4-mini", 16_000, 2_000)
    assert micros == 21_000
    assert round(micros / MICROS_PER_USD, 6) == 0.021


def test_cost_micros_gpt55():
    # gpt-5.5: $5/1M input, $30/1M output.
    micros = cost_micros("gpt-5.5", 1_000_000, 1_000_000)
    assert micros == 35_000_000  # $35


# ---------------------------------------------------------------------------
# period helpers
# ---------------------------------------------------------------------------
def test_is_same_period():
    assert L._is_same_period(L._current_period_start()) is True
    assert L._is_same_period(None) is False
    assert L._is_same_period(datetime(2000, 1, 1, tzinfo=UTC)) is False


# ---------------------------------------------------------------------------
# usage snapshot (USD)
# ---------------------------------------------------------------------------
def test_get_usage_snapshot_usd():
    user = _user(
        monthly_usd_used_micros=1_200_000,
        monthly_usd_limit_micros=5_000_000,
        usage_period_start=L._current_period_start(),
    )
    snap = L.get_usage(user)
    assert snap["currency"] == "usd"
    assert snap["limit_usd"] == 5.0
    assert snap["used_usd"] == 1.2
    assert snap["remaining_usd"] == 3.8
    assert snap["has_openai_key"] is False


def test_get_usage_handles_legacy_user_without_fields():
    legacy = SimpleNamespace(id="old", email="old@example.com")
    snap = L.get_usage(legacy)
    assert snap["used_usd"] == 0
    assert snap["remaining_usd"] == 0
    assert snap["has_openai_key"] is False
