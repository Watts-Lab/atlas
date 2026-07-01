"""This module contains the RESTful API endpoint for atlas."""

import argparse
import os

import socketio
from config.app_config import AppConfig
from database.database import init_db
from dotenv import load_dotenv
from routes.v1 import v1_blueprint
from routes.v1.docs import health as health_docs
from routes.v1.docs.info import register_openapi
from sanic import Sanic
from sanic import json as json_response
from sanic.request import Request
from sanic.worker.manager import WorkerManager
from sanic_ext import Extend

load_dotenv()

WorkerManager.THRESHOLD = 600

# Initialize the Sanic app
app = Sanic("Atlas", config=AppConfig())


app.config.CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://atlas.seas.upenn.edu",
]
app.config.CORS_SUPPORTS_CREDENTIALS = True
app.config.CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]

# OpenAPI / Swagger UI configuration
app.config.OAS = True
app.config.OAS_UI_DEFAULT = "swagger"
app.config.OAS_URL_PREFIX = "/api/docs"
app.config.OAS_UI_REDOC = True

Extend(app)

# OpenAPI spec metadata, security schemes, and the API "mental model" all live
# in routes/v1/docs/info.py so this module stays focused on app wiring.
register_openapi(app)

# ---------------------------------------------------------------------------
# Initialize redis url
# ---------------------------------------------------------------------------
redis_broker_url = os.getenv("CELERY_BROKER_URL")
redis_result_backend = os.getenv("CELERY_RESULT_BACKEND")

# For testing purposes if redis is not set
mgr = None
if redis_broker_url:
    # redis-py >=8 applies a socket read timeout to the blocking pub/sub
    # listen() loop that AsyncRedisManager runs, which surfaces as a repeating
    # "Cannot receive from redis... retrying" log (a TimeoutError swallowed by
    # python-socketio). Disabling the read timeout lets the blocking listen
    # wait indefinitely for messages, as intended.
    mgr = socketio.AsyncRedisManager(
        redis_broker_url,
        redis_options={"socket_timeout": None},
    )

sio_kwargs = {
    "async_mode": "sanic",
    "cors_allowed_origins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://atlas.seas.upenn.edu",
    ],
    "cors_credentials": True,
}
if mgr:
    sio_kwargs["client_manager"] = mgr

# Initialize SocketIO
sio = socketio.AsyncServer(**sio_kwargs)
sio.attach(app)


# Initialize database
@app.before_server_start
async def attach_db(_app, _loop):
    """
    Initialize the database connection.
    """
    init_db()


app.blueprint(v1_blueprint, url_prefix="/api")


@app.get("/health")
@health_docs.health_check
async def health_check(_request: Request):
    """
    Simple health check endpoint.
    Returns 200 OK if the server is running and database is connected.
    """
    return json_response({"status": "ok"}, status=200)


@sio.on("connect", namespace="/home")
async def handle_connect(sid, _environ, _auth):
    """
    event listener when client connects to the socket
    """
    print("connect ", sid)


@sio.on("disconnect", namespace="/home")
async def handle_disconnect(sid):
    """
    event listener when client disconnects from the socket
    """
    print("disconnect ", sid)


@sio.on("status", namespace="/home")
def handle_message(data):
    """event listener when client types a message"""
    print("data from the front end: ", str(data))


# Utility to parse command line arguments
def parse_args():
    """
    Parse command line arguments.
    """
    parser = argparse.ArgumentParser(description="Atlas Sanic RESTful API endpoint.")
    parser.add_argument(
        "-p", "--port", help="Port for the server.", type=int, default=80
    )
    parser.add_argument(
        "-d", "--dev", help="Dev mode on or off.", type=bool, default=False
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    app.run(host="0.0.0.0", port=args.port, dev=args.dev)
