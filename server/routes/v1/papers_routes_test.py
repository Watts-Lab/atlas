"""Route tests for paper update endpoints."""

from types import SimpleNamespace

import pytest


@pytest.mark.route
@pytest.mark.asyncio
async def test_update_paper_results_dispatches_celery_task(
    client,
    auth_headers,
    patch_auth_user,
    monkeypatch,
):
    """Verify route validates ownership and dispatches Celery task with expected payload."""
    fake_user = patch_auth_user

    paper = SimpleNamespace(id="paper-123", user=SimpleNamespace(id=fake_user.id))
    project = SimpleNamespace(id="project-789", user=SimpleNamespace(id=fake_user.id))

    def _paper_get(*args, **kwargs):
        return SimpleNamespace(run=lambda: paper)

    def _project_get(*args, **kwargs):
        return SimpleNamespace(run=lambda: project)

    monkeypatch.setattr("routes.v1.papers.Paper.get", _paper_get)
    monkeypatch.setattr("routes.v1.papers.Project.get", _project_get)

    captured_delay = {}

    def _delay(**kwargs):
        captured_delay.update(kwargs)
        return SimpleNamespace(id="task-abc")

    monkeypatch.setattr("routes.v1.papers.reprocess_paper.delay", _delay)

    _, response = await client.post(
        "/api/v1/papers/update/paper-123",
        json={
            "project_id": "project-789",
            "strategy_type": "json_schema",
            "sid": "socket-1",
        },
        headers=auth_headers(fake_user.email),
    )

    assert response.status_code == 200
    assert response.json["message"] == "Reprocessing started"
    assert response.json["task_id"] == "task-abc"
    assert captured_delay == {
        "paper_id": "paper-123",
        "socket_id": "socket-1",
        "user_email": fake_user.email,
        "project_id": "project-789",
        "strategy_type": "json_schema",
    }


@pytest.mark.route
@pytest.mark.asyncio
async def test_update_paper_results_requires_project_id(
    client,
    auth_headers,
    patch_auth_user,
):
    """Ensure request is rejected before touching downstream dependencies."""
    fake_user = patch_auth_user

    _, response = await client.post(
        "/api/v1/papers/update/paper-123",
        json={},
        headers=auth_headers(fake_user.email),
    )

    assert response.status_code == 400
    assert response.json["error"] == "project_id is required"
