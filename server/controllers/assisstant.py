"""
endpoint for running the assistant
"""

import os
from flask import jsonify, make_response, request
from flask_restful import Resource


from claude_function import call_claude_api
from gpt_assistant import AssistantException, call_asssistant_api


UPLOAD_DIRECTORY = "paper/"

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
        model = request.form.get("model") or "gpt"

        if "file" not in request.files:
            return jsonify({"error": "No file part"})
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"})
        if file:
            file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
            file.save(file_path)
            try:
                if model == "gpt":
                    result = call_asssistant_api(file_path, sid, self.socketio)
                elif model == "claude":
                    result = call_claude_api(file_path, sid, self.socketio)
                else:
                    return jsonify({"error": "Invalid model"})

                response_data = {
                    "message": "File successfully uploaded",
                    "file_name": file.filename,
                    "experiments": result["experiments"],
                }

                response = make_response(jsonify(response_data))
                response.status_code = 200
                return response
            except AssistantException as e:
                response_data = {
                    "message": str(e),
                    "file_name": file.filename,
                    "experiments": {"experiment": []},
                }
                response = make_response(jsonify(response_data))
                response.status_code = 500
                return response
            finally:
                # Delete the uploaded
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    print("File removed from local storage successfully")
                else:
                    print(f"Error: {file_path} file not found")
        else:
            response_data = {"error": "File upload failed"}
            response = make_response(jsonify(response_data))
            response.status_code = 400
            return response
