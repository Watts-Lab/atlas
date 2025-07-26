"""
endpoint for running the assistant
"""

import logging
import os
from typing import Any, Dict

from openai import OpenAI


from database.models.projects import Project
from gpt_assistant import AssistantException, call_asssistant_api
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
        # Get project for custom prompt
        project = Project.get(project_id).run()
        custom_prompt = project.prompt if project and project.prompt.strip() else None

        # Create strategy
        strategy = ExtractionStrategyFactory.create_strategy(
            strategy_type=strategy_type,
            client=client,
            project_id=project_id,
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
