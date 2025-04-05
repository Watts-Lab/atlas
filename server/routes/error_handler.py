"""
Error handler for JWT token validation in Sanic framework.
This module contains a decorator that wraps around a function to handle errors
"""

from functools import wraps

import jwt
from sanic import json as json_response


def error_handler(func):
    """
    Decorator to handle errors and exceptions in a Sanic route handler.
    """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            # Execute the wrapped function
            return await func(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return json_response({"error": "Token has expired."}, status=401)
        except jwt.InvalidTokenError:
            return json_response({"error": "Invalid token."}, status=401)
        except Exception as e:
            return json_response({"error": str(e)}, status=500)

    return wrapper
