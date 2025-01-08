"""
endpoint for running the assistant
"""

import os
from typing import List
import socketio

from gpt_assistant import AssistantException, call_asssistant_api


UPLOAD_DIRECTORY = "paper/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


def run_assistant_api(
    sid: str,
    file_path: str,
    sio: socketio.RedisManager,
    task_id: str,
    project_id: str,
):
    """
    Run the assistant with the uploaded file
    """
    try:
        result = call_asssistant_api(
            file_path=file_path,
            sid=sid,
            sio=sio,
            task_id=task_id,
            project_id=project_id,
        )

        file_name = file_path.replace("papers/", "").replace(f"{sid}-", "")

        response_data = {
            "message": "Success",
            "file_name": file_name,
            "output": result,
        }

        if os.path.isfile(file_path):
            os.remove(file_path)
            print("File removed from local storage successfully")
        else:
            # If it fails, inform the user.
            print(f"Error: papers/{sid}-{file_name} file not found")

        return response_data
    except AssistantException as e:
        response_data = {
            "message": "Failed",
            "file_name": "failed",
            "output": str(e),
        }
        return response_data
