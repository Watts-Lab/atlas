# workers/tasks/process_papers.py
"""
This module processes uploaded papers, triggering the assistant API.
It uses Celery for asynchronous execution and emits socket updates.
"""

import logging
import os
from datetime import datetime
from typing import Optional, Tuple

from celery import Task
from controllers.assisstant import run_assistant_api
from database.models.papers import Paper
from database.models.project_paper_result import ProjectPaperResult
from database.models.projects import Project
from database.models.results import Result
from database.models.users import User
from services.llm_credentials import BudgetExceededError, MissingPlatformKeyError
from workers.celery_config import celery
from workers.services.file_s3_service import FileService
from workers.services.socket_emitter import SocketEmmiter

logger = logging.getLogger(__name__)


class BaseTaskWithCleanup(Task):
    """Base task to handle cleanup and result updates."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.file_service = FileService()

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
            result_obj = Result.find_one(Result.task_id == task_id).run()
            if not result_obj:
                logger.info(
                    "No result record to update for task_id: %s (likely project-less upload)",
                    task_id,
                )
                return
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

        # Emit failure status to socket
        socket_id = kwargs.get("socket_id") or (args[1] if len(args) > 1 else None)
        if socket_id:
            try:
                emitter = SocketEmmiter(socket_id, task_id)
                emitter.emit_status(
                    message=f"Task failed: {str(exc)}",
                    progress=100,
                    done=True,
                    status="FAILURE",
                )
                emitter.emit_done()
            except Exception as socket_error:
                logger.error("Failed to emit failure status: %s", socket_error)

        # Finalize with an empty response.
        self.update_result(
            task_id, extra_data={"json_response": {"paper": "failed"}}, finished=True
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def on_success(self, retval, task_id, args, kwargs):
        logger.info("Task %s completed successfully", task_id)

        # Emit success status to socket
        socket_id = kwargs.get("socket_id") or (args[1] if len(args) > 1 else None)
        if socket_id:
            try:
                emitter = SocketEmmiter(socket_id, task_id)
                emitter.emit_status(
                    message="Task completed successfully",
                    progress=100,
                    done=True,
                    status="SUCCESS",
                )
                emitter.emit_done()
            except Exception as socket_error:
                logger.error("Failed to emit success status: %s", socket_error)

        super().on_success(retval, task_id, args, kwargs)

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        logger.info("Task %s finished with status: %s", task_id, status)

        # Only update result if not already updated and not a retry
        if status != "RETRY":
            self.update_result(task_id)

        # Clean up local file if it exists
        if len(args) > 0:
            file_path = args[0]
            if file_path and os.path.isfile(file_path):
                os.remove(file_path)
                logger.info("Removed file: %s", file_path)

        # Clean up any temp files created during processing
        temp_file_path = kwargs.get("_temp_file_path")
        if temp_file_path and os.path.isfile(temp_file_path):
            os.remove(temp_file_path)
            logger.info("Removed temp file: %s", temp_file_path)

        super().after_return(status, retval, task_id, args, kwargs, einfo)


def _is_successful_result(result: Result) -> bool:
    """Return True if *result* holds a completed, non-error extraction.

    Used as an idempotency guard on retries: a result that already finished with
    a real ``json_response`` (not a failure marker) means the paid LLM call
    already happened and must not be repeated/re-metered.
    """
    if not result or not getattr(result, "finished", False):
        return False
    response = getattr(result, "json_response", None)
    if not response or not isinstance(response, dict):
        return False
    # Failure records are stored as finished results with an "error" marker.
    if response.get("paper") == "failed" or "error" in response:
        return False
    return True


def create_result_record(
    task_id: str,
    user: User,
    paper: Paper,
    project: Project,
) -> Tuple[Result, int]:
    """
    Create a new result record with versioning support.
    Returns tuple of (result_obj, version)
    """
    user_features = [feature.feature_identifier for feature in project.features]

    # Determine version number
    version = 1
    previous_version = None

    # Get all previous results for this paper-project combination
    previous_results = (
        Result.find(
            Result.paper.id == paper.id,
            Result.project.id == project.id,
        )
        .sort("-version")
        .to_list()
    )

    logger.info(
        "Found %d previous results for paper %s in project %s",
        len(previous_results),
        paper.id,
        project.id,
    )

    if previous_results:
        # Get the latest version number
        latest_result = previous_results[0]
        version = latest_result.version + 1
        previous_version = latest_result

        # Mark all previous versions as not latest
        for prev_result in previous_results:
            if prev_result.is_latest:
                prev_result.is_latest = False
                prev_result.save()

    result_obj = Result(
        user=user,
        paper=paper,
        project=project,
        json_response={},
        prompt_token=0,
        completion_token=0,
        feature_list=user_features,
        task_id=task_id,
        finished=False,
        version=version,
        is_latest=True,
        previous_version=previous_version,
    )
    result_obj.save()

    logger.info(
        "Created result record version %s for paper %s in project %s (task %s)",
        version,
        paper.id,
        project.id,
        task_id,
    )
    return result_obj, version


def update_project_paper_mapping(
    project: Project, paper: Paper, result: Result
) -> ProjectPaperResult:
    """Update or create project-paper-result mapping."""
    mapping = ProjectPaperResult.find_one(
        ProjectPaperResult.project.id == project.id,
        ProjectPaperResult.paper.id == paper.id,
    ).run()

    if mapping:
        mapping.result = result
        mapping.all_results.append(result)
        mapping.updated_at = datetime.now()
        mapping.save()
    else:
        mapping = ProjectPaperResult(
            project=project, paper=paper, result=result, all_results=[result]
        )
        mapping.save()

    return mapping


@celery.task(bind=True, name="add_paper", base=BaseTaskWithCleanup, max_retries=1)
def add_paper(
    self: Task,
    file_path: str,
    socket_id: str,
    user_email: str,
    project_id: str,
    strategy_type: str = "assistant_api",
    original_filename: Optional[str] = None,
    paper_id: Optional[str] = None,  # For reprocessing existing papers
    staged_s3_key: Optional[str] = None,  # For curl/presigned uploads
):
    """
    Process the uploaded paper with S3 integration and run the assistant API.
    Always reprocesses the paper, creating a new version if needed.
    """
    task_id = self.request.id
    emitter = SocketEmmiter(socket_id, task_id)
    temp_file_path = None
    processing_file_path = file_path
    result_obj = None
    is_new_paper = True

    try:
        emitter.emit_status(message="Starting...", progress=0)

        # Get user and project
        user = User.find_one(User.email == user_email).run()
        version = 1

        current_project = None
        if project_id and project_id.strip():
            try:
                # Pydantic/Bunnet might raise ValueError if ID is not a valid PydanticObjectId
                current_project = Project.get(project_id, fetch_links=True).run()
                if not current_project:
                    logger.warning("Project %s not found in add_paper task", project_id)
            except Exception as e:
                logger.warning("Failed to fetch project %s: %s", project_id, e)
                current_project = None

        if not original_filename:
            original_filename = os.path.basename(file_path)

        # Check if this is a retry by looking for existing result with this task_id
        existing_result = Result.find_one(
            Result.task_id == task_id, fetch_links=True
        ).run()
        if existing_result:
            # This is a retry, use the existing result object
            result_obj = existing_result
            logger.info("Using existing result for retry of task %s", task_id)

            # Idempotency guard: if a previous attempt already completed the
            # (paid) extraction successfully, do NOT call the LLM again. This
            # prevents charging the user twice when a retry is triggered by a
            # failure that happened *after* extraction (e.g. a save error).
            if _is_successful_result(existing_result):
                logger.info(
                    "Task %s already has a completed extraction; skipping re-run.",
                    task_id,
                )
                emitter.emit_status(
                    message="Paper already processed", progress=100, done=True
                )
                completed_paper = existing_result.paper
                return {
                    "status": "success",
                    "file_name": original_filename,
                    "experiments": existing_result.json_response,
                    "paper_id": (str(completed_paper.id) if completed_paper else None),
                    "result_id": str(existing_result.id),
                    "version": getattr(existing_result, "version", 1),
                    "cached": True,
                    "project_id": (
                        str(current_project.id) if current_project else None
                    ),
                }
        else:
            # New task, proceed with normal flow
            # Handle paper - either existing or new
            if paper_id:
                # Reprocessing existing paper
                paper = Paper.get(paper_id).run()
                if not paper:
                    raise ValueError(f"Paper {paper_id} not found")

                # Download from S3 to temp location
                emitter.emit_status(
                    message="Downloading paper from storage...", progress=5
                )
                temp_file_path = self.file_service.download_from_s3(paper.s3_key)
                processing_file_path = temp_file_path
                is_new_paper = False
            else:
                # New paper upload. The bytes may already be staged in S3 (the
                # presigned "upload by curl" flow) — if so, pull them down to a
                # temp file first so the normal hash/dedup path can run.
                if staged_s3_key:
                    emitter.emit_status(
                        message="Retrieving uploaded paper...", progress=5
                    )
                    temp_file_path = self.file_service.download_from_s3(staged_s3_key)
                    processing_file_path = temp_file_path
                    file_path = temp_file_path
                    if not original_filename:
                        original_filename = os.path.basename(staged_s3_key)

                emitter.emit_status(message="Processing uploaded paper...", progress=5)
                paper, is_new_paper = self.file_service.get_or_create_paper(
                    file_path=processing_file_path,
                    user=user,
                    original_filename=original_filename,
                )

                # The staged object was a temporary holding spot; the canonical
                # copy now lives under the hashed key from get_or_create_paper.
                if staged_s3_key:
                    try:
                        self.file_service.s3_client.delete_object(
                            Bucket=self.file_service.bucket_name, Key=staged_s3_key
                        )
                    except Exception as e:
                        logger.warning(
                            "Failed to remove staged upload %s: %s", staged_s3_key, e
                        )

                if not is_new_paper:
                    emitter.emit_status(
                        message="Paper exists in system, creating new version...",
                        progress=8,
                    )

            # Create result record with versioning - ONLY if project exists
            if current_project:
                result_obj, version = create_result_record(
                    task_id=task_id,
                    user=user,
                    paper=paper,
                    project=current_project,
                )
            else:
                result_obj = None
                logger.info("Skipping result record creation - no project context")

        # Process the paper ONLY if project exists
        if current_project:
            emitter.emit_status(
                message=f"Extracting features using {strategy_type}...", progress=15
            )
            emitter.emit_status(
                message=f"Processing paper (v{version})...", progress=10
            )

            logger.info(
                "Executing API call for user %s with strategy %s",
                user_email,
                strategy_type,
            )

            open_ai_res = run_assistant_api(
                file_path=processing_file_path,
                project_id=project_id,
                emitter=emitter,
                user=user,
                strategy_type=strategy_type,
            )

            emitter.emit_status(message="Saving results...", progress=90)

            # Update result
            if result_obj:  # Only update if a result object was created
                result_obj.json_response = open_ai_res["output"]["result"]
                result_obj.prompt_token = open_ai_res["output"]["prompt_tokens"]
                result_obj.completion_token = open_ai_res["output"]["completion_tokens"]
                result_obj.finished = True
                result_obj.updated_at = datetime.now()
                result_obj.save()

            logger.info("Results saved for task %s", task_id)

            # Update project mapping ONLY if project exists
            if not existing_result:  # Only update mapping if this wasn't a retry
                update_project_paper_mapping(current_project, paper, result_obj)

                # Add paper to project if not already there
                if paper not in current_project.papers:
                    current_project.papers.append(paper)
                    current_project.updated_at = datetime.now()
                    current_project.save()

            emitter.emit_status(
                message="Paper processed successfully", progress=100, done=True
            )

            return {
                "status": "success",
                "file_name": original_filename,
                "experiments": open_ai_res["output"]["result"],
                "paper_id": str(paper.id),
                "result_id": str(result_obj.id) if result_obj else None,
                "version": version,
                "cached": False,
                "project_id": str(current_project.id),
            }
        else:
            # Just library upload, no extraction
            emitter.emit_status(
                message="Paper added to library", progress=100, done=True
            )
            return {
                "status": "success",
                "file_name": original_filename,
                "paper_id": str(paper.id),
                "message": "Paper added to library (no extraction run)",
            }

    except (BudgetExceededError, MissingPlatformKeyError) as exc:
        # Credential/budget problems are deterministic — retrying wastes work and
        # (for a genuine over-limit user) money once a key is added. Fail fast.
        logger.warning("Extraction blocked for task %s: %s", task_id, exc)
        emitter.emit_status(
            message=str(exc),
            progress=100,
            done=True,
            status="FAILURE",
        )
        return {
            "status": "error",
            "error": str(exc),
            "file_name": original_filename,
            "paper_id": str(paper.id) if "paper" in locals() and paper else None,
        }
    except Exception as exc:
        logger.exception("Error in task %s: %s", task_id, exc)

        # Emit failure status
        emitter.emit_status(
            message=f"Processing failed: {str(exc)}",
            progress=100,
            done=True,
            status="FAILURE",
        )

        # Only create a failed result if we haven't created one yet AND this is the last retry AND we have a project
        if (
            not result_obj
            and current_project
            and self.request.retries >= self.max_retries
        ):
            # Create a failed result record
            paper = Paper.find_one(Paper.original_filename == original_filename).run()
            if paper:
                result_obj = Result(
                    user=user,
                    paper=paper,
                    project=current_project,
                    json_response={"error": str(exc), "paper": "failed"},
                    prompt_token=0,
                    completion_token=0,
                    feature_list=[],
                    task_id=task_id,
                    finished=True,
                    version=1,
                    is_latest=True,
                )
                result_obj.save()
                update_project_paper_mapping(current_project, paper, result_obj)

        raise self.retry(exc=exc, countdown=5)
    finally:
        # Store temp file path for cleanup in after_return
        self.request.kwargs["_temp_file_path"] = temp_file_path
        # Store socket_id for cleanup hooks
        self.request.kwargs["socket_id"] = socket_id
        emitter.emit_done()


@celery.task(bind=True, name="reprocess_paper")
def reprocess_paper(
    self: Task,
    paper_id: str,
    socket_id: str,
    user_email: str,
    project_id: str,
    strategy_type: str = "assistant_api",
):
    """
    Reprocess an existing paper from S3.
    This is a wrapper around add_paper for cleaner API.
    """
    paper = Paper.get(paper_id).run()
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")

    # Call add_paper directly instead of using apply_async
    # This ensures the same task_id flows through
    return add_paper.apply_async(
        args=[""],  # Empty file path since we'll download from S3
        kwargs={
            "socket_id": socket_id,
            "user_email": user_email,
            "project_id": project_id,
            "strategy_type": strategy_type,
            "original_filename": paper.original_filename,
            "paper_id": paper_id,
        },
    )
