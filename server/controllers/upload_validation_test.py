"""Tests for presigned-upload validation in the assistant controllers.

Focus on the security-relevant guarantees of the direct-to-S3 upload flow:

* the presigned upload is a size-bounded POST (not an unbounded PUT),
* finalize rejects uploads that are missing, oversized, or not actually PDFs,
  and cleans up the rejected object,
* finalize only accepts tokens inside the caller's own staging prefix.
"""

import os
import sys
import types
from types import SimpleNamespace

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "ejLBwioJGDEHsU2B81jWR_RAQg5DMSglU8b7VDYbnm4=")

from controllers import assisstant as A  # noqa: E402


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------
class FakeFileService:
    """Stand-in for FileService with programmable object state."""

    def __init__(self, *, size=None, is_pdf=True):
        self._size = size
        self._is_pdf = is_pdf
        self.bucket_name = "bucket"
        self.deleted = []
        self.s3_client = SimpleNamespace(
            delete_object=lambda Bucket, Key: self.deleted.append(Key)
        )

    def generate_presigned_post(self, s3_key, **kwargs):
        return {
            "url": "https://bucket.s3.amazonaws.com/",
            "fields": {
                "key": s3_key,
                "Content-Type": "application/pdf",
                "policy": "signed-policy",
                "signature": "sig",
            },
        }

    def head_object_size(self, s3_key):
        return self._size

    def looks_like_pdf(self, s3_key):
        return self._is_pdf


@pytest.fixture
def user():
    return SimpleNamespace(id="user-1", email="test@example.com")


@pytest.fixture
def patch_services(monkeypatch):
    """Install fake FileService + a fake celery add_paper task, return handles.

    Both controllers import these lazily; we inject fake modules so the imports
    resolve to our fakes without a real S3/celery.
    """
    tasks = {}

    def _install(file_service):
        # Fake workers.services.file_s3_service module
        fake_fs_module = types.ModuleType("workers.services.file_s3_service")
        fake_fs_module.FileService = lambda: file_service
        fake_fs_module.MAX_UPLOAD_BYTES = 50 * 1024 * 1024
        monkeypatch.setitem(
            sys.modules, "workers.services.file_s3_service", fake_fs_module
        )

        # Fake workers.celery_config.add_paper
        fake_celery = types.ModuleType("workers.celery_config")

        def _delay(*args, **kwargs):
            tasks["called"] = {"args": args, "kwargs": kwargs}
            return SimpleNamespace(id="task-123")

        fake_celery.add_paper = SimpleNamespace(delay=_delay)
        monkeypatch.setitem(sys.modules, "workers.celery_config", fake_celery)
        return tasks

    return _install


# ---------------------------------------------------------------------------
# create_paper_upload_controller
# ---------------------------------------------------------------------------
def test_create_upload_returns_presigned_post(monkeypatch, patch_services, user):
    patch_services(FakeFileService())
    out = A.create_paper_upload_controller(
        user, "My Paper.pdf", "proj-1", "openai_json_schema"
    )
    assert out["method"] == "POST"
    assert "upload_url" in out and "upload_fields" in out
    assert out["max_bytes"] == 50 * 1024 * 1024
    # Token is scoped to the user's staging prefix and normalized to .pdf.
    assert out["upload_token"].startswith(f"papers/uploads/{user.id}/")
    assert out["upload_token"].endswith("My_Paper.pdf")


def test_create_upload_appends_pdf_extension(monkeypatch, patch_services, user):
    patch_services(FakeFileService())
    out = A.create_paper_upload_controller(
        user, "noext", "proj-1", "openai_json_schema"
    )
    assert out["filename"].endswith(".pdf")


def test_create_upload_rejects_bad_strategy(monkeypatch, patch_services, user):
    patch_services(FakeFileService())
    out = A.create_paper_upload_controller(user, "p.pdf", "proj-1", "bogus")
    assert out["status"] == 400


# ---------------------------------------------------------------------------
# finalize_paper_upload_controller
# ---------------------------------------------------------------------------
def _token(user):
    return f"papers/uploads/{user.id}/tok/paper.pdf"


def test_finalize_rejects_foreign_token(monkeypatch, patch_services, user):
    patch_services(FakeFileService(size=1000, is_pdf=True))
    out = A.finalize_paper_upload_controller(
        user,
        "papers/uploads/someone-else/tok/paper.pdf",
        "proj-1",
        "openai_json_schema",
        "",
    )
    assert out["status"] == 403


def test_finalize_rejects_missing_object(monkeypatch, patch_services, user):
    patch_services(FakeFileService(size=None))
    out = A.finalize_paper_upload_controller(
        user, _token(user), "proj-1", "openai_json_schema", ""
    )
    assert out["status"] == 400
    assert "Upload it first" in out["error"]


def test_finalize_rejects_oversized_and_cleans_up(monkeypatch, patch_services, user):
    fs = FakeFileService(size=60 * 1024 * 1024, is_pdf=True)
    patch_services(fs)
    out = A.finalize_paper_upload_controller(
        user, _token(user), "proj-1", "openai_json_schema", ""
    )
    assert out["status"] == 400
    assert "limit" in out["error"].lower()
    assert _token(user) in fs.deleted  # rejected object was deleted


def test_finalize_rejects_non_pdf_and_cleans_up(monkeypatch, patch_services, user):
    fs = FakeFileService(size=1000, is_pdf=False)
    patch_services(fs)
    out = A.finalize_paper_upload_controller(
        user, _token(user), "proj-1", "openai_json_schema", ""
    )
    assert out["status"] == 400
    assert "not a valid pdf" in out["error"].lower()
    assert _token(user) in fs.deleted


def test_finalize_accepts_valid_pdf_and_enqueues(monkeypatch, patch_services, user):
    fs = FakeFileService(size=1000, is_pdf=True)
    tasks = patch_services(fs)
    out = A.finalize_paper_upload_controller(
        user, _token(user), "proj-1", "openai_json_schema", "sid-1"
    )
    # Returns {filename: task_id}
    assert out == {"paper.pdf": "task-123"}
    assert tasks["called"]["kwargs"]["staged_s3_key"] == _token(user)
    assert fs.deleted == []  # nothing cleaned up on the happy path
