"""
endpoint for running the assistant
"""

import os
from sanic import json as json_response
import socketio


from assistant import AssistantException, call_asssistant_api


UPLOAD_DIRECTORY = "../paper/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


def run_assistant(sid, file, sio: socketio.AsyncServer):
    """
    Run the assistant with the uploaded file
    """
    if file:
        file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
        file.save(file_path)
        try:
            result = call_asssistant_api(file_path, sid, sio)

            # print("result : ", json.dumps(result))
            sio.emit(
                "status",
                {"status": "Fetching all features...", "progress": 0},
                to=sid,
            )

            response_data = {
                "message": "File successfully uploaded",
                "file_name": file.filename,
                "experiments": result["experiments"],
            }

            # Delete the uploaded
            if os.path.isfile(file_path):
                os.remove(file_path)
                print("File removed from local storage successfully")
            else:
                # If it fails, inform the user.
                print(f"Error: {file_path} file not found")

            return json_response(body=response_data, status=200)
        except AssistantException as e:
            response_data = {"error": str(e)}
            return json_response(body=response_data, status=500)
    else:
        response_data = {"error": "File upload failed"}
        return json_response(body=response_data, status=400)
