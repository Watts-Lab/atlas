"""Security regression tests: project serialization must never leak a nested
User document (magic_link, encrypted API keys, WebAuthn handle, billing).

Guards against the disclosure where GET /projects/<id> embedded each feature's
full `user` ORM document in the response.
"""

import json
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from controllers.project import get_project_detail

pytestmark = [pytest.mark.unit]


class _Query:
    def __init__(self, value):
        self._value = value

    def run(self):
        return self._value


def _sensitive_user():
    """A user document carrying exactly the fields that must never be exposed."""
    return SimpleNamespace(
        id="user-1",
        email="victim@example.com",
        magic_link="SUPER-SECRET-LOGIN-TOKEN",
        magic_link_expired=False,
        webauthn_user_handle="handle-xyz",
        openai_api_key_encrypted="ENCRYPTED-OPENAI",
        openrouter_api_key_encrypted="ENCRYPTED-OR",
        monthly_usd_limit_micros=5_000_000,
        monthly_usd_used_micros=10_075,
    )


def _feature_with_user(user):
    return SimpleNamespace(
        id="feat-1",
        feature_name="Title",
        feature_identifier="paper_title",
        feature_description="the title",
        user=user,
    )


def _fake_project(features):
    # model_dump mimics bunnet: with the linked docs excluded, it returns only
    # scalar project fields (never the nested user).
    proj = SimpleNamespace(
        features=features,
        papers=[],
    )

    def _model_dump(mode="json", exclude=None):
        exclude = exclude or set()
        data = {
            "id": "proj-1",
            "title": "P",
            "description": "d",
            "prompt": "",
            "slug": uuid4(),
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "llm": {"provider": "atlas", "model": None, "strategy": "json_schema"},
        }
        # Emulate that excluded link fields are simply absent.
        return data

    proj.model_dump = _model_dump
    return proj


def test_project_detail_does_not_leak_nested_user(monkeypatch):
    user = _sensitive_user()
    project = _fake_project([_feature_with_user(user)])
    monkeypatch.setattr(
        "controllers.project.Project.get", lambda *a, **k: _Query(project)
    )

    result = get_project_detail("proj-1")
    assert result is not None
    project_dict, _papers = result

    # The whole serialized payload must contain none of the secrets, anywhere.
    blob = json.dumps(project_dict, default=str)
    for secret in (
        "SUPER-SECRET-LOGIN-TOKEN",
        "ENCRYPTED-OPENAI",
        "ENCRYPTED-OR",
        "handle-xyz",
        "victim@example.com",
        "monthly_usd",
    ):
        assert secret not in blob, f"leaked: {secret}"

    # Features are still present, but only with allow-listed fields.
    feature = project_dict["features"][0]
    assert set(feature.keys()) == {
        "id",
        "feature_name",
        "feature_identifier",
        "feature_description",
        "created_by",
    }
    assert feature["created_by"] == "user"


def test_user_to_dict_excludes_secrets():
    from database.models.users import User

    # model_construct bypasses validation/DB while giving a real User instance.
    u = User.model_construct(
        email="x@example.com",
        magic_link="SECRET",
        magic_link_expired=False,
        magic_link_expiration_date=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    d = u.to_dict()
    assert "magic_link" not in d
    assert "magic_link_expired" not in d
    assert "openai_api_key_encrypted" not in d
    assert "webauthn_user_handle" not in d
    assert d["email"] == "x@example.com"
