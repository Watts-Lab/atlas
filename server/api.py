""" This module contains the Sanic RESTful API endpoint for the workflow editor. """

import argparse
import os
from sanic import Sanic, response
from sanic.request import Request
from sanic_cors import CORS
import socketio
from config.app_config import AppConfig
from controllers.assisstant import run_assistant
from controllers.login import login_user, validate_user
from database.database import init_db


app = Sanic("Atlas", config=AppConfig())

# Initialize CORS
CORS(app, resources={r"/*": {"origins": "*"}})

sio = socketio.AsyncServer(async_mode="sanic", logger=True, cors_allowed_origins=[])

sio.attach(app)


# Initialize database
@app.before_server_start
async def attach_db(_app, _loop):
    """
    Initialize the database connection.
    """
    await init_db()


@app.route("/api/login", methods=["POST"])
async def login(request: Request):
    """
    Handles the POST request for logging in the user.
    """
    if request.method == "POST":
        data = request.json
        email = data.get("email")
        return await login_user(email=email)


@app.route("/api/validate", methods=["POST"])
async def validate(request: Request):
    """
    Handles the POST request for validating the magic link.
    """
    if request.method == "POST":
        data = request.json
        email = data.get("email")
        token = data.get("magic_link")
        return await validate_user(email=email, token=token)


@app.route("/api/run_assistant", methods=["POST"])
async def run_assistant_endpoint(request: Request):
    """
    Handles the POST request for running the assistant.
    """
    if request.method == "POST":
        file = request.files.get("file")
        sid = request.form.get("sid")
        return await run_assistant(sid=sid, file=file, sio=sio)


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


# Regular routes
@app.route("/")
async def index(_request: Request):
    """Serves the index.html file."""
    return await response.file(
        os.path.join(app.config.FALLBACK_STATIC_DIR, "index.html")
    )


@app.exception(404)
async def not_found(_request, _exception):
    """reroute to index.html for all other routes"""
    return await response.file(
        os.path.join(app.config.FALLBACK_STATIC_DIR, "index.html")
    )


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
