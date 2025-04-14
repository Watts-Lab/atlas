"""
This module processes uploaded papers, triggering the assistant API.
It uses Celery for asynchronous execution and emits socket updates.
"""

from datetime import datetime
import logging
import os
from celery import Task
from controllers.assisstant import run_assistant_api
from database.models.projects import Project
from database.models.results import Result
from database.models.users import User
from workers.celery_config import celery
from workers.utils.socket_emitter import SocketEmmiter


logger = logging.getLogger(__name__)


class BaseTaskWithCleanup(Task):
    """Base task to handle cleanup and result updates."""

    def run(self, *args, **kwargs):
        """
        Override the abstract run method from Task.
        This method should be implemented by subclasses or used as a placeholder.
        """
        raise NotImplementedError("Subclasses must implement the run method.")

    def update_result(
        self, task_id: str, extra_data: dict = None, finished: bool = True
    ):
        """
        Update the result in the database.
        """
        try:
            result_query = Result.find_one(Result.task_id == task_id)
            if not result_query:
                logger.error("No result found for task_id: %s", task_id)
                return
            result_obj = result_query.run()
            if extra_data:
                result_obj.json_response = extra_data.get(
                    "json_response", result_obj.json_response
                )
            result_obj.finished = finished
            result_obj.updated_at = datetime.now()
            result_obj.save()
        except Exception as e:
            logger.error("Failed updating result for task %s: %s", task_id, e)

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error("Task %s failed after all retries. Error: %s", task_id, exc)
        # Finalize with an empty response.
        self.update_result(
            task_id, extra_data={"json_response": {"paper": "failed"}}, finished=True
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        logger.info("Task %s finished with status: %s", task_id, status)
        if status != "RETRY":
            self.update_result(task_id)
        # remove the task file
        file_path = args[0]
        if os.path.isfile(file_path):
            os.remove(file_path)
            logger.info("Removed file: %s", file_path)
        else:
            logger.error("File not found: %s", file_path)
        super().after_return(status, retval, task_id, args, kwargs, einfo)


@celery.task(bind=True, name="add_paper", base=BaseTaskWithCleanup, max_retries=1)
def add_paper(
    self: Task, file_path: str, socket_id: str, user_email: str, project_id: str
):
    """
    Process the uploaded paper and run the assistant API.
    """
    task_id = self.request.id
    emitter = SocketEmmiter(socket_id, task_id)

    # Retrieve project and feature info.
    current_project = Project.get(project_id, fetch_links=True).run()
    user_features = [feature.feature_identifier for feature in current_project.features]

    # Create the result record only if it doesn't exist.
    if not Result.find_one(Result.task_id == task_id).count():
        result_obj = Result(
            user=User.find_one(User.email == user_email).run(),
            json_response={},
            prompt_token=0,
            completion_token=0,
            quality=0,
            feature_list=user_features,
            task_id=task_id,
            project_id=current_project,
            finished=False,
        )
        result_obj.save()
        logger.info("Created result record for task %s", task_id)
    else:
        logger.info("Result record already exists for task %s", task_id)

    try:
        emitter.emit_status(message="Starting...", progress=0)

        logger.info("Executing API call for user %s", user_email)

        base_temperature = 0.7
        # Increase by 0.1 per retry attempt (adjust increment as needed)
        current_temperature = base_temperature + (self.request.retries * 0.2)

        open_ai_res = run_assistant_api(
            file_path=file_path,
            project_id=project_id,
            emitter=emitter,
            gpt_temperature=current_temperature,
        )
        emitter.emit_status(message="Saving results...", progress=90)

        result_obj = Result.find_one(Result.task_id == task_id).run()
        result_obj.json_response = open_ai_res["output"]["result"]
        result_obj.prompt_token = open_ai_res["output"]["prompt_token"]
        result_obj.completion_token = open_ai_res["output"]["completion_token"]
        result_obj.finished = True
        result_obj.updated_at = datetime.now()
        result_obj.save()
        logger.info("Results saved for task %s", task_id)
    except Exception as exc:
        logger.exception("Error in task %s: %s", task_id, exc)
        raise self.retry(exc=exc, countdown=5)
    finally:
        emitter.emit_done()

    return {
        "message": "Success",
        "file_name": open_ai_res["file_name"],
        "experiments": open_ai_res["output"]["result"],
    }
