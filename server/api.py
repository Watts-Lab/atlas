"""This module contains the RESTful API endpoint for atlas."""

import argparse
import os

import socketio
from bunnet import PydanticObjectId
from bunnet.operators import In, Or
from config.app_config import AppConfig
from controllers.login import login_user, logout_user, validate_token, validate_user
from database.database import init_db
from database.models.features import Features
from database.models.papers import Paper, PaperView
from database.models.projects import Project
from database.schemas.gpt_interface import FeatureCreate
from dotenv import load_dotenv
from routes.auth import require_jwt
from routes.error_handler import error_handler
from routes.v1 import v1_blueprint
from sanic import Sanic
from sanic import json as json_response
from sanic.request import Request
from sanic.worker.manager import WorkerManager
from sanic_ext import Extend
from workers.celery_config import add_paper, reprocess_paper
from workers.strategies.strategy_factory import ExtractionStrategyFactory

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

Extend(app)

# Initialize redis url
redis_broker_url = os.getenv("CELERY_BROKER_URL")
redis_result_backend = os.getenv("CELERY_RESULT_BACKEND")

# For testing purposes if redis is not set
mgr = None
if redis_broker_url:
    mgr = socketio.AsyncRedisManager(redis_broker_url)

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


@app.route(
    "/api/projects/<project_id:str>/features",
    methods=["GET", "POST", "PUT", "DELETE"],
    name="project_features",
)
@require_jwt
@error_handler
async def project_features(request: Request, project_id: str):
    """
    A protected for adding or removing features to a project.
    """
    # Get the project features
    if request.method == "GET":
        user_project: Project = Project.get(project_id, fetch_links=True).run()

        # Check if the project exists
        if not user_project:
            return json_response({"error": "Project not found."}, status=404)

        # Already added features
        project_feature_list = [
            {
                "id": str(f.id),
                "feature_name": f.feature_name,
                "feature_description": f.feature_description,
                "feature_identifier": f.feature_identifier,
                "created_by": "user" if f.user else "provider",
            }
            for f in user_project.features
        ]

        return json_response(
            {"message": "Project feature list.", "features": project_feature_list},
            status=200,
        )

    # Modify features of a project
    if request.method == "POST":
        project_id = request.json.get("project_id")
        feature_ids = request.json.get("feature_ids", [])

        user_project: Project = Project.get(project_id, fetch_links=True).run()

        # Check if the project exists
        if not user_project:
            return json_response({"error": "Project not found."}, status=404)

        feature_docs = Features.find(
            In(Features.id, [PydanticObjectId(p) for p in feature_ids])
        ).run()

        if len(feature_docs) != len(feature_ids):
            return json_response({"error": "Some features not found."}, status=404)

        user_project.features = feature_docs

        user_project.save()

        return json_response({"message": "Feature updated."}, status=201)

    # Remove a feature from the project
    if request.method == "DELETE":

        feature_ids_to_remove = request.json.get("feature_ids", [])

        # Retrieve the project (no need to fetch_links if you only want to manipulate IDs)
        user_project = Project.get(project_id, fetch_links=False).run()

        if not user_project:
            return json_response({"error": "Project not found."}, status=404)

        # Filter out any features from user_project.features whose IDs match feature_ids_to_remove
        user_project.features = [
            f for f in user_project.features if str(f.id) not in feature_ids_to_remove
        ]

        # Save once
        user_project.save()

        return json_response({"message": "Feature removed."}, status=200)


@app.route("/api/user/papers", methods=["GET"])
@require_jwt
@error_handler
async def user_papers(request: Request):
    """
    A protected route that fetches the user's papers, supporting pagination.
    Returns JSON with "papers", "total_papers", "page", and "page_size".
    """

    if request.method == "GET":
        # Validate user token
        user = request.ctx.user
        if not user:
            return json_response({"error": "User not found."}, status=404)

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

        return json_response(
            {
                "papers": pr_response,
                "total_papers": total_papers,
                "page": page,
                "page_size": page_size,
            },
            status=200,
        )


