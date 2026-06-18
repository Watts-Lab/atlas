"""Route tests for the auth blueprint (/api/v1/auth).

These exercise the real login/validation controllers end to end. Only the
external boundaries are mocked: the ``User`` DB model and the email senders.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest

pytestmark = [pytest.mark.route, pytest.mark.asyncio]

UTC = timezone.utc


class FakeUserQuery:
    """Mimic ``User.find_one(...)`` returning a ``.run()``-able query."""

    def __init__(self, user):
        self._user = user

    def run(self):
        return self._user


def _install_user_model(monkeypatch, *, existing_user=None, capture=None):
    """Replace ``controllers.login.User`` with a fake DB model.

    ``capture`` collects side effects (created/saved users) so tests can assert
    that the controller actually persisted something.
    """
    capture = capture if capture is not None else {}

    def _find_one(*_args, **_kwargs):
        return FakeUserQuery(existing_user)

    def _new_user(**kwargs):
        created = SimpleNamespace(**kwargs)
        created.create = lambda: capture.__setitem__("created", created)
        created.save = lambda: capture.__setitem__("saved", created)
        return created

    monkeypatch.setattr("controllers.login.User", _UserShim(_find_one, _new_user))
    return capture


class _UserShim:
    """Callable stand-in for the ``User`` document class."""

    def __init__(self, find_one, factory):
        self.find_one = find_one
        self._factory = factory

        class _FakeEmail:
            def __eq__(self, other):
                return ("email", other)

        self.email = _FakeEmail()

    def __call__(self, **kwargs):
        return self._factory(**kwargs)


@pytest.fixture
def silence_email(monkeypatch):
    """Stop the controllers from sending real emails."""
    sent = {}
    monkeypatch.setattr(
        "controllers.login.send_magic_link",
        lambda email, token: sent.update(magic_link=(email, token)),
    )
    monkeypatch.setattr(
        "controllers.login.send_sdk_login",
        lambda email, token: sent.update(sdk=(email, token)),
    )
    return sent


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------


async def test_login_requires_email(client):
    _, response = await client.post("/api/v1/auth/login", json={})
    assert response.status_code == 400
    assert response.json["error"] == "Email is required."


async def test_login_existing_user_sends_magic_link(client, monkeypatch, silence_email):
    user = SimpleNamespace(
        email="test@example.com",
        magic_link=None,
        magic_link_expired=None,
        magic_link_expiration_date=None,
        updated_at=None,
    )
    capture = {}
    user.save = lambda: capture.__setitem__("saved", user)
    _install_user_model(monkeypatch, existing_user=user)

    _, response = await client.post(
        "/api/v1/auth/login", json={"email": "test@example.com"}
    )

    assert response.status_code == 200
    assert "Magic link" in response.json["message"]
    # Side effects: a magic link was issued and emailed to the user.
    assert user.magic_link is not None
    assert silence_email["magic_link"][0] == "test@example.com"


async def test_login_new_user_is_created(client, monkeypatch, silence_email):
    capture = _install_user_model(monkeypatch, existing_user=None)

    _, response = await client.post(
        "/api/v1/auth/login", json={"email": "new@example.com"}
    )

    assert response.status_code == 200
    assert "User created" in response.json["message"]
    # The real controller created and persisted a new user.
    assert "created" in capture
    assert capture["created"].email == "new@example.com"
    assert silence_email["magic_link"][0] == "new@example.com"


async def test_login_sdk_sends_sdk_token(client, monkeypatch, silence_email):
    user = SimpleNamespace(
        email="dev@example.com",
        magic_link=None,
        magic_link_expired=None,
        magic_link_expiration_date=None,
        updated_at=None,
    )
    user.save = lambda: None
    _install_user_model(monkeypatch, existing_user=user)

    _, response = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "client_type": "sdk"},
    )

    assert response.status_code == 200
    assert "SDK token" in response.json["message"]
    assert silence_email["sdk"][0] == "dev@example.com"


# ---------------------------------------------------------------------------
# POST /api/v1/auth/logout
# ---------------------------------------------------------------------------


async def test_logout_clears_jwt_cookie(client):
    _, response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json["message"] == "Logged out"
    # Cookie is expired (max-age 0).
    assert "jwt=" in response.headers.get("set-cookie", "")


# ---------------------------------------------------------------------------
# POST /api/v1/auth/validate
# ---------------------------------------------------------------------------


async def test_validate_requires_email_and_token(client):
    _, response = await client.post("/api/v1/auth/validate", json={"email": "a@b.com"})
    assert response.status_code == 400
    assert response.json["error"] == "Email and token are required."


async def test_validate_user_not_found(client, monkeypatch):
    _install_user_model(monkeypatch, existing_user=None)
    _, response = await client.post(
        "/api/v1/auth/validate",
        json={"email": "missing@example.com", "magic_link": "tok"},
    )
    assert response.status_code == 404
    assert response.json["error"] == "User not found."


async def test_validate_success_sets_cookie_and_marks_link_used(client, monkeypatch):
    user = SimpleNamespace(
        email="test@example.com",
        magic_link="valid-token",
        magic_link_expired=False,
        magic_link_expiration_date=datetime.now(UTC) + timedelta(hours=1),
        number_of_tokens=5000,
        updated_at=None,
    )
    saved = {}
    user.save = lambda: saved.__setitem__("called", True)
    _install_user_model(monkeypatch, existing_user=user)

    _, response = await client.post(
        "/api/v1/auth/validate",
        json={"email": "test@example.com", "magic_link": "valid-token"},
    )

    assert response.status_code == 200
    assert response.json["message"] == "Magic link validated."
    assert response.json["credits"] == 5000
    # Magic link is consumed (one-time use) and persisted.
    assert user.magic_link_expired is True
    assert saved.get("called") is True
    assert "jwt=" in response.headers.get("set-cookie", "")


async def test_validate_rejects_wrong_token(client, monkeypatch):
    user = SimpleNamespace(
        email="test@example.com",
        magic_link="real-token",
        magic_link_expired=False,
        magic_link_expiration_date=datetime.now(UTC) + timedelta(hours=1),
        number_of_tokens=1,
        updated_at=None,
    )
    user.save = lambda: None
    _install_user_model(monkeypatch, existing_user=user)

    _, response = await client.post(
        "/api/v1/auth/validate",
        json={"email": "test@example.com", "magic_link": "wrong-token"},
    )

    assert response.status_code == 400
    assert response.json["error"] == "Invalid magic link."


# ---------------------------------------------------------------------------
# GET /api/v1/auth/check
# ---------------------------------------------------------------------------


async def test_check_valid_token(client, monkeypatch):
    # JWT decoding is an external boundary here; the route logic we care about is
    # "valid token -> look up user -> report credits".
    monkeypatch.setattr(
        "controllers.login.jwt.decode",
        lambda *args, **kwargs: {"email": "test@example.com"},
    )
    user = SimpleNamespace(email="test@example.com", number_of_tokens=42)
    _install_user_model(monkeypatch, existing_user=user)

    _, response = await client.get(
        "/api/v1/auth/check", headers={"cookie": "jwt=any-token"}
    )

    assert response.status_code == 200
    assert response.json["loggedIn"] is True
    assert response.json["credits"] == 42


async def test_check_invalid_token(client, monkeypatch):
    def _raise(*_args, **_kwargs):
        raise jwt.InvalidTokenError()

    monkeypatch.setattr("controllers.login.jwt.decode", _raise)
    _, response = await client.get(
        "/api/v1/auth/check", headers={"cookie": "jwt=not-a-valid-jwt"}
    )
    assert response.status_code == 400
    assert response.json["error"] == "Invalid token."
