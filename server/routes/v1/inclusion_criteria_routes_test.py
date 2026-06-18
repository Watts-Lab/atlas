"""Route tests for the inclusion criteria blueprint.

Routes live under /api/v1/projects/<project_id>/inclusion-criteria.
Real route logic runs; only the ``Project`` DB model is mocked.
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
# GET/POST /api/v1/projects/<project_id>/inclusion-criteria
# ---------------------------------------------------------------------------


async def test_list_criteria_project_not_found(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "routes.v1.inclusion_criteria.Project.get", lambda *a, **k: FakeQuery(None)
    )
    _, response = await client.get(
        "/api/v1/projects/p1/inclusion-criteria", headers=auth_headers()
    )
    assert response.status_code == 404
    assert response.json["error"] == "Project not found."


async def test_create_criteria_requires_name(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "routes.v1.inclusion_criteria.Project.get",
        lambda *a, **k: FakeQuery(SimpleNamespace(id="p1")),
    )
    _, response = await client.post(
        "/api/v1/projects/p1/inclusion-criteria",
        json={"formula": {}},
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.json["error"] == "Name is required."


async def test_create_criteria_requires_formula(
    client, auth_headers, patch_auth_user, monkeypatch
):
    monkeypatch.setattr(
        "routes.v1.inclusion_criteria.Project.get",
        lambda *a, **k: FakeQuery(SimpleNamespace(id="p1")),
    )
    _, response = await client.post(
        "/api/v1/projects/p1/inclusion-criteria",
        json={"name": "Has RCT"},
        headers=auth_headers(),
    )
    assert response.status_code == 400
    assert response.json["error"] == "Formula is required."


async def test_create_criteria_success(
    client, auth_headers, patch_auth_user, monkeypatch
):
    project = SimpleNamespace(id="p1")
    monkeypatch.setattr(
        "routes.v1.inclusion_criteria.Project.get", lambda *a, **k: FakeQuery(project)
    )
    monkeypatch.setattr(
        "routes.v1.inclusion_criteria.create_criteria",
        lambda *a, **k: {"id": "ic-1", "name": "Has RCT"},
    )

    _, response = await client.post(
        "/api/v1/projects/p1/inclusion-criteria",
        json={"name": "Has RCT", "formula": {"op": "and"}},
        headers=auth_headers(),
    )
    assert response.status_code == 201
    assert response.json["criteria"]["id"] == "ic-1"
