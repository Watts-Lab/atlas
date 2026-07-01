"""
endpoint for running the assistant
"""

import logging
import os
import uuid
from typing import Any, Dict

from database.models.projects import Project
from database.models.users import User
from openai import OpenAI
from services.llm_credentials import (
    LlmCredentials,
    record_usage,
    resolve_and_check,
)
from services.model_pricing import micros_to_usd
from workers.services.socket_emitter import SocketEmmiter
from workers.strategies.strategy_factory import ExtractionStrategyFactory

logger = logging.getLogger(__name__)

UPLOAD_DIRECTORY = "papers/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


def _provider_for_strategy(strategy_type: str) -> str:
    """Map an extraction strategy to the LLM provider it calls."""
    return "anthropic" if strategy_type == "anthropic_json_schema" else "openai"


def run_assistant_api(
    file_path: str,
    project_id: str,
    emitter: SocketEmmiter,
    user: User,
    strategy_type: str = "assistant_api",
) -> Dict[str, Any]:
    """
    Runs the assistant API to extract features from a paper.

    Credentials are resolved centrally: the user's own provider key is used when
    present (and never metered), otherwise the Atlas platform key is used and the
    resulting token usage is charged against the user's monthly budget. Budget is
    verified *before* any provider call so an over-limit user fails fast.

    Args:
        file_path: Path to the uploaded file
        project_id: ID of the project
        emitter: Socket emitter for progress updates
        user: The owner of the paper (for credential resolution + metering)
        strategy_type: Type of extraction strategy to use

    Returns:
        Dictionary containing extraction results
    """
    provider = _provider_for_strategy(strategy_type)
    # Resolve the key + budget decision atomically, and fail before spending
    # money if this is a metered (platform-key) call over the monthly limit.
    credentials: LlmCredentials = resolve_and_check(user, provider)

    # The strategy factory always receives an OpenAI client built from the
    # resolved key. OpenAI strategies use it directly; the Anthropic strategy
    # ignores it and builds its own client from the same resolved key.
    openai_key = (
        credentials.api_key if provider == "openai" else os.getenv("OPENAI_API_KEY")
    )
    client = OpenAI(api_key=openai_key) if openai_key else OpenAI()

    try:
        # Get project for custom prompt - only if project_id is provided
        project = None
        custom_prompt = None
        if project_id and project_id.strip():
            try:
                project = Project.get(project_id).run()
                if project:
                    custom_prompt = (
                        project.prompt
                        if project.prompt and project.prompt.strip()
                        else None
                    )
            except Exception as e:
                logger.warning(
                    "Failed to fetch project %s in run_assistant_api: %s", project_id, e
                )

        # Create strategy - ensure strategy factory can handle None project_id if needed
        # (Though we already refactored extraction strategy to allow Optional[str])
        strategy = ExtractionStrategyFactory.create_strategy(
            strategy_type=strategy_type,
            client=client,
            project_id=project_id if project_id and project_id.strip() else None,
            emitter=emitter,
            api_key=credentials.api_key,
        )

        logger.info("Using extraction strategy: %s", strategy.get_strategy_name())

        # Execute extraction
        output = strategy.extract(
            file_path=file_path,
            custom_prompt=custom_prompt,
        )

        # Meter the call's USD cost against the monthly budget — a no-op for BYO
        # keys. Only reached on success, so failed/interrupted calls are never
        # charged. Pricing uses the model the strategy actually called.
        model = output.get("model") or ""
        charged_micros = record_usage(
            user,
            credentials,
            model=model,
            prompt_tokens=output.get("prompt_tokens", 0) or 0,
            completion_tokens=output.get("completion_tokens", 0) or 0,
        )

        file_name = file_path.split("/")[-1]

        return {
            "file_name": file_name,
            "output": output,
            "strategy_used": strategy.get_strategy_name(),
            "metered": not credentials.is_byo,
            "usd_charged": micros_to_usd(charged_micros),
        }

    except Exception as e:
        logger.error("Error in run_assistant_api: %s", e)
        raise


def add_paper_to_project_controller(user, files, socket_id, project_id, strategy_type):
    """
    Logic for adding papers to a project.
    """
    from workers.celery_config import add_paper

    if not files:
        return {"error": "No file uploaded.", "status": 400}

    available_strategies = ExtractionStrategyFactory.get_available_strategies()
    if strategy_type not in available_strategies:
        return {
            "error": f"Invalid strategy type. Available: {available_strategies}",
            "status": 400,
        }

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

    return gpt_process


