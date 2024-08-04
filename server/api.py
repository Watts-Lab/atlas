""" This module contains the Sanic RESTful API endpoint for the workflow editor. """

import argparse
import os
from celery import Celery
from dotenv import load_dotenv
from sanic import Sanic, json as json_response
from sanic.request import Request
from sanic.worker.manager import WorkerManager
from sanic_cors import CORS
from config.app_config import AppConfig
from controllers.login import login_user, validate_user
from database.database import init_db
import socketio

from celery_worker import get_paper_info, run_assistant, celery
from celery.result import EagerResult


load_dotenv()

WorkerManager.THRESHOLD = 600

app = Sanic("Atlas", config=AppConfig())

# Initialize CORS
CORS(app, resources={r"/*": {"origins": "*"}})

redis_broker_url = os.getenv("CELERY_BROKER_URL")
redis_result_backend = os.getenv("CELERY_RESULT_BACKEND")

mgr = socketio.AsyncRedisManager(redis_broker_url)
sio = socketio.AsyncServer(
    async_mode="sanic",
    cors_allowed_origins=[],
    client_manager=mgr,
)

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


@app.route("/api/task", methods=["GET", "POST"])
async def task_handler(request: Request):
    """
    Handles the POST request for logging in the user.
    """
    if request.method == "POST":
        file = request.files.get("file")
        file_path = f"paper/{file.name}"
        with open(file_path, "wb") as f:
            f.write(file.body)

        task: EagerResult = get_paper_info.delay(file_path)
        return json_response({"TASK": task.id})
    elif request.method == "GET":
        task_id = request.json.get("task_id")
        task = get_paper_info.AsyncResult(task_id)
        return json_response({"TASK": task.result})


@app.route("/api/run_assistant", methods=["POST", "GET"])
async def run_assistant_endpoint(request: Request):
    """
    Handles the POST request for running the assistant.
    """
    if request.method == "POST":
        # Get the file and the socket id
        file = request.files.get("file")
        sid = request.form.get("sid")

        file_path = f"paper/{sid}-{file.name}"
        with open(file_path, "wb") as f:
            f.write(file.body)

        task: EagerResult = run_assistant.delay(file_path, sid)
        return json_response({"task_id": task.id})

    elif request.method == "GET":
        task_id = request.args.get("task_id")
        task = run_assistant.AsyncResult(task_id)
        return json_response(task.result)


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
