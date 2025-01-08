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
from database.models.features import Features
from database.models.papers import Paper, PaperView
from database.models.projects import Project
from database.models.results import Result
from database.models.users import User
import socketio

from bunnet.operators import Or, In

from workers.celery_config import add_paper, another_task


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

            for proj in user_project.papers:
                print("proj ", len(proj.truth_ids))

            papers = [
                {
                    "task_id": pap.title,
                    "status": "success" if pap.truth_ids else "failed",
                    "file_name": pap.title,
                    "experiments": pap.experiments,
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


@app.route("/api/projects/features", methods=["GET", "POST", "PUT"])
async def project_features(request: Request):
    """
    A protected for adding or removing features to a project.
    """
    try:
        # for testing
        # user_jwt = jwt.decode(
        #     request.token, app.config.JWT_SECRET, algorithms=["HS256"]
        # )
        # user = User.find_one(User.email == user_jwt.get("email")).run()
        # if not user:
        #     return json_response({"error": "User not found."}, status=404)

        # Get the project features
        if request.method == "GET":
            project_id = request.args.get("project_id")
            user_project: Project = Project.get(project_id, fetch_links=True).run()

            # Check if the project exists
            if not user_project:
                return json_response({"error": "Project not found."}, status=404)

            # Already added features
            project_features = [
                {
                    "id": str(f.id),
                    "feature_name": f.feature_name,
                    "feature_description": f.feature_description,
                    "feature_identifier": f.feature_identifier,
                }
                for f in user_project.features
            ]

            return json_response(
                {"message": "Feature added.", "features": project_features}
            )

        # Add a new feature to the project
        if request.method == "POST":
            project_id = request.json.get("project_id")
            feature_ids = request.json.get("feature_ids")

            print("project_id ", request.json)

            user_project: Project = Project.get(project_id, fetch_links=True).run()

            # Check if the project exists
            if not user_project:
                return json_response({"error": "Project not found."}, status=404)

            # Already added features
            already_added_features = [str(f.id) for f in user_project.features]

            # Check if the feature exists and is not already added
            for f in feature_ids:
                feature: Features = Features.get(f).run()
                if not feature:
                    return json_response({"error": "Feature not found."}, status=404)

                if str(feature.id) not in already_added_features:
                    user_project.features.append(feature)

            user_project.save()

            return json_response({"message": "Feature added."})

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)
    except Exception as e:
        return json_response({"error": str(e)}, status=500)


@app.route("/api/projects/results", methods=["GET", "POST", "PUT"])
async def project_results(request: Request):
    """
    A protected for adding or removing features to a project.
    """
    try:
        # Get the project features
        if request.method == "GET":
            project_id = request.args.get("project_id")

            user_project: Project = Project.get(project_id).run()

            print("user_project ", user_project)
            # Check if the project exists
            if not user_project:
                return json_response({"error": "Project not found."}, status=404)

            project_results_r = Result.find(
                Result.project_id.id == user_project.id
            ).to_list()

            if not project_results_r:
                return json_response({"error": "Results not found."}, status=404)

            project_json_responses = [r.json_response for r in project_results_r]

            return json_response(
                {"message": "results found.", "results": project_json_responses}
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
            projects = Project.find(
                Project.user.id == user.id, fetch_links=True
            ).to_list()

            pr_response = [
                p.model_dump(
                    mode="json",
                    include=["id", "title", "description", "updated_at", "papers"],
                )
                for p in projects
            ]

            for proj in pr_response:
                proj["papers"] = [str(pap["id"]) for pap in proj["papers"]]

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
            # Get the page and page size (pagination)
            page = int(request.args.get("page", 1))
            page_size = int(request.args.get("page_size", 10))

            skip = (page - 1) * page_size
            limit = page_size

            total_papers = Paper.find({"user.$id": user.id}).count()

            papers = (
                Paper.find({"user.$id": user.id})
                .project(PaperView)
                .skip(skip)
                .limit(limit)
                .to_list()
            )

            pr_response = [p.model_dump(mode="json") for p in papers]
            print("papers_response ", pr_response)
            if papers:
                return json_response(
                    {
                        "papers": pr_response,
                        "total_papers": total_papers,
                        "page": page,
                        "page_size": page_size,
                    }
                )
            else:
                return json_response({"error": "Papers not found."}, status=404)

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)


@app.route("/api/features", methods=["GET", "POST"])
async def features(request: Request):
    """
    A protected route.
    """
    try:
        # Get all the features for the user and public features
        if request.method == "GET":

            user = User.find_one(
                User.email == "amirhossein.nakhaei@rwth-aachen.de"
            ).run()

            print("user ", user.id)

            experiment_feature = Features.find(
                Or(Features.user.id == None, Features.user.id == user.id)
            ).to_list()

            res = []
            for feature in experiment_feature:
                o = feature.model_dump()
                res.append(
                    {
                        "id": str(o["id"]),
                        "feature_name": o["feature_name"],
                        "feature_description": o["feature_description"],
                        "feature_identifier": o["feature_identifier"],
                    }
                )

            return json_response(
                body={
                    "response": "success",
                    "features": res,
                },
                status=200,
                content_type="application/json",
            )

        # Create a new feature
        elif request.method == "POST":
            data = request.json

            feature_name = data.get("feature_name")
            feature_description = data.get("feature_description", "")
            feature_identifier = data.get("feature_identifier")
            gpt_interface = data.get("gpt_interface")

            if not feature_name or not feature_identifier:
                return json_response({"error": "Missing required fields."}, status=400)

            user = User.find_one(
                User.email == "amirhossein.nakhaei@rwth-aachen.de"
            ).run()

            new_feature = Features(
                feature_name=feature_name,
                feature_parent="",
                feature_identifier=feature_identifier,
                feature_description=feature_description,
                feature_gpt_interface=gpt_interface,
                user=user.id,
            )

            new_feature.save()

            o = new_feature.model_dump()

            return json_response(
                {
                    "response": "success",
                    "feature": {
                        "id": str(o["id"]),
                        "feature_name": o["feature_name"],
                        "feature_description": o["feature_description"],
                        "feature_identifier": o["feature_identifier"],
                    },
                },
                status=201,
            )

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)
    except Exception as e:
        return json_response({"error": str(e)}, status=500)


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
        files = [request.files.get("file")]
        # files = request.files.getlist("files[]")
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
            file_path = f"papers/{socket_id}-{file.name}"
            with open(file_path, "wb") as f:
                f.write(file.body)

        for file in files:
            file_path = f"papers/{socket_id}-{file.name}"
            task: EagerResult = add_paper.delay(
                file_path,
                socket_id,
                user_email,
                project_id,
            )
            gpt_process[file.name] = task.id

        return json_response(gpt_process)

    elif request.method == "GET":
        task_id = request.args.get("task_id")
        task = add_paper.AsyncResult(task_id)
        return json_response(task.result)


@app.route("/api/run_paper", methods=["POST", "GET"])
async def run_assistant_with_features(request: Request):
    """
    Handles the POST request for running the assistant.
    """
    if request.method == "POST":
        try:
            user_jwt = jwt.decode(
                request.token, app.config.JWT_SECRET, algorithms=["HS256"]
            )
            user = User.find_one(User.email == user_jwt.get("email")).run()
            if not user:
                return json_response({"error": "User not found."}, status=404)

            # Get the file and the socket id
            file = request.files.get("file")
            requested_features = request.form.get("features")
            socket_id = request.form.get("sid")

            file_path = f"papers/{socket_id}-{file.name}"
            with open(file_path, "wb") as f:
                f.write(file.body)

            task: EagerResult = another_task.delay(
                file_path,
                socket_id,
                str(user.id),
            )

            print(json.loads(requested_features))

            return json_response({"status": task.id})
        except Exception as e:
            print("exception", e)
            return json_response({"status": False})


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