def create_paper_upload_controller(user, filename, project_id, strategy_type):
    """Issue a presigned URL the caller can upload a PDF to directly.

    The bytes go straight from the client to S3 (the API never sees them).
    The returned ``upload_token`` is later passed to
    ``finalize_paper_upload_controller`` to start extraction.
    """
    from workers.services.file_s3_service import MAX_UPLOAD_BYTES, FileService

    available_strategies = ExtractionStrategyFactory.get_available_strategies()
    if strategy_type not in available_strategies:
        return {
            "error": f"Invalid strategy type. Available: {available_strategies}",
            "status": 400,
        }

    safe_name = os.path.basename(filename or "paper.pdf").replace(" ", "_")
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"

    # Opaque staging key; the canonical hashed key is assigned during processing.
    token = uuid.uuid4().hex
    s3_key = f"papers/uploads/{user.id}/{token}/{safe_name}"

    file_service = FileService()
    # Presigned POST (not PUT) so S3 itself enforces a size cap at upload time
    # via the content-length-range condition — the equivalent of nginx's
    # client_max_body_size for uploads that go straight to S3.
    presigned = file_service.generate_presigned_post(s3_key)

    return {
        "upload_url": presigned["url"],
        "upload_fields": presigned["fields"],
        "upload_token": s3_key,
        "filename": safe_name,
        "method": "POST",
        "max_bytes": MAX_UPLOAD_BYTES,
        "expires_in": 3600,
        "project_id": project_id,
        "strategy_type": strategy_type,
    }


def finalize_paper_upload_controller(
    user, upload_token, project_id, strategy_type, socket_id
):
    """Start extraction for a paper that was uploaded via a presigned URL.

    ``upload_token`` is the staging S3 key returned by
    ``create_paper_upload_controller``. We verify the object actually landed in
    S3, then hand it to the ``add_paper`` task which downloads, dedups, and
    processes it.
    """
    from workers.celery_config import add_paper
    from workers.services.file_s3_service import MAX_UPLOAD_BYTES, FileService

    if not upload_token:
        return {"error": "upload_token is required", "status": 400}

    available_strategies = ExtractionStrategyFactory.get_available_strategies()
    if strategy_type not in available_strategies:
        return {
            "error": f"Invalid strategy type. Available: {available_strategies}",
            "status": 400,
        }

    # Only allow finalizing keys that belong to this user's staging area.
    expected_prefix = f"papers/uploads/{user.id}/"
    if not upload_token.startswith(expected_prefix):
        return {"error": "Invalid upload token.", "status": 403}

    file_service = FileService()

    # Verify the object landed in S3.
    size = file_service.head_object_size(upload_token)
    if size is None:
        return {
            "error": "No uploaded file found for this token. Upload it first.",
            "status": 400,
        }

    # Defense-in-depth size check. S3's content-length-range already rejects
    # oversized POSTs, but re-verify here in case the object was created another
    # way (e.g. a legacy presigned PUT).
    if size > MAX_UPLOAD_BYTES:
        file_service.s3_client.delete_object(
            Bucket=file_service.bucket_name, Key=upload_token
        )
        limit_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        return {
            "error": f"Uploaded file exceeds the {limit_mb}MB limit.",
            "status": 400,
        }

    # Content-Type is spoofable, so confirm the bytes really are a PDF by
    # checking the leading magic number. Reject and clean up otherwise.
    if not file_service.looks_like_pdf(upload_token):
        file_service.s3_client.delete_object(
            Bucket=file_service.bucket_name, Key=upload_token
        )
        return {
            "error": "Uploaded file is not a valid PDF.",
            "status": 400,
        }

    original_filename = os.path.basename(upload_token)
    task = add_paper.delay(
        "",  # no local file path; bytes are staged in S3
        socket_id or "",
        user.email,
        project_id,
        strategy_type,
        original_filename=original_filename,
        staged_s3_key=upload_token,
    )

    return {original_filename: task.id}


def get_paper_task_status_controller(task_id):
    """
    Get the status of a paper processing task.
    """
    from workers.celery_config import add_paper

    task = add_paper.AsyncResult(task_id)
    return task.result


def reprocess_paper_controller(user, paper_id, project_id, strategy_type, socket_id):
    """
    Reprocess an existing paper.
    """
    from workers.celery_config import reprocess_paper

    if not project_id:
        return {"error": "project_id is required", "status": 400}

    task = reprocess_paper.delay(
        paper_id=paper_id,
        socket_id=socket_id,
        user_email=user.email,
        project_id=project_id,
        strategy_type=strategy_type,
    )

    return {"task_id": task.id, "paper_id": paper_id}


def reprocess_project_controller(user, project_id, strategy_type, socket_id):
    """
    Reprocess all papers in a project.
    """
    from workers.celery_config import reprocess_paper

    try:
        # Get the project and verify ownership
        project: Project = Project.get(
            project_id, fetch_links=True, nesting_depth=1
        ).run()

        if not project:
            return {"error": "Project not found", "status": 404}

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

        return {
            "message": f"Started reprocessing {len(task_ids)} papers",
            "task_ids": task_ids,
            "total_papers": len(task_ids),
        }

    except Exception as e:
        return {"error": str(e), "status": 500}
