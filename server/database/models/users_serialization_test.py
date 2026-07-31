"""Model-layer security guarantee: the User document must never serialize its
sensitive fields, at any nesting depth, through pydantic model_dump/json.

This is the last line of defense against credential leaks like the one where a
project's nested feature.user exposed magic_link / encrypted API keys. Even if a
future endpoint dumps a model that links to User, these fields stay hidden.
"""

from datetime import UTC, datetime

import pytest

from database.models.users import User

pytestmark = [pytest.mark.unit]

# Fields that must NEVER appear in a serialized User.
_SENSITIVE_FIELDS = [
    "magic_link",
    "magic_link_expired",
    "magic_link_expiration_date",
    "webauthn_user_handle",
    "openai_api_key_encrypted",
    "openai_api_key_prefix",
    "anthropic_api_key_encrypted",
    "anthropic_api_key_prefix",
    "openrouter_api_key_encrypted",
    "openrouter_api_key_prefix",
    "monthly_usd_limit_micros",
    "monthly_usd_used_micros",
    "usage_period_start",
    "recently_viewed_projects",
]


def _user() -> User:
    return User.model_construct(
        email="victim@example.com",
        magic_link="SECRET-LOGIN-TOKEN",
        magic_link_expired=False,
        magic_link_expiration_date=datetime.now(UTC),
        webauthn_user_handle="handle-xyz",
        openai_api_key_encrypted="ENC-OPENAI",
        openrouter_api_key_encrypted="ENC-OR",
        openrouter_api_key_prefix="sk-or-...ab",
        monthly_usd_limit_micros=5_000_000,
        monthly_usd_used_micros=10_075,
        recently_viewed_projects=[{"project_id": "p1"}],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def test_model_dump_excludes_all_sensitive_fields():
    dumped = _user().model_dump()
    for field in _SENSITIVE_FIELDS:
        assert field not in dumped, f"{field} leaked via model_dump"
    # Non-sensitive fields are still present.
    assert dumped["email"] == "victim@example.com"


def test_model_dump_json_excludes_secrets():
    blob = _user().model_dump_json()
    for secret in (
        "SECRET-LOGIN-TOKEN",
        "ENC-OPENAI",
        "ENC-OR",
        "handle-xyz",
        "sk-or-...ab",
    ):
        assert secret not in blob, f"leaked: {secret}"
    assert "victim@example.com" in blob


def test_all_sensitive_fields_are_marked_exclude():
    # Guards against a new sensitive field being added without exclude=True.
    for field in _SENSITIVE_FIELDS:
        assert User.model_fields[field].exclude is True, (
            f"{field} must be Field(exclude=True)"
        )
