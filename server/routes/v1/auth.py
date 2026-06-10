"""
This module contains the authentication routes.
"""

from controllers.login import login_user, logout_user, validate_token, validate_user
from routes.v1.docs import auth as docs
from sanic import Blueprint, Request

auth_bp = Blueprint("auth", url_prefix="/auth")


@auth_bp.route("/login", methods=["POST"], name="login")
@docs.login
async def login(request: Request):
    """
    Handles the POST request for logging in the user.
    """
    data = request.json
    email = data.get("email")
    is_sdk = data.get("client_type") == "sdk"
    return await login_user(email=email, is_sdk=is_sdk)


@auth_bp.route("/logout", methods=["POST"], name="logout")
@docs.logout
async def logout(request: Request):
    """
    Handles the POST request for logging out the user.
    """
    return await logout_user()


@auth_bp.route("/validate", methods=["POST"], name="validate")
@docs.validate
async def validate(request: Request):
    """
    Handles the POST request for validating the magic link.
    """
    data = request.json
    email = data.get("email")
    token = data.get("magic_link")
    return await validate_user(email=email, token=token)


@auth_bp.route("/check", methods=["GET"], name="check_token")
@docs.check_token
async def check_token(request: Request):
    """
    Handles the GET request for checking the token validity.
    """
    return await validate_token(request=request)
