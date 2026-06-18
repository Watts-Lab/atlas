"""Route tests for the features blueprint (/api/v1/features).

Real controllers run; only the bunnet DB models are mocked.
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


class _Field:
    """A query-field stand-in whose comparisons return harmless tuples.

    Lets controller code build expressions like ``Features.user == None`` without
    a live database.
    """

    def __eq__(self, other):
        return ("eq", other)


class FakeFeaturesModel:
    """Replacement for the bunnet ``Features`` document used by the controller.

    Provides class-level query fields (``id``, ``user``, ``is_shared``) plus a
    ``find`` that returns a canned result.
    """

    id = _Field()
    user = _Field()
    is_shared = _Field()

    def __init__(self, result):
        self._result = result

    def find(self, *a, **k):
        return FakeQuery(self._result)


def _feature(**overrides):
    """Build a fake feature document with a model_dump matching the controller."""
    data = {
        "id": "feat-1",
        "feature_name": "sample",
        "feature_description": "desc",
        "feature_identifier": "sample",
        "feature_gpt_interface": {"type": "string", "description": "p"},
        "is_shared": False,
        "user": None,
        "version": 1,
    }
    data.update(overrides)
    feat = SimpleNamespace(**data)
    feat.model_dump = lambda: dict(data)
    return feat


# ---------------------------------------------------------------------------
# GET /api/v1/features
# ---------------------------------------------------------------------------


async def test_features_list_returns_features(
    client, auth_headers, patch_auth_user, monkeypatch
):
    # Replace the whole Features model so both its query-fields and find() work.
    monkeypatch.setattr(
        "controllers.features.Features", FakeFeaturesModel([_feature(id="feat-1")])
    )
    monkeypatch.setattr("controllers.features.Or", lambda *a, **k: ("or", a))

    _, response = await client.get("/api/v1/features", headers=auth_headers())

    assert response.status_code == 200
    assert response.json["response"] == "success"
    assert len(response.json["features"]) == 1
    assert response.json["features"][0]["feature_identifier"] == "sample"


# ---------------------------------------------------------------------------
# DELETE /api/v1/features/<feature_id>
# ---------------------------------------------------------------------------


async def test_delete_feature_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    def _raise(*a, **k):
        raise ValueError("nope")

    monkeypatch.setattr("controllers.features.Features.get", _raise)

    _, response = await client.delete(
        "/api/v1/features/missing", headers=auth_headers()
    )
    assert response.status_code == 404
    assert response.json["error"] == "Feature not found."


async def test_delete_feature_forbidden_for_other_user(
    client, auth_headers, patch_auth_user, monkeypatch
):
    # Feature owned by someone other than the caller.
    feat = SimpleNamespace(user="other-user", delete=lambda: None)
    monkeypatch.setattr(
        "controllers.features.Features.get", lambda *a, **k: FakeQuery(feat)
    )

    _, response = await client.delete("/api/v1/features/feat-1", headers=auth_headers())
    assert response.status_code == 403
    assert response.json["error"] == "Forbidden."


async def test_delete_feature_success(
    client, auth_headers, patch_auth_user, monkeypatch
):
    fake_user = patch_auth_user
    deleted = {}
    feat = SimpleNamespace(user=fake_user)
    feat.delete = lambda: deleted.__setitem__("called", True)
    monkeypatch.setattr(
        "controllers.features.Features.get", lambda *a, **k: FakeQuery(feat)
    )

    _, response = await client.delete("/api/v1/features/feat-1", headers=auth_headers())
    assert response.status_code == 200
    assert response.json["response"] == "success"
    assert deleted["called"] is True
