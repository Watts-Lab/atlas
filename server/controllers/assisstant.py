"""
endpoint for running the assistant
"""

import os


from gpt_assistant import AssistantException, call_asssistant_api
from workers.utils.socket_emitter import SocketEmmiter


UPLOAD_DIRECTORY = "papers/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


def run_assistant_api(
    file_path: str, project_id: str, gpt_temperature: float, emitter: SocketEmmiter
):
    """
    Run the assistant with the uploaded file
    """
    try:
        result = call_asssistant_api(
            file_path=file_path,
            project_id=project_id,
            gpt_temperature=gpt_temperature,
            emitter=emitter,
        )

        file_name = file_path.replace("papers/", "").replace(
            f"{emitter.socket_id}-", ""
        )

        response_data = {
            "message": "Success",
            "file_name": file_name,
            "output": result,
        }

        return response_data

    except AssistantException as e:
        # Handle the AssistantException
        response_data = {
            "message": "Failed",
            "file_name": "failed",
            "output": str(e),
        }
        return response_data
