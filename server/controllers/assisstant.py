"""
endpoint for running the assistant
"""

import os
from sanic import json as json_response
from sanic.request.form import File
import socketio

from gpt_assistant import AssistantException, call_asssistant_api


UPLOAD_DIRECTORY = "paper/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


async def run_assistant(sid: str, file: File, sio: socketio.AsyncServer):
    """
    Run the assistant with the uploaded file
    """

    print("Running assistant", sid, file.name)
    if file:
        try:
            result = await call_asssistant_api(file=file, sid=sid, sio=sio)

            response_data = {
                "message": "File successfully uploaded",
                "file_name": file.name,
                "experiments": result["experiments"],
            }

            if os.path.isfile(f"paper/{sid}{file.name}"):
                os.remove(f"paper/{sid}{file.name}")
                print("File removed from local storage successfully")
            else:
                # If it fails, inform the user.
                print(f"Error: paper/{sid}{file.name} file not found")

            return json_response(body=response_data, status=200)
        except AssistantException as e:
            response_data = {"error": str(e)}
            return json_response(body=response_data, status=500)
