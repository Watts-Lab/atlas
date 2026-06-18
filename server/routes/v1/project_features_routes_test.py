"""Route tests for the project-features endpoints.

Routes live under /api/v1/projects/<project_id>/features and are served by the
projects blueprint. Real controllers run; only the ``Project``/``Features`` DB
models are mocked.
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


class FakeFeaturesModel:
    """Replacement for the bunnet ``Features`` document.

    Exposes a class-level ``id`` query field plus a ``find`` returning a canned
    list, so the controller's ``In(Features.id, ...)`` expression works offline.
    """

    id = "features.id"

    def __init__(self, result):
        self._result = result

    def find(self, *a, **k):
        return FakeQuery(self._result)


# ---------------------------------------------------------------------------
# GET /api/v1/projects/<project_id>/features
# ---------------------------------------------------------------------------


async def test_project_features_get(client, auth_headers, patch_auth_user, monkeypatch):
    fake_db = {
        "project-1": SimpleNamespace(
            features=[
                SimpleNamespace(
                    id="feat-1",
                    feature_name="sample_feature",
                    feature_description="A fake feature",
                    feature_identifier="sample_feature",
                    user=None,
                )
            ]
        )
    }

    def _project_get(project_id, fetch_links=True):
        return FakeQuery(fake_db.get(project_id))

    monkeypatch.setattr("controllers.features.Project.get", _project_get)

    _, response = await client.get(
        "/api/v1/projects/project-1/features", headers=auth_headers()
    )

    assert response.status_code == 200
    assert response.json["message"] == "Project feature list."
    assert len(response.json["features"]) == 1
    assert response.json["features"][0]["feature_identifier"] == "sample_feature"

    # Mutating the mocked DB is reflected on the next call.
    fake_db["project-1"].features.append(
        SimpleNamespace(
            id="feat-2",
            feature_name="another_feature",
            feature_description="Added later",
            feature_identifier="another_feature",
            user=SimpleNamespace(id="user-1"),
        )
    )

    _, response2 = await client.get(
        "/api/v1/projects/project-1/features", headers=auth_headers()
    )
    assert response2.status_code == 200
    assert len(response2.json["features"]) == 2


async def test_project_features_get_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "controllers.features.Project.get",
        lambda *a, **k: FakeQuery(None),
    )

    _, response = await client.get(
        "/api/v1/projects/missing-project/features", headers=auth_headers()
    )

    assert response.status_code == 404
    assert response.json["error"] == "Project not found."


# ---------------------------------------------------------------------------
# POST /api/v1/projects/<project_id>/features  (replace project feature set)
# ---------------------------------------------------------------------------


async def test_project_features_post_updates_feature_set(
    client, auth_headers, patch_auth_user, monkeypatch
):
    saved = {}
    project = SimpleNamespace(features=[])
    project.save = lambda: saved.__setitem__("called", True)
    monkeypatch.setattr(
        "controllers.features.Project.get", lambda *a, **k: FakeQuery(project)
    )

    feature_docs = [SimpleNamespace(id="feat-1"), SimpleNamespace(id="feat-2")]
    monkeypatch.setattr(
        "controllers.features.Features", FakeFeaturesModel(feature_docs)
    )
    # Neutralize the DB query operators so plain string ids can be used.
    monkeypatch.setattr("controllers.features.In", lambda field, values: ("in", values))
    monkeypatch.setattr("controllers.features.PydanticObjectId", lambda value: value)

    _, response = await client.post(
        "/api/v1/projects/p1/features",
        json={"feature_ids": ["feat-1", "feat-2"]},
        headers=auth_headers(),
    )

    assert response.status_code == 201
    assert response.json["message"] == "Feature updated."
    # Real controller assigned the resolved docs and persisted.
    assert project.features == feature_docs
    assert saved["called"] is True


async def test_project_features_post_rejects_unknown_features(
    client, auth_headers, patch_auth_user, monkeypatch
):
    project = SimpleNamespace(features=[], save=lambda: None)
    monkeypatch.setattr(
        "controllers.features.Project.get", lambda *a, **k: FakeQuery(project)
    )
    # Only one doc resolves even though two ids were requested.
    monkeypatch.setattr(
        "controllers.features.Features",
        FakeFeaturesModel([SimpleNamespace(id="feat-1")]),
    )
    monkeypatch.setattr("controllers.features.In", lambda field, values: ("in", values))
    monkeypatch.setattr("controllers.features.PydanticObjectId", lambda value: value)

    _, response = await client.post(
        "/api/v1/projects/p1/features",
        json={"feature_ids": ["feat-1", "missing"]},
        headers=auth_headers(),
    )

    assert response.status_code == 404
    assert response.json["error"] == "Some features not found."
