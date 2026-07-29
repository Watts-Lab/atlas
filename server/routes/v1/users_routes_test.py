"""Route tests for the users blueprint (/api/v1/user).

Real controller runs; only the chained bunnet ``Paper`` query is mocked.
"""

from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.route, pytest.mark.asyncio]


class FakeChainQuery:
    """Chainable stand-in for a bunnet find() query."""

    def __init__(self, items):
        self._items = items

    def project(self, *a, **k):
        return self

    def skip(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def count(self):
        return len(self._items)

    def to_list(self):
        return self._items


# ---------------------------------------------------------------------------
# GET /api/v1/user/papers
# ---------------------------------------------------------------------------


async def test_user_papers_returns_paginated_payload(
    client, auth_headers, patch_auth_user, monkeypatch
):
    paper = SimpleNamespace(model_dump=lambda **k: {"id": "paper-1", "title": "A"})
    monkeypatch.setattr(
        "controllers.papers.Paper.find", lambda *a, **k: FakeChainQuery([paper])
    )

    _, response = await client.get(
        "/api/v1/user/papers?page=2&page_size=5", headers=auth_headers()
    )

    assert response.status_code == 200
    assert response.json["page"] == 2
    assert response.json["page_size"] == 5
    assert response.json["total_papers"] == 1
    assert response.json["papers"][0]["id"] == "paper-1"


async def test_user_papers_requires_auth(client):
    # No cookie / API key -> rejected by require_jwt.
    _, response = await client.get("/api/v1/user/papers")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Provider key management (openrouter + test endpoint)
# ---------------------------------------------------------------------------


async def test_set_openrouter_key(client, auth_headers, patch_auth_user, monkeypatch):
    captured = {}
    monkeypatch.setattr(
        "routes.v1.users.set_provider_key",
        lambda user, provider, raw_key: captured.update(
            provider=provider, key=raw_key
        )
        or {"provider": provider, "configured": True, "prefix": "sk-...abcd"},
    )

    _, response = await client.put(
        "/api/v1/user/provider-keys/openrouter",
        json={"api_key": "sk-or-abc123"},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert captured["provider"] == "openrouter"
    assert response.json["configured"] is True


async def test_test_provider_key_success(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "routes.v1.users.test_provider_key",
        lambda user, provider: {"provider": provider, "ok": True, "message": "ok"},
    )
    _, response = await client.post(
        "/api/v1/user/provider-keys/openai/test", headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.json["ok"] is True


async def test_test_provider_key_invalid(
    client, auth_headers, patch_auth_user, monkeypatch
):
    def _raise(user, provider):
        raise ValueError("The openai key was rejected by the provider.")

    monkeypatch.setattr("routes.v1.users.test_provider_key", _raise)
    _, response = await client.post(
        "/api/v1/user/provider-keys/openai/test", headers=auth_headers()
    )
    assert response.status_code == 400
    assert response.json["error"] is True


async def test_test_provider_key_rejects_unknown_provider(
    client, auth_headers, patch_auth_user
):
    _, response = await client.post(
        "/api/v1/user/provider-keys/bogus/test", headers=auth_headers()
    )
    assert response.status_code == 400
