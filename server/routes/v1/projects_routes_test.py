"""Route tests for the projects blueprint (/api/v1/projects).

The real controllers run; only the bunnet DB models and the Celery task
boundary are mocked.
"""

from datetime import datetime
from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.route, pytest.mark.asyncio]


class FakeQuery:
    """A ``.run()``/``.to_list()``-able query stand-in."""

    def __init__(self, value):
        self._value = value

    def run(self):
        return self._value

    def to_list(self):
        return self._value


# ---------------------------------------------------------------------------
# POST /api/v1/projects  (create)
# ---------------------------------------------------------------------------


async def test_create_project_requires_name(client, auth_headers, patch_auth_user):
    _, response = await client.post("/api/v1/projects", json={}, headers=auth_headers())
    assert response.status_code == 400
    assert response.json["error"] == "Project name is required."


async def test_create_project_persists_and_returns_id(
    client, auth_headers, patch_auth_user, monkeypatch
):
    fake_user = patch_auth_user
    created = {}

    # DB boundary: a fake Features model that supports both query-building (.id)
    # and the .find() lookup, plus a neutralized In() operator.
    fake_features = SimpleNamespace(
        id="features.id", find=lambda *a, **k: FakeQuery([])
    )
    monkeypatch.setattr("controllers.project.Features", fake_features)
    monkeypatch.setattr("controllers.project.In", lambda field, values: ("in", values))

    # DB boundary: capture the Project the real controller tries to insert.
    def _project_factory(**kwargs):
        proj = SimpleNamespace(id="new-project-1", **kwargs)
        proj.insert = lambda: created.update(
            title=proj.title, user=proj.user, inserted=True
        )
        return proj

    monkeypatch.setattr("controllers.project.Project", _project_factory)

    _, response = await client.post(
        "/api/v1/projects",
        json={"project_name": "My SLR", "project_description": "desc"},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert response.json["message"] == "Project created."
    assert response.json["project_id"] == "new-project-1"
    # The real controller built and persisted a project owned by the caller.
    assert created["inserted"] is True
    assert created["title"] == "My SLR"
    assert created["user"] is fake_user


# ---------------------------------------------------------------------------
# GET/PUT/DELETE /api/v1/projects/<project_id>
# ---------------------------------------------------------------------------


async def test_project_detail_get_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "controllers.project.Project.get", lambda *a, **k: FakeQuery(None)
    )
    _, response = await client.get("/api/v1/projects/missing", headers=auth_headers())
    assert response.status_code == 404
    assert response.json["error"] == "Project not found."


async def test_project_detail_put_updates_fields(
    client, auth_headers, patch_auth_user, monkeypatch
):
    project = SimpleNamespace(
        title="old",
        description="old",
        prompt=None,
        updated_at=datetime.now(),
        slug="slug",
        created_at=datetime.now(),
    )
    saved = {}
    project.save = lambda: saved.__setitem__("called", True)
    project.model_dump = lambda **k: {
        "title": project.title,
        "description": project.description,
        "slug": project.slug,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }

    monkeypatch.setattr(
        "controllers.project.Project.get", lambda *a, **k: FakeQuery(project)
    )

    _, response = await client.put(
        "/api/v1/projects/p1",
        json={"project_name": "New Title", "project_prompt": "be precise"},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert response.json["message"] == "Project updated."
    # Real controller mutated and persisted the document.
    assert project.title == "New Title"
    assert project.prompt == "be precise"
    assert saved["called"] is True


async def test_project_detail_delete_success(
    client, auth_headers, patch_auth_user, monkeypatch
):
    fake_user = patch_auth_user
    deleted = {}
    project = SimpleNamespace(user=SimpleNamespace(id=fake_user.id))
    project.delete = lambda: deleted.__setitem__("called", True)

    monkeypatch.setattr(
        "controllers.project.Project.get", lambda *a, **k: FakeQuery(project)
    )

    _, response = await client.delete("/api/v1/projects/p1", headers=auth_headers())

    assert response.status_code == 200
    assert response.json["message"] == "Project deleted."
    assert deleted["called"] is True


async def test_project_detail_delete_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "controllers.project.Project.get", lambda *a, **k: FakeQuery(None)
    )
    _, response = await client.delete(
        "/api/v1/projects/missing", headers=auth_headers()
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET/DELETE /api/v1/projects/<project_id>/results
# ---------------------------------------------------------------------------


async def test_project_results_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "routes.v1.projects.Project.get", lambda *a, **k: FakeQuery(None)
    )
    _, response = await client.get(
        "/api/v1/projects/missing/results", headers=auth_headers()
    )
    assert response.status_code == 404
    assert response.json["error"] == "Project not found."


async def test_project_results_delete_requires_ids(
    client, auth_headers, patch_auth_user, monkeypatch
):
    fake_user = patch_auth_user
    project = SimpleNamespace(id="p1", user=SimpleNamespace(id=fake_user.id))
    monkeypatch.setattr(
        "routes.v1.projects.Project.get", lambda *a, **k: FakeQuery(project)
    )

    _, response = await client.request(
        "delete",
        "/api/v1/projects/p1/results",
        json={},
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.json["error"] == "No result IDs provided."


# ---------------------------------------------------------------------------
# POST/GET /api/v1/projects/<project_id>/score_csv
# ---------------------------------------------------------------------------


async def test_score_csv_post_requires_file(client, auth_headers, patch_auth_user):
    _, response = await client.post(
        "/api/v1/projects/p1/score_csv", headers=auth_headers()
    )
    assert response.status_code == 400
    assert response.json["error"] == "No CSV file provided."


async def test_score_csv_get_requires_task_id(client, auth_headers, patch_auth_user):
    _, response = await client.get(
        "/api/v1/projects/p1/score_csv", headers=auth_headers()
    )
    assert response.status_code == 400
    assert response.json["error"] == "task_id is required"


async def test_score_csv_get_returns_status(
    client, auth_headers, patch_auth_user, monkeypatch
):
    task = SimpleNamespace(status="SUCCESS", result={"score": 1}, ready=lambda: True)
    monkeypatch.setattr(
        "routes.v1.projects.score_csv_data.AsyncResult", lambda task_id: task
    )

    _, response = await client.get(
        "/api/v1/projects/p1/score_csv?task_id=abc", headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.json["status"] == "SUCCESS"
    assert response.json["result"] == {"score": 1}
