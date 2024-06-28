""" This module contains the Flask RESTful API endpoint for the workflow editor. """

import importlib
import os
import argparse
import json

from dotenv import load_dotenv

from flask import Flask, request, jsonify, make_response
from flask_restful import Resource, Api
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

# pylint: disable=import-error
from assistant import AssistantException, call_asssistant_api
from db.db import DatabaseInterface
from resources.user import User

users = User()

load_dotenv()

app = Flask(__name__, static_folder="../build", static_url_path="/")
api = Api(app)

CORS(app, resources={r"/*": {"origins": "*"}})

app.config["SECRET_KEY"] = os.getenv("SOCKET_SECRET")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET")
app.config["JWT_TOKEN_LOCATION"] = ["headers"]

socketio = SocketIO(app, cors_allowed_origins="*")

jwt = JWTManager(app)


UPLOAD_DIRECTORY = "paper/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


db = DatabaseInterface()


class GetFeatures(Resource):
    """
    Represents a resource for the HelloWorld endpoint.
    This resource provides GET and POST methods for the HelloWorld endpoint.
    """

    @jwt_required()
    def get(self):
        """
        Handles GET requests to the features endpoint.
        Returns:
        A Flask response object with a JSON representation of the response data.
        """
        features_dir = "features"
        py_files = []

        for root, dirs, files in os.walk(features_dir):
            # Skip __pycache__ directories
            if "__pycache__" in dirs:
                dirs.remove("__pycache__")

            for file in files:
                if (
                    file.endswith(".py")
                    and file != "__init__.py"
                    and file != "gpt_feature.py"
                ):
                    file_path = os.path.normpath(os.path.join(root, file))
                    relative_path = os.path.relpath(file_path, features_dir)

                    # Skip files with the same name as their parent directory
                    parent_dir = os.path.basename(os.path.dirname(file_path))
                    if os.path.splitext(file)[0] == parent_dir:
                        continue

                    # Replace '/' with '.'
                    formatted_path = relative_path.replace(os.path.sep, ".")
                    formatted_path = formatted_path.replace(".py", "")

                    py_files.append(formatted_path)

        response_data = {"features": py_files}
        response = make_response(jsonify(response_data))
        response.status_code = 200
        return response

    @jwt_required()
    def post(self):
        """
        Handles POST requests to the HelloWorld endpoint.
        Parses the request JSON data and prints the nodes and edges.
        Returns:
        A Flask response object with a JSON representation of the response data.
        """
        user_id = get_jwt_identity()
        print(f"User ID: {user_id}")
        data = request.get_json()
        return jsonify(data)


def load_feature(module_path):
    """Dynamically loads a feature class from a module path."""
    module = importlib.import_module(module_path)
    return module.Feature


class RunFeatures(Resource):
    """
    Represents a resource for running the features.
    This resource provides GET method for running and collecting feature prompts.
    """

    def post(self):
        """
        Handles GET requests to run features.
        Dynamically loads the features and collects their prompt attributes.
        Returns:
        A Flask response object with a JSON representation of the prompts.
        """
        try:
            data = request.get_json()
        except json.JSONDecodeError:
            response_data = {"error": "Invalid JSON data."}
            response = make_response(jsonify(response_data))
            response.status_code = 400
            return response

        try:
            features = data["features"]
            if not features:
                raise KeyError
        except KeyError:
            response_data = {"error": "No features provided."}
            response = make_response(jsonify(response_data))
            response.status_code = 400
            return response
        # Assuming `features` is obtained from the GetFeatures endpoint,
        # this is a mock to demonstrate
        features = [
            "features.condition.condition",
            "features.condition.condition_name",
            "features.condition.condition_description",
            "features.condition.condition_type",
            "features.condition.condition_message",
        ]

        prompts = []
        for idx, feature_path in enumerate(features):
            feature_class = load_feature(feature_path)
            feature_instance = feature_class()
            # Assuming your class has an attribute or method to get the prompt
            prompts.append({"id": idx, "prompt": feature_instance.feature_prompt})

        response_data = {"prompts": prompts}
        response = make_response(jsonify(response_data))
        response.status_code = 200
        return response


