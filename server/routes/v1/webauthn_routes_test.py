"""Route tests for the WebAuthn blueprint (/api/v1/webauthn).

These focus on the route wiring and the security-sensitive branches that don't
require a real authenticator: auth guards on the management/registration
endpoints, and generic-failure behaviour on the public authentication
endpoints. The cryptographic verification itself (``verify_*_response``) is an
external boundary and is monkeypatched where a success path is exercised.
"""

from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.route, pytest.mark.asyncio]


# ---------------------------------------------------------------------------
# Registration + management endpoints require a logged-in session
# ---------------------------------------------------------------------------


async def test_register_options_requires_session(client):
    _, response = await client.post("/api/v1/webauthn/register/options")
    assert response.status_code == 401


async def test_register_options_rejects_api_key(client):
    # require_session must reject API keys (a leaked key cannot enrol passkeys).
    _, response = await client.post(
        "/api/v1/webauthn/register/options",
        headers={"X-API-Key": "atlas_deadbeef"},
    )
    assert response.status_code == 403


async def test_list_passkeys_requires_session(client):
    _, response = await client.get("/api/v1/webauthn/passkeys")
    assert response.status_code == 401


async def test_delete_passkey_requires_session(client):
    _, response = await client.delete("/api/v1/webauthn/passkeys/abc123")
    assert response.status_code == 401


async def test_list_passkeys_returns_user_passkeys(
    client, monkeypatch, auth_headers, patch_auth_user
):
    monkeypatch.setattr(
        "controllers.webauthn.list_passkeys",
        lambda user: [{"id": "1", "device_name": "MacBook"}],
    )
    # The route imports list_passkeys at module load, so patch there too.
    monkeypatch.setattr(
        "routes.v1.webauthn.list_passkeys",
        lambda user: [{"id": "1", "device_name": "MacBook"}],
    )

    _, response = await client.get(
        "/api/v1/webauthn/passkeys", headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.json["passkeys"][0]["device_name"] == "MacBook"


# ---------------------------------------------------------------------------
# Authentication endpoints are public and fail generically
# ---------------------------------------------------------------------------


async def test_authenticate_options_is_public(client, monkeypatch):
    from sanic import json as json_response

    monkeypatch.setattr(
        "routes.v1.webauthn.authentication_options",
        lambda: json_response({"challenge": "abc"}, status=200),
    )
    _, response = await client.post("/api/v1/webauthn/authenticate/options")
    assert response.status_code == 200
    assert response.json["challenge"] == "abc"


async def test_authenticate_verify_rejects_missing_ceremony(client, monkeypatch):
    # No ceremony cookie and no stored challenge -> generic 401, no info leak.
    monkeypatch.setattr(
        "controllers.webauthn.consume_challenge",
        lambda ceremony_id, ceremony_type: None,
    )
    _, response = await client.post(
        "/api/v1/webauthn/authenticate/verify",
        json={"id": "whatever", "response": {}},
    )
    assert response.status_code == 401
    assert response.json["error"] is True
    # Message must be generic (no account/credential existence leak).
    assert response.json["message"] == "Passkey authentication failed."


async def test_authenticate_verify_unknown_credential_is_generic(
    client, monkeypatch
):
    # Valid-looking challenge but the credential id isn't in the DB.
    monkeypatch.setattr(
        "controllers.webauthn.consume_challenge",
        lambda ceremony_id, ceremony_type: SimpleNamespace(
            challenge="abc", ceremony_type=ceremony_type, user_email=None
        ),
    )

    class _Query:
        def run(self):
            return None

    monkeypatch.setattr(
        "controllers.webauthn.Passkey",
        SimpleNamespace(
            credential_id=SimpleNamespace(__eq__=lambda self, o: ("credential_id", o)),
            find_one=lambda *a, **k: _Query(),
        ),
    )

    _, response = await client.post(
        "/api/v1/webauthn/authenticate/verify",
        json={"id": "unknown", "response": {"userHandle": "x"}},
        headers={"cookie": "webauthn_ceremony=cid"},
    )
    assert response.status_code == 401
    assert response.json["message"] == "Passkey authentication failed."
