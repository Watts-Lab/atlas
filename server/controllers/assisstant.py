"""
endpoint for running the assistant
"""

import os
import json
from flask import jsonify, make_response, request
from flask_restful import Resource


from assistant import AssistantException, call_asssistant_api


UPLOAD_DIRECTORY = "../paper/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


class RunAssistant(Resource):
    """
    Represents a resource for handling file uploads.
    Methods:
    - post: Handles the POST request for file uploads.
    """

    def __init__(self, **kwargs):
        self.socketio = kwargs.get("socketio")

    def post(self):
        """
        Handles the POST request for file uploads.
        Returns:
        - JSON response containing the status of the upload:
        - If successful, returns {"message": "File successfully uploaded", "path": file_path}.
        - If there is an error, returns {"error": "No file part"} or {"error": "No selected file"}.
        """
        sid = request.form.get("sid")

        if "file" not in request.files:
            return jsonify({"error": "No file part"})
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"})
        if file:
            file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
            file.save(file_path)
            try:
                result = call_asssistant_api(file_path, sid, self.socketio)

                # print("result : ", json.dumps(result))
                self.socketio.emit(
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

                response = make_response(jsonify(response_data))
                response.status_code = 200
                return response
            except AssistantException as e:
                response_data = {"error": str(e)}
                response = make_response(jsonify(response_data))
                response.status_code = 500
                return response
        else:
            response_data = {"error": "File upload failed"}
            response = make_response(jsonify(response_data))
            response.status_code = 400
            return response