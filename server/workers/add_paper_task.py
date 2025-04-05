"""
Run the feature collection task for a paper.
"""

from datetime import datetime
import logging
from celery import Task
from controllers.assisstant import run_assistant_api
from database.models.projects import Project
from database.models.results import Result
from database.models.users import User
from workers.celery_config import celery
from workers.utils.socket_emitter import SocketEmmiter

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

    task_id = self.request.id

    emitter = SocketEmmiter(socket_id, task_id)

    emitter.emit_status(
        message="Starting task...",
        progress=0,
    )

    current_project = Project.get(project_id, fetch_links=True).run()

    user_features = [feature.feature_identifier for feature in current_project.features]

    result_obj = Result(
        user=User.find_one(User.email == user_email).run(),
        json_response={},
        prompt_token=0,
        completion_token=0,
        quality=0.9,
        feature_list=user_features,
        run_id=task_id,
        project_id=current_project,
    )

    result_obj.save()

    logger.info("Running assistant for user %s", user_email)

    open_ai_res = run_assistant_api(
        file_path=file_path,
        project_id=project_id,
        emitter=emitter,
    )

    logger.info("Assistant run completed for user %s", user_email)
    logger.info("Assistant output: %s", open_ai_res)

    emitter.emit_status(
        message="Saving results...",
        progress=90,
    )

    result_obj.json_response = open_ai_res["output"]["result"]
    result_obj.prompt_token = open_ai_res["output"]["prompt_token"]
    result_obj.completion_token = open_ai_res["output"]["completion_token"]
    result_obj.finished = True
    result_obj.updated_at = datetime.now()

    result_obj.save()

    emitter.emit_done()

    return {
        "message": "Success",
        "file_name": open_ai_res["file_name"],
        "experiments": open_ai_res["output"]["result"],
    }
