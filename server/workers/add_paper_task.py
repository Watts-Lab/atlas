"""
Run the feature collection task for a paper.
"""

import os
from celery import Task
import socketio
import logging

from controllers.assisstant import run_assistant_api
from database.models.projects import Project
from database.models.results import Result
from database.models.users import User
from workers.celery_config import celery

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="add_paper")
def add_paper(
    self: Task,
    file_path: str,
    socket_id: str,
    user_email: str,
    project_id: str,
):
    """
    Task to create a task.
    """

    external_sio = socketio.RedisManager(
        os.getenv("CELERY_BROKER_URL"), write_only=True
    )

    task_id = self.request.id

    external_sio.emit(
        "status",
        {
            "status": "Starting assistant...",
            "progress": 0,
            "task_id": task_id,
            "done": False,
        },
        to=socket_id,
        namespace="/home",
    )

    print(f"User email: {user_email}")
    print(f"Project id: {project_id}")

    current_project = Project.get(project_id, fetch_links=True).run()

    user_features = []

    for feature in current_project.features:
        user_features.append(feature.feature_identifier)

    print(f"User features: {user_features}")

    logger.info("Running assistant for user %s", user_email)

    open_ai_res = run_assistant_api(
        file_path=file_path,
        sid=socket_id,
        sio=external_sio,
        task_id=task_id,
        project_id=project_id,
    )

    logger.info("Assistant run completed for user %s", user_email)
    logger.info("Assistant output: %s", open_ai_res)

    result_obj = Result(
        user=User.find_one(User.email == user_email).run(),
        json_response=open_ai_res["output"]["result"],
        prompt_token=open_ai_res["output"]["prompt_token"],
        completion_token=open_ai_res["output"]["completion_token"],
        quality=0.9,
        feature_list=user_features,
        run_id=task_id,
        project_id=current_project,
    )

    result_obj.save()

    external_sio.emit(
        "status",
        {
            "status": "Saving results to database...",
            "progress": 90,
            "task_id": task_id,
            "done": False,
        },
        to=socket_id,
        namespace="/home",
    )

    external_sio.emit(
        "status",
        {
            "status": "Finishing up...",
            "progress": 100,
            "task_id": task_id,
            "done": True,
        },
        to=socket_id,
        namespace="/home",
    )

    return {
        "message": "Success",
        "file_name": open_ai_res["file_name"],
        "experiments": open_ai_res["output"]["result"],
    }
