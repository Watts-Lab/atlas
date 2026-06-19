"""Shared pytest fixtures for backend tests."""

import os
from dataclasses import dataclass
from types import SimpleNamespace

import jwt
import pytest
import pytest_asyncio

# AppConfig reads JWT_SECRET from the environment as a *class attribute* at import
# time, and Sanic's config object shadows later assignments to it. So the secret
# must exist in the environment BEFORE `api` is imported. Locally a .env supplies
# it; in CI there is none, so provide a deterministic test default here.
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import api  # noqa: E402  (must follow the JWT_SECRET default above)
from api import app as sanic_app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def disable_db_bootstrap():
    """Prevent real DB init during unit/route tests."""
    api.init_db = lambda *args, **kwargs: None
    sanic_app.listeners["before_server_start"].clear()


@pytest.fixture
def app():
    """Reusable Sanic app fixture.

    JWT_SECRET is established via the environment before ``api`` is imported (see
    top of this module), so it is already set on the config here.
    """
    return sanic_app


@pytest_asyncio.fixture
async def client(app):
    """Reusable async test client fixture."""
    return app.asgi_client


@dataclass
class FakeUser:
    """Minimal user object for auth and ownership checks."""

    id: str = "user-1"
    email: str = "test@example.com"


@pytest.fixture
def fake_user() -> FakeUser:
    return FakeUser()


@pytest.fixture
def make_jwt_cookie(app):
    """Build a valid JWT cookie payload for require_jwt decorator."""

    def _make(email: str = "test@example.com"):
        return jwt.encode(
            {"email": email},
            app.config.JWT_SECRET,
            algorithm="HS256",
        )

    return _make


@pytest.fixture
def auth_headers(make_jwt_cookie):
    """Construct Cookie header expected by request.cookies in Sanic tests."""

    def _make(email: str = "test@example.com"):
        token = make_jwt_cookie(email)
        return {"cookie": f"jwt={token}"}

    return _make


@pytest.fixture
def patch_auth_user(monkeypatch, fake_user):
    """Patch User.find_one(...).run() used by require_jwt to return fake user."""

    monkeypatch.setattr(
        "routes.auth.jwt.decode",
        lambda *args, **kwargs: {"email": fake_user.email},
    )

    def _find_one(*args, **kwargs):
        return SimpleNamespace(run=lambda: fake_user)

    class _EmailField:
        def __eq__(self, other):
            return ("email", other)

    fake_user_model = SimpleNamespace(email=_EmailField(), find_one=_find_one)
    monkeypatch.setattr("routes.auth.User", fake_user_model)
    return fake_user
