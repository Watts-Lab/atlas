# pylint: disable=redefined-outer-name
"""
test_api.py
=================
Test cases for the API endpoints and argument parsing.
"""


import sys
import pytest
import pytest_asyncio
import api
from api import app as sanic_app, parse_args

api.init_db = lambda *args, **kwargs: None
sanic_app.listeners["before_server_start"].clear()


@pytest.fixture
def app():
    """
    Create a test Sanic app instance.
    """
    return sanic_app


@pytest_asyncio.fixture
def client(app):
    """
    Create a test client for the Sanic app.
    """
    return app.asgi_client


@pytest.mark.asyncio
async def test_health_ok(client):
    """
    Test the health check endpoint.
    """
    _, r = await client.get("/health")
    print(r)
    assert r.status_code == 200  # HTTPX uses .status_code
    assert r.json.get("status") == "ok"


@pytest.mark.asyncio
async def test_404_unknown(client):
    """
    Test a 404 error for an unknown route.
    """
    _, resp = await client.get("/no-such-route")
    assert resp.status == 404


def test_parse_args_defaults(monkeypatch):
    """
    Test the default argument parsing.
    """
    monkeypatch.setattr(sys, "argv", ["api.py"])
    args = parse_args()
    assert args.port == 80
    assert args.dev is False


def test_parse_args_override(monkeypatch):
    """
    Test the argument parsing with overridden values.
    """
    monkeypatch.setattr(sys, "argv", ["api.py", "-p", "8081", "-d", "True"])
    args = parse_args()
    assert args.port == 8081
    assert args.dev is True
