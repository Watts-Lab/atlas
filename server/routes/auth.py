"""
This module contains a decorator to require a valid JSON Web Token (JWT) for accessing a route.
"""

import jwt
from sanic import Request
from sanic.response import json as json_response
from database.models.users import User


def require_jwt(handler):
    """
    Decorator to require a valid JSON Web Token (JWT) for accessing a route.

    This decorator extracts the JWT from the request, decodes it using the
    application's secret key, and attaches the corresponding user to the request
    context. If the token is expired, invalid, or the user is not found, it returns
    an appropriate JSON response with an error message and status code.

    Args:
        func (Callable): The route handler function to be decorated.

    Returns:
        Callable: The decorated route handler function.

    Raises:
        jwt.ExpiredSignatureError: If the JWT has expired.
        jwt.InvalidTokenError: If the JWT is invalid.
        Exception: For any other exceptions that occur during token decoding or user retrieval.
    """

    async def wrapper(request: Request, *args, **kwargs):
        try:
            secret = request.app.config.JWT_SECRET
            token = request.cookies.get("jwt")
            user_jwt = jwt.decode(token, secret, algorithms=["HS256"])
            user = User.find_one(User.email == user_jwt["email"]).run()
            if not user:
                return json_response(
                    {"error": True, "message": "User not found."}, status=404
                )
            request.ctx.user = user
        except jwt.ExpiredSignatureError:
            return json_response(
                {"error": True, "message": "Token has expired."}, status=401
            )
        except jwt.InvalidTokenError:
            return json_response(
                {"error": True, "message": "Invalid token."}, status=401
            )
        except Exception as e:
            return json_response({"error": True, "message": str(e)}, status=500)
        return await handler(request, *args, **kwargs)

    return wrapper
