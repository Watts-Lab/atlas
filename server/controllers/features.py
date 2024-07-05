"""
This module contains the GetFeatures class, which represents a resource for the features endpoint.
"""

import os
from flask import jsonify, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Resource


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
