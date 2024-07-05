"""
This module contains the Login class, which represents a resource for handling user login.
"""

import json
from flask import request, jsonify, make_response
from flask_jwt_extended import create_access_token
from flask_restful import Resource

from resources.user import User


users = User()


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
