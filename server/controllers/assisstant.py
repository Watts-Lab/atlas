"""
endpoint for running the assistant
"""

import os
from sanic import json as json_response
import socketio

from gpt_assistant import AssistantException, call_asssistant_api


UPLOAD_DIRECTORY = "paper/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


def run_assistant_api(
    sid: str, file_path: str, sio: socketio.RedisManager, task_id: str
):
    """
    Run the assistant with the uploaded file
    """
    try:
        result = call_asssistant_api(
            file_path=file_path, sid=sid, sio=sio, task_id=task_id
        )

        file_name = file_path.replace("paper/", "").replace(f"{sid}-", "")

        response_data = {
            "message": "File successfully uploaded",
            "file_name": file_name,
            "experiments": result["experiments"],
        }

        if os.path.isfile(file_path):
            os.remove(file_path)
            print("File removed from local storage successfully")
        else:
            # If it fails, inform the user.
            print(f"Error: paper/{sid}-{file_name} file not found")

        return response_data
    except AssistantException as e:
        response_data = {"error": str(e)}
        return response_data
