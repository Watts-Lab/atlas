"""
Error handler for JWT token validation in Sanic framework.
This module contains a decorator that wraps around a function to handle errors
"""

import logging
from functools import wraps

import jwt
from sanic import json as json_response

logger = logging.getLogger(__name__)


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
        except Exception as e:  # noqa: BLE001 - last-resort guard
            logger.exception("Unhandled error in route handler: %s", e)
            return json_response({"error": "Internal server error."}, status=500)

    return wrapper