class RunAssistant(Resource):
    """
    Represents a resource for handling file uploads.
    Methods:
    - post: Handles the POST request for file uploads.
    """

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
                result = call_asssistant_api(file_path, sid, socketio)
                socketio.emit(
                    "status",
                    {"status": "Fetching all features...", "progress": 0},
                    to=sid,
                )

                # result = {
                #     "experiments": [
                #         {
                #             "experiment_name": "experiment_name",
                #             "experiment_description": "experiment_description",
                #             "conditions": [
                #                 {
                #                     "condition_name": "condition_name",
                #                     "condition_description": "condition_description",
                #                     "condition_type": "condition_type",
                #                     "condition_message": "condition_message",
                #                 },
                #                 {
                #                     "condition_name": "condition_name2",
                #                     "condition_description": "condition_description2",
                #                     "condition_type": "condition_type2",
                #                     "condition_message": "condition_message2",
                #                 },
                #             ],
                #             "behavior": [
                #                 {
                #                     "behavior_name": "behavior_name",
                #                     "behavior_description": "behavior_description",
                #                     "behavior_type": "behavior_type",
                #                     "behavior_message": "behavior_message",
                #                 },
                #                 {
                #                     "behavior_name": "behavior_name2",
                #                     "behavior_description": "behavior_description2",
                #                     "behavior_type": "behavior_type2",
                #                     "behavior_message": "behavior_message2",
                #                 },
                #             ],
                #         }
                #     ]
                # }

                print("result", result)

                response_data = {
                    "message": "File successfully uploaded",
                    "path": file.filename,
                    "result": result["conditions"],
                }
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


class Login(Resource):
    """
    Represents a resource for handling user login.
    Methods:
    - post: Handles the POST request for user login.
    """

    def post(self):
        """
        Handles the POST request for user login.
        Returns:
        - JSON response containing the status of the login:
        - If successful, returns {"message": "User successfully logged in"}.
        - If there is an error, returns {"error": "Invalid username or password"}.
        """
        try:
            data = request.get_json()
        except json.JSONDecodeError:
            response_data = {"error": "Invalid JSON data."}
            response = make_response(jsonify(response_data))
            response.status_code = 400
            return response

        email = data["email"]
        magic_link = data["magic_link"]

        user = users.find_by_email(email)

        print("user", user)

        if user and user["magic_link"] == magic_link:
            access_token = create_access_token(identity=user["username"])
            response = make_response(
                jsonify(
                    {
                        "message": "User successfully logged in",
                        "access_token": access_token,
                    }
                )
            )
            response.status_code = 200
            return response
        else:
            response_data = {"error": "Invalid username or password"}
            response = make_response(jsonify(response_data))
            response.status_code = 401
            return response


api.add_resource(GetFeatures, "/api/features")
api.add_resource(RunFeatures, "/api/run")
api.add_resource(RunAssistant, "/api/run_assistant")
api.add_resource(Login, "/api/login")


@socketio.on("connect", namespace="/")
def handle_connect():
    """event listener when client connects"""
    print("client connected", request.sid)


@socketio.on("disconnect")
def handle_disconnect():
    """event listener when client disconnects"""
    print("client disconnected", request.sid)


@socketio.on("status")
def handle_message(data):
    """event listener when client types a message"""
    print("data from the front end: ", str(data), request.sid)


@app.route("/")
def index():
    """Serves the index.html file."""
    return app.send_static_file("index.html")


@app.errorhandler(404)
def not_found(e):
    return app.send_static_file("index.html")


if __name__ == "__main__":
    # getting list of command line arguments
    parser = argparse.ArgumentParser(description="Flask RESTful api end point.")
    parser.add_argument("-p", "--port", help="Port for the server.", type=int)
    parser.add_argument("-d", "--debug", help="Debug mode on or off.", type=bool)
    args = parser.parse_args()
    # setting default values
    port = args.port if args.port else 80
    debug = args.debug if args.debug else False
    # app.run(host="0.0.0.0", port=port, debug=debug)
    socketio.run(app, host="0.0.0.0", port=port, debug=debug)
