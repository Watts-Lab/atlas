"""
endpoint for running the assistant
"""

import logging
import os
from typing import Any, Dict

from openai import OpenAI


from database.models.projects import Project
from workers.services.socket_emitter import SocketEmmiter
from workers.strategies.strategy_factory import ExtractionStrategyFactory

logger = logging.getLogger(__name__)

UPLOAD_DIRECTORY = "papers/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


def run_assistant_api(
    file_path: str,
    project_id: str,
    emitter: SocketEmmiter,
    gpt_temperature: float = 0.7,
    strategy_type: str = "assistant_api",
) -> Dict[str, Any]:
    """
    Runs the assistant API to extract features from a paper.

    Args:
        file_path: Path to the uploaded file
        project_id: ID of the project
        emitter: Socket emitter for progress updates
        gpt_temperature: Temperature for GPT model
        strategy_type: Type of extraction strategy to use

    Returns:
        Dictionary containing extraction results
    """
    client = OpenAI()

    try:
        # Get project for custom prompt - only if project_id is provided
        project = None
        custom_prompt = None
        if project_id and project_id.strip():
            try:
                project = Project.get(project_id).run()
                if project:
                    custom_prompt = project.prompt if project.prompt and project.prompt.strip() else None
            except Exception as e:
                logger.warning("Failed to fetch project %s in run_assistant_api: %s", project_id, e)

        # Create strategy - ensure strategy factory can handle None project_id if needed
        # (Though we already refactored extraction strategy to allow Optional[str])
        strategy = ExtractionStrategyFactory.create_strategy(
            strategy_type=strategy_type,
            client=client,
            project_id=project_id if project_id and project_id.strip() else None,
            emitter=emitter,
        )

        logger.info("Using extraction strategy: %s", strategy.get_strategy_name())

        # Execute extraction
        output = strategy.extract(
            file_path=file_path,
            temperature=gpt_temperature,
            custom_prompt=custom_prompt,
        )

        # Extract filename for response
        # file_name = file_path.replace("papers/", "").replace(
        #     f"{emitter.socket_id}-", ""
        # )
        file_name = file_path.split("/")[-1]

        return {
            "file_name": file_name,
            "output": output,
            "strategy_used": strategy.get_strategy_name(),
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


# def run_assistant_api(
#     file_path: str, project_id: str, gpt_temperature: float, emitter: SocketEmmiter
# ):
#     """
#     Run the assistant with the uploaded file
#     """
#     try:
#         result = call_asssistant_api(
#             file_path=file_path,
#             project_id=project_id,
#             gpt_temperature=gpt_temperature,
#             emitter=emitter,
#         )

#         file_name = file_path.replace("papers/", "").replace(
#             f"{emitter.socket_id}-", ""
#         )

#         response_data = {
#             "message": "Success",
#             "file_name": file_name,
#             "output": result,
#         }

#         return response_data

#     except AssistantException as e:
#         # Handle the AssistantException
#         response_data = {
#             "message": "Failed",
#             "file_name": "failed",
#             "output": str(e),
#         }
#         return response_data
