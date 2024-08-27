""" This module contains the Sanic RESTful API endpoint for the workflow editor. """

import argparse
import json
import os
from celery.result import EagerResult
from dotenv import load_dotenv
import jwt
from sanic import Sanic, json as json_response
from sanic.request import Request
from sanic.worker.manager import WorkerManager
from sanic_cors import CORS
from config.app_config import AppConfig
from controllers.login import login_user, validate_user
from controllers.project import create_project
from database.database import init_db
from database.models.papers import Paper, PaperView
from database.models.projects import Project, ProjectView
from database.models.results import Result
from database.models.users import User
import socketio

from celery_worker import run_assistant, add_paper


load_dotenv()

WorkerManager.THRESHOLD = 600

# Initialize the Sanic app
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
    init_db()


@app.route("/api/projects", methods=["GET", "POST", "PUT"])
async def project(request: Request):
    """
    A protected route.
    """
    try:
        user_jwt = jwt.decode(
            request.token, app.config.JWT_SECRET, algorithms=["HS256"]
        )
        user = User.find_one(User.email == user_jwt.get("email")).run()
        if not user:
            return json_response({"error": "User not found."}, status=404)

        if request.method == "POST":
            project_name = "New Project"
            project_description = "New Project"
            new_project = create_project(project_name, project_description, user)
            return json_response(
                {"message": "Project created.", "project_id": new_project}
            )
        elif request.method == "GET":
            project_id = request.args.get("project_id")
            user_project: Project = Project.get(project_id, fetch_links=True).run()
            if not user_project:
                return json_response({"error": "Project not found."}, status=404)
            project_dict = user_project.model_dump(
                mode="json", exclude=["user"], serialize_as_any=True
            )
            project_dict["slug"] = str(project_dict["slug"])
            project_dict["created_at"] = str(project_dict["created_at"])
            project_dict["updated_at"] = str(project_dict["updated_at"])
            project_dict["papers"] = [str(pap.id) for pap in user_project.papers]

            papers = [
                {
                    "task_id": pap.title,
                    "status": "success",
                    "file_name": pap.title,
                    "experiments": pap.truth_ids[0].json_response["experiments"],
                }
                for pap in user_project.papers
            ]

            if user_project:
                return json_response({"project": project_dict, "results": papers})
            else:
                return json_response({"error": "Project not found."}, status=404)
        elif request.method == "PUT":
            project_id = request.args.get("project_id")
            project_name = request.json.get("project_name")
            user_project = Project.get(project_id).run()
            if not user_project:
                return json_response({"error": "Project not found."}, status=404)
            user_project.title = project_name
            user_project.save()
            project_dict = user_project.model_dump(
                mode="json", exclude=["user"], serialize_as_any=True
            )
            project_dict["slug"] = str(project_dict["slug"])
            project_dict["created_at"] = str(project_dict["created_at"])
            project_dict["updated_at"] = str(project_dict["updated_at"])
            return json_response(
                {"message": "Project updated.", "project": project_dict}
            )

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)
    except Exception as e:
        return json_response({"error": str(e)}, status=500)


@app.route("/api/user/projects", methods=["GET"])
async def user_projects(request: Request):
    """
    A protected route.
    """
    try:
        user_jwt = jwt.decode(
            request.token, app.config.JWT_SECRET, algorithms=["HS256"]
        )
        user = User.find_one(User.email == user_jwt.get("email")).run()
        if not user:
            return json_response({"error": "User not found."}, status=404)

        if request.method == "GET":
            projects = (
                Project.find({"user.$id": user.id}).project(ProjectView).to_list()
            )
            pr_response = [p.model_dump(mode="json") for p in projects]

            if projects:
                return json_response({"project": pr_response})
            else:
                return json_response({"error": "Project not found."}, status=404)

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)


@app.route("/api/user/papers", methods=["GET"])
async def user_papers(request: Request):
    """
    A protected route.
    """
    try:

        user_jwt = jwt.decode(
            request.token, app.config.JWT_SECRET, algorithms=["HS256"]
        )
        user = User.find_one(User.email == user_jwt.get("email")).run()
        if not user:
            return json_response({"error": "User not found."}, status=404)

        if request.method == "GET":
            papers = Paper.find({"user.$id": user.id}).project(PaperView).to_list()
            pr_response = [p.model_dump(mode="json") for p in papers]
            print("papers_response ", pr_response)
            if papers:
                return json_response({"papers": pr_response})
            else:
                return json_response({"error": "Papers not found."}, status=404)

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)


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


@app.route("/api/add_paper", methods=["POST", "GET"])
async def run_assistant_projects(request: Request):
    """
    Handles the POST request for running the assistant.
    """
    if request.method == "POST":
        # Get the file and the socket id
        files = request.files.getlist("files[]")
        socket_id = request.form.get("sid")
        project_id = request.form.get("project_id")

        user_jwt = jwt.decode(
            request.token, app.config.JWT_SECRET, algorithms=["HS256"]
        )
        user = User.find_one(User.email == user_jwt.get("email")).run()

        if not user:
            return json_response({"error": "User not found."}, status=404)

        user_email = user.email
        gpt_process = {}

        for file in files:
            file_path = f"paper/{socket_id}-{file.name}"
            with open(file_path, "wb") as f:
                f.write(file.body)

        for file in files:
            file_path = f"paper/{socket_id}-{file.name}"
            task: EagerResult = add_paper.delay(
                file_path, socket_id, user_email, project_id
            )
            gpt_process[file.name] = task.id

        return json_response(gpt_process)

    elif request.method == "GET":
        task_id = request.args.get("task_id")
        task = run_assistant.AsyncResult(task_id)
        return json_response(task.result)


@app.route("/api/run_assistant", methods=["POST", "GET"])
async def run_assistant_endpoint(request: Request):
    """
    Handles the POST request for running the assistant.
    """
    if request.method == "POST":
        # Get the file and the socket id
        files = request.files.getlist("files[]")
        sid = request.form.get("sid")

        gpt_process = {}

        for file in files:
            file_path = f"paper/{sid}-{file.name}"
            with open(file_path, "wb") as f:
                f.write(file.body)

        for file in files:
            file_path = f"paper/{sid}-{file.name}"
            task: EagerResult = run_assistant.delay(file_path, sid)
            gpt_process[file.name] = task.id

        return json_response(gpt_process)

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
