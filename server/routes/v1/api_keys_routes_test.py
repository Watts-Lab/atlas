"""Route tests for the api_keys blueprint (/api/v1/api-keys).

These endpoints use ``require_session`` (JWT cookie only — API keys are
rejected). Real controllers run; only the ``ApiKey`` DB model is mocked.
"""

from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.route, pytest.mark.asyncio]


class FakeQuery:
    def __init__(self, value):
        self._value = value

    def run(self):
        return self._value

    def to_list(self):
        return self._value

    def count(self):
        return len(self._value) if isinstance(self._value, list) else self._value


class _Field:
    """Query-field stand-in supporting ``==`` and a nested ``.id`` attribute."""

    def __init__(self):
        self.id = self

    def __eq__(self, other):
        return ("eq", other)


class FakeApiKeyModel:
    """Replacement for the bunnet ``ApiKey`` document.

    Provides class-level query fields (``user``, ``is_active``), a ``find`` that
    returns a canned result, and optional construction (``ApiKey(**kwargs)``)
    delegated to ``factory`` so the controller can run offline.
    """

    user = _Field()
    is_active = _Field()

    def __init__(self, find_result, factory=None):
        self._find_result = find_result
        self._factory = factory

    def find(self, *a, **k):
        return FakeQuery(self._find_result)

    def __call__(self, **kwargs):
        if self._factory is None:
            raise AssertionError("ApiKey construction not expected in this test")
        return self._factory(**kwargs)


# ---------------------------------------------------------------------------
# GET /api/v1/api-keys
# ---------------------------------------------------------------------------


async def test_list_api_keys(client, auth_headers, patch_auth_user, monkeypatch):
    key = SimpleNamespace(
        id="key-1",
        name="CI",
        prefix="atlas_a3",
        is_active=True,
        created_at=None,
        last_used_at=None,
    )
    monkeypatch.setattr("controllers.api_keys.ApiKey", FakeApiKeyModel([key]))

    _, response = await client.get("/api/v1/api-keys/", headers=auth_headers())

    assert response.status_code == 200
    assert len(response.json["api_keys"]) == 1
    listed = response.json["api_keys"][0]
    assert listed["name"] == "CI"
    # The hash is never exposed.
    assert "key_hash" not in listed


# ---------------------------------------------------------------------------
# POST /api/v1/api-keys
# ---------------------------------------------------------------------------


async def test_create_api_key_requires_name(client, auth_headers, patch_auth_user):
    _, response = await client.post(
        "/api/v1/api-keys/", json={"name": "  "}, headers=auth_headers()
    )
    assert response.status_code == 400
    assert "name" in response.json["message"]


async def test_create_api_key_returns_raw_key_once(
    client, auth_headers, patch_auth_user, monkeypatch
):
    created = {}

    def _api_key_factory(**kwargs):
        doc = SimpleNamespace(id="key-new", **kwargs)
        doc.create = lambda: created.update(name=doc.name, created=True)
        return doc

    # DB boundary: a fake model that reports no existing active keys (find -> [])
    # and captures the document the controller constructs and creates.
    monkeypatch.setattr(
        "controllers.api_keys.ApiKey", FakeApiKeyModel([], factory=_api_key_factory)
    )

    _, response = await client.post(
        "/api/v1/api-keys/", json={"name": "Production"}, headers=auth_headers()
    )

    assert response.status_code == 201
    api_key = response.json["api_key"]
    assert api_key["name"] == "Production"
    # The raw key is returned exactly once and is the real generated format.
    assert api_key["key"].startswith("atlas_")
    assert created["created"] is True


# ---------------------------------------------------------------------------
# DELETE /api/v1/api-keys/<key_id>
# ---------------------------------------------------------------------------


async def test_revoke_api_key_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "controllers.api_keys.ApiKey.get", lambda *a, **k: FakeQuery(None)
    )
    # Provide a valid-looking ObjectId so the controller reaches the lookup.
    _, response = await client.delete(
        "/api/v1/api-keys/507f1f77bcf86cd799439011", headers=auth_headers()
    )
    assert response.status_code == 404
    assert response.json["error"] is True


async def test_api_keys_reject_api_key_auth(client, monkeypatch):
    # require_session must reject X-API-Key even if it is otherwise valid.
    _, response = await client.get(
        "/api/v1/api-keys/", headers={"X-API-Key": "atlas_whatever"}
    )
    assert response.status_code == 403
