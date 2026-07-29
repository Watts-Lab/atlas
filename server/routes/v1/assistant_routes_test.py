"""Route tests for the assistant blueprint (/api/v1/assistant).

Real controllers run; only the Celery task boundary and the ``Project`` DB
model are mocked.
"""

from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.route, pytest.mark.asyncio]


class FakeQuery:
    def __init__(self, value):
        self._value = value

    def run(self):
        return self._value


# ---------------------------------------------------------------------------
# POST /api/v1/assistant/add_paper
# ---------------------------------------------------------------------------


async def test_add_paper_rejects_missing_files(client, auth_headers, patch_auth_user):
    # No files[] in the multipart form -> controller returns 400.
    _, response = await client.post(
        "/api/v1/assistant/add_paper",
        data={"project_id": "p1", "sid": "s1"},
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.json["error"] == "No file uploaded."


# ---------------------------------------------------------------------------
# GET /api/v1/assistant/add_paper  (task status)
# ---------------------------------------------------------------------------


async def test_add_paper_get_returns_task_status_envelope(
    client, auth_headers, patch_auth_user, monkeypatch
):
    # A finished, successful task returns a status envelope with the result.
    fake_task = SimpleNamespace(
        state="SUCCESS",
        result={"status": "success"},
        ready=lambda: True,
        successful=lambda: True,
    )
    monkeypatch.setattr(
        "workers.celery_config.add_paper.AsyncResult", lambda task_id: fake_task
    )

    _, response = await client.get(
        "/api/v1/assistant/add_paper?task_id=abc", headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.json["task_id"] == "abc"
    assert response.json["state"] == "SUCCESS"
    assert response.json["ready"] is True
    assert response.json["result"] == {"status": "success"}


async def test_add_paper_get_pending_task_has_no_result(
    client, auth_headers, patch_auth_user, monkeypatch
):
    # A not-yet-finished task returns a PENDING state and null result (not a bare
    # null response) so callers can poll meaningfully. Regression for #251.
    fake_task = SimpleNamespace(
        state="PENDING",
        result=None,
        ready=lambda: False,
        successful=lambda: False,
    )
    monkeypatch.setattr(
        "workers.celery_config.add_paper.AsyncResult", lambda task_id: fake_task
    )

    _, response = await client.get(
        "/api/v1/assistant/add_paper?task_id=abc", headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.json["state"] == "PENDING"
    assert response.json["ready"] is False
    assert response.json["result"] is None


# ---------------------------------------------------------------------------
# POST /api/v1/assistant/reprocess_paper/<paper_id>
# ---------------------------------------------------------------------------


async def test_reprocess_paper_requires_project_id(
    client, auth_headers, patch_auth_user
):
    _, response = await client.post(
        "/api/v1/assistant/reprocess_paper/paper-1",
        json={},
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.json["error"] == "project_id is required"


async def test_reprocess_paper_dispatches_task(
    client, auth_headers, patch_auth_user, monkeypatch
):
    fake_user = patch_auth_user
    captured = {}

    def _delay(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(id="task-1")

    monkeypatch.setattr("workers.celery_config.reprocess_paper.delay", _delay)

    _, response = await client.post(
        "/api/v1/assistant/reprocess_paper/paper-1",
        json={"project_id": "proj-1", "strategy_type": "json_schema", "sid": "s1"},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert response.json["task_id"] == "task-1"
    assert captured == {
        "paper_id": "paper-1",
        "socket_id": "s1",
        "user_email": fake_user.email,
        "project_id": "proj-1",
        "strategy_type": "json_schema",
    }


# ---------------------------------------------------------------------------
# POST /api/v1/assistant/reprocess_project/<project_id>
# ---------------------------------------------------------------------------


async def test_reprocess_project_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "controllers.assisstant.Project.get", lambda *a, **k: FakeQuery(None)
    )
    _, response = await client.post(
        "/api/v1/assistant/reprocess_project/missing",
        json={"sid": "s1"},
        headers=auth_headers(),
    )
    assert response.status_code == 404
    assert response.json["error"] == "Project not found"


async def test_reprocess_project_dispatches_per_paper(
    client, auth_headers, patch_auth_user, monkeypatch
):
    project = SimpleNamespace(
        papers=[SimpleNamespace(id="paper-1"), SimpleNamespace(id="paper-2")]
    )
    monkeypatch.setattr(
        "controllers.assisstant.Project.get", lambda *a, **k: FakeQuery(project)
    )

    calls = []

    def _delay(**kwargs):
        calls.append(kwargs["paper_id"])
        return SimpleNamespace(id=f"task-{kwargs['paper_id']}")

    monkeypatch.setattr("workers.celery_config.reprocess_paper.delay", _delay)

    _, response = await client.post(
        "/api/v1/assistant/reprocess_project/proj-1",
        json={"sid": "s1", "strategy_type": "json_schema"},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert response.json["total_papers"] == 2
    assert sorted(calls) == ["paper-1", "paper-2"]
