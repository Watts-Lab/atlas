""" This module contains the Flask RESTful API endpoint for the workflow editor. """

import importlib
import os
import argparse
import json

from flask import Flask, request, jsonify, make_response
from flask_restful import Resource, Api
from flask_cors import CORS


app = Flask(__name__)
api = Api(app)

CORS(app)


class GetFeatures(Resource):
    """
    Represents a resource for the HelloWorld endpoint.
    This resource provides GET and POST methods for the HelloWorld endpoint.
    """

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

    def post(self):
        """
        Handles POST requests to the HelloWorld endpoint.
        Parses the request JSON data and prints the nodes and edges.
        Returns:
        A Flask response object with a JSON representation of the response data.
        """
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
        # Assuming `features` is obtained from the GetFeatures endpoint, this is a mock to demonstrate
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


api.add_resource(GetFeatures, "/api/features")
api.add_resource(RunFeatures, "/api/run")

if __name__ == "__main__":
    # getting list of command line arguments
    parser = argparse.ArgumentParser(description="Flask RESTful api end point.")
    parser.add_argument("-p", "--port", help="Port for the server.", type=int)
    parser.add_argument("-d", "--debug", help="Debug mode on or off.", type=bool)
    args = parser.parse_args()

    # setting default values
    port = args.port if args.port else 8000
    debug = args.debug if args.debug else True

    app.run(host="0.0.0.0", port=port, debug=debug)
