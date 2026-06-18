"""Route tests for the results blueprint (/api/v1/results).

Real controllers run; only the Celery task boundary is mocked.
"""

from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.route, pytest.mark.asyncio]


# ---------------------------------------------------------------------------
# POST /api/v1/results/features/<feature_id>/evaluate_repeatability
# ---------------------------------------------------------------------------


async def test_evaluate_repeatability_requires_params(
    client, auth_headers, patch_auth_user
):
    _, response = await client.post(
        "/api/v1/results/features/feat-1/evaluate_repeatability",
        json={"project_id": "p1"},  # missing paper_id and sid
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.json["error"] == "Missing parameters."


async def test_evaluate_repeatability_dispatches_task(
    client, auth_headers, patch_auth_user, monkeypatch
):
    captured = {}

    def _delay(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(id="task-eval")

    monkeypatch.setattr(
        "workers.evaluate_repeatability_task.evaluate_feature_repeatability.delay",
        _delay,
    )

    _, response = await client.post(
        "/api/v1/results/features/feat-1/evaluate_repeatability",
        json={"paper_id": "paper-1", "project_id": "p1", "sid": "s1"},
        headers=auth_headers(),
    )

    assert response.status_code == 202
    assert response.json["task_id"] == "task-eval"
    assert captured["feature_id"] == "feat-1"
    assert captured["num_runs"] == 5


# ---------------------------------------------------------------------------
# POST /api/v1/results/features/<feature_id>/extract
# ---------------------------------------------------------------------------


async def test_run_feature_extraction_requires_paper_id(
    client, auth_headers, patch_auth_user
):
    _, response = await client.post(
        "/api/v1/results/features/feat-1/extract",
        json={"project_id": "p1"},
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.json["error"] == "paper_id is required"


async def test_run_feature_extraction_dispatches_single_run(
    client, auth_headers, patch_auth_user, monkeypatch
):
    captured = {}

    def _delay(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(id="task-extract")

    monkeypatch.setattr(
        "workers.evaluate_repeatability_task.evaluate_feature_repeatability.delay",
        _delay,
    )

    _, response = await client.post(
        "/api/v1/results/features/feat-1/extract",
        json={"paper_id": "paper-1", "project_id": "p1", "sid": "s1"},
        headers=auth_headers(),
    )

    assert response.status_code == 202
    assert response.json["task_id"] == "task-extract"
    # Extraction is a single run (vs. 5 for repeatability).
    assert captured["num_runs"] == 1


# ---------------------------------------------------------------------------
# GET /api/v1/results/repeatability_results/<result_id>
# ---------------------------------------------------------------------------


async def test_get_repeatability_result_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    # The route imports the controller into its own namespace, so patch it there.
    monkeypatch.setattr(
        "routes.v1.results.get_repeatability_result_controller",
        lambda result_id: {"error": "Not found"},
    )

    _, response = await client.get(
        "/api/v1/results/repeatability_results/missing", headers=auth_headers()
    )
    assert response.status_code == 404
    assert response.json["error"] == "Not found"
