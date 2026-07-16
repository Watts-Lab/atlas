"""Unit tests for security-critical WebAuthn controller logic that does not
require a real authenticator: challenge single-use consumption and the
sign-count clone-detection rule.
"""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.unit]


# ---------------------------------------------------------------------------
# challenge_store.consume_challenge
# ---------------------------------------------------------------------------


class _FakeCollection:
    """In-memory stand-in for the pymongo collection used by the store."""

    def __init__(self, docs):
        # docs: dict keyed by ceremony_id -> raw dict
        self._docs = docs

    def find_one_and_delete(self, query):
        cid = query["ceremony_id"]
        return self._docs.pop(cid, None)


def _raw(ceremony_id, ceremony_type, *, expired=False, user_email=None):
    now = datetime.now(UTC)
    return {
        "ceremony_id": ceremony_id,
        "challenge": "Y2hhbGxlbmdl",
        "ceremony_type": ceremony_type,
        "user_email": user_email,
        "created_at": now,
        "expires_at": now - timedelta(seconds=1) if expired else now + timedelta(minutes=5),
    }


def test_consume_challenge_is_single_use(monkeypatch):
    from controllers.utils import challenge_store
    from database.models.webauthn_challenge import (
        CEREMONY_AUTHENTICATION,
        WebAuthnChallenge,
    )

    store = {"cid": _raw("cid", CEREMONY_AUTHENTICATION)}
    monkeypatch.setattr(
        WebAuthnChallenge, "get_motor_collection", classmethod(lambda cls: _FakeCollection(store))
    )

    first = challenge_store.consume_challenge("cid", ceremony_type=CEREMONY_AUTHENTICATION)
    assert first is not None
    # Second attempt: the doc was deleted, so it must be gone (replay blocked).
    second = challenge_store.consume_challenge("cid", ceremony_type=CEREMONY_AUTHENTICATION)
    assert second is None


def test_consume_challenge_rejects_wrong_type(monkeypatch):
    from controllers.utils import challenge_store
    from database.models.webauthn_challenge import (
        CEREMONY_AUTHENTICATION,
        CEREMONY_REGISTRATION,
        WebAuthnChallenge,
    )

    store = {"cid": _raw("cid", CEREMONY_REGISTRATION)}
    monkeypatch.setattr(
        WebAuthnChallenge, "get_motor_collection", classmethod(lambda cls: _FakeCollection(store))
    )

    result = challenge_store.consume_challenge(
        "cid", ceremony_type=CEREMONY_AUTHENTICATION
    )
    assert result is None


def test_consume_challenge_rejects_expired(monkeypatch):
    from controllers.utils import challenge_store
    from database.models.webauthn_challenge import (
        CEREMONY_AUTHENTICATION,
        WebAuthnChallenge,
    )

    store = {"cid": _raw("cid", CEREMONY_AUTHENTICATION, expired=True)}
    monkeypatch.setattr(
        WebAuthnChallenge, "get_motor_collection", classmethod(lambda cls: _FakeCollection(store))
    )

    result = challenge_store.consume_challenge(
        "cid", ceremony_type=CEREMONY_AUTHENTICATION
    )
    assert result is None


def test_consume_challenge_missing_id_returns_none():
    from controllers.utils import challenge_store

    assert challenge_store.consume_challenge("", ceremony_type="authentication") is None
