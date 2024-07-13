""" This module contains the Sanic RESTful API endpoint for the workflow editor. """

import argparse
import os
from sanic import Sanic, response
from sanic.request import Request
from sanic.response import json
from sanic_jwt import Initialize
from sanic_cors import CORS
from dotenv import load_dotenv
import socketio
from controllers.assisstant import RunAssistant
from controllers.features import GetFeatures
from controllers.login import login_user, validate_user
from db.database import init_db

load_dotenv()

app = Sanic(__name__)

# Load configuration
app.config.SECRET = os.getenv("SOCKET_SECRET")
app.config.JWT_SECRET = os.getenv("JWT_SECRET")

# Initialize CORS
CORS(app, resources={r"/*": {"origins": "*"}})

sio = socketio.AsyncServer(async_mode="sanic", logger=True, cors_allowed_origins=[])

sio.attach(app)


# Initialize database
@app.before_server_start
async def attach_db(app, loop):
    await init_db()


# Define JWT authentication
async def authenticate(request):
    email = request.json.get("email", None)
    print(email)
    if email:
        user = await login_user(email)
        return user
    return None


Initialize(app, authenticate=authenticate)

# # Define API resources
# app.add_route(GetFeatures.as_view(), "/api/features")
# app.add_route(RunAssistant.as_view(), "/api/run_assistant")


# TODO: add login rate limiter
@app.route("/api/login", methods=["POST"])
async def login(request: Request):
    if request.method == "POST":
        data = request.json
        email = data.get("email")
        return await login_user(email)


@app.route("/api/validate", methods=["POST"])
async def validate(request: Request):
    if request.method == "POST":
        data = request.json
        email = data.get("email")
        token = data.get("magic_link")
        return await validate_user(email=email, token=token)


@sio.on("connect", namespace="/home")
async def handle_connect(sid, _environ, _auth):
    print("connect ", sid)


@sio.on("disconnect", namespace="/home")
async def handle_disconnect(sid):
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
        "-d", "--debug", help="Debug mode on or off.", type=bool, default=False
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    app.run(host="0.0.0.0", port=args.port, debug=args.debug)
