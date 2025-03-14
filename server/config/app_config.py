"""
Configuration class for the application.
"""

import os
from sanic.config import Config
from dotenv import load_dotenv

load_dotenv()


class AppConfig(Config):
    """
    Configuration class for the application.

    Attributes:
        BASE_URL (str): The base URL of the application.
        SECRET (str): The secret key for the application's socket.
        JWT_SECRET (str): The secret key for JSON Web Tokens (JWT).
        JWT_ALGORITHM (str): The algorithm used for JWT encryption.
        JWT_EXP_DELTA_SECONDS (int): The expiration time for JWT tokens in seconds.
    """

    BASE_URL = os.getenv(
        "BASE_URL_DEV" if os.getenv("PYTHON_ENV") == "development" else "BASE_URL_PROD"
    )
    SECRET = os.getenv("SOCKET_SECRET")
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = "HS256"
    JWT_EXP_DELTA_SECONDS = 3600