@app.route("/api/features", methods=["GET", "POST"], name="all_features")
@require_jwt
@error_handler
async def features(request: Request):
    """
    A protected route.
    """
    # Validate user from JWT
    user = request.ctx.user

    # Get all the features for the user and public features
    if request.method == "GET":
        # Get the user features and public features (user.id == None)
        experiment_feature = Features.find(
            Or(
                Features.user.id == None,  # pylint: disable=C0121
                Features.user.id == user.id,
                Features.is_shared == True,
            )
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
                    "feature_type": o["feature_gpt_interface"].get("type", "string"),
                    "feature_prompt": o["feature_gpt_interface"].get(
                        "description", "No prompt found."
                    ),
                    "feature_enum_options": o["feature_gpt_interface"].get("enum", []),
                    "is_shared": o.get("is_shared", False),
                    "created_by": "user" if o.get("user") else "provider",
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
    if request.method == "POST":

        payload = FeatureCreate(**request.json)
        # build the JSON-schema for GPT
        gpt_iface = payload.to_gpt_interface()

        feat = Features(
            feature_name=payload.feature_name,
            feature_identifier=payload.feature_identifier,
            feature_parent=payload.feature_parent,
            feature_description=payload.feature_description,
            is_shared=payload.is_shared,
            feature_gpt_interface=gpt_iface,
            user=user.id,
        )
        feat.save()

        out = feat.model_dump()

        return json_response(
            {
                "response": "success",
                "feature": {
                    "id": str(out["id"]),
                    "feature_name": out["feature_name"],
                    "feature_identifier": out["feature_identifier"],
                    "feature_description": out["feature_description"],
                },
            },
            status=201,
        )


@app.route("/api/features/<feature_id:str>", methods=["DELETE"], name="delete_feature")
@require_jwt
@error_handler
async def delete_feature(request: Request, feature_id: str):
    """
    A protected route for deleting a feature by its ID.
    """
    user = request.ctx.user

    try:
        feat: Features = Features.get(feature_id, fetch_links=True).run()
    except Exception:
        return json_response({"error": "Feature not found."}, status=404)

    if feat.user != user:
        return json_response({"error": "Forbidden."}, status=403)

    feat.delete()
    return json_response({"response": "success"}, status=200)


@app.route("/api/login", methods=["POST"], name="login")
async def login(request: Request):
    """
    Handles the POST request for logging in the user.
    """
    if request.method == "POST":
        data = request.json
        email = data.get("email")
        return await login_user(email=email)


@app.route("/api/logout", methods=["POST"], name="logout")
async def logout(request: Request):
    """
    Handles the POST request for logging in the user.
    """
    if request.method == "POST":
        return await logout_user()


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


@app.route("/api/check", methods=["GET"], name="check_token")
async def check_token(request: Request):
    """
    Handles the POST request for validating the magic link.
    """
    if request.method == "GET":
        return await validate_token(request=request)


@app.route("/api/add_paper", methods=["POST", "GET"], name="add_paper_to_project")
@require_jwt
@error_handler
async def run_assistant_projects(request: Request):
    """Handles the POST request for running the assistant."""
    user = request.ctx.user
    if request.method == "POST":
        files = request.files.getlist("files[]")
        if not files:
            return json_response({"error": "No file uploaded."}, status=400)
        socket_id = request.form.get("sid")
        project_id = request.form.get("project_id")
        strategy_type = request.form.get("strategy_type", "assistant_api")
        available_strategies = ExtractionStrategyFactory.get_available_strategies()
        if strategy_type not in available_strategies:
            return json_response(
                {"error": f"Invalid strategy type. Available: {available_strategies}"},
                status=400,
            )
        user_email = user.email
        gpt_process = {}
        # Save files temporarily
        for file in files:
            file_path = f"papers/{socket_id}-{file.name}"
            with open(file_path, "wb") as f:
                f.write(file.body)
        # Process files
        for file in files:
            file_path = f"papers/{socket_id}-{file.name}"
            task = add_paper.delay(
                file_path,
                socket_id,
                user_email,
                project_id,
                strategy_type,
                original_filename=file.name,
            )
            gpt_process[file.name] = task.id
        return json_response(gpt_process)
    if request.method == "GET":
        task_id = request.args.get("task_id")
        task = add_paper.AsyncResult(task_id)
        return json_response(task.result)


@app.route(
    "/api/reprocess_paper/<paper_id>", methods=["POST"], name="reprocess_paper_from_s3"
)
@require_jwt
@error_handler
async def reprocess_paper_from_s3(request: Request, paper_id: str):
    """Reprocess an existing paper."""
    user = request.ctx.user
    data = request.json
    project_id = data.get("project_id")
    strategy_type = data.get("strategy_type", "assistant_api")
    socket_id = data.get("sid")

    if not project_id:
        return json_response({"error": "project_id is required"}, status=400)

    task = reprocess_paper.delay(
        paper_id=paper_id,
        socket_id=socket_id,
        user_email=user.email,
        project_id=project_id,
        strategy_type=strategy_type,
    )

    return json_response({"task_id": task.id, "paper_id": paper_id})


@app.route(
    "/api/reprocess_project/<project_id>",
    methods=["POST"],
    name="reprocess_all_papers_in_project",
)
@require_jwt
@error_handler
async def reprocess_all_papers_in_project(request: Request, project_id: str):
    """Reprocess all papers in a project."""
    user = request.ctx.user
    data = request.json
    strategy_type = data.get("strategy_type", "assistant_api")
    socket_id = data.get("sid")

    try:
        # Get the project and verify ownership
        project: Project = Project.get(
            project_id, fetch_links=True, nesting_depth=1
        ).run()

        if not project:
            return json_response({"error": "Project not found"}, status=404)

        # Start reprocessing tasks for all papers
        task_ids = {}
        for ppr in project.papers:
            paper_id = str(ppr.id)
            task = reprocess_paper.delay(
                paper_id=paper_id,
                socket_id=socket_id,
                user_email=user.email,
                project_id=project_id,
                strategy_type=strategy_type,
            )
            task_ids[paper_id] = task.id

        return json_response(
            {
                "message": f"Started reprocessing {len(task_ids)} papers",
                "task_ids": task_ids,
                "total_papers": len(task_ids),
            }
        )

    except Exception as e:

        return json_response({"error": str(e)}, status=500)


@app.get("/health")
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
