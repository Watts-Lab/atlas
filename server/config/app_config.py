"""
Configuration class for the application.
"""

import os
from sanic.config import Config
from dotenv import load_dotenv

load_dotenv()

_IS_DEVELOPMENT = os.getenv("PYTHON_ENV") == "development"


class AppConfig(Config):
    """
    Configuration class for the application.

    Attributes:
        BASE_URL (str): The base URL of the application.
        SECRET (str): The secret key for the application's socket.
        JWT_SECRET (str): The secret key for JSON Web Tokens (JWT).
        JWT_ALGORITHM (str): The algorithm used for JWT encryption.
        JWT_EXP_DELTA_SECONDS (int): The expiration time for JWT tokens in seconds.
        WEBAUTHN_RP_ID (str): The WebAuthn Relying Party ID (registrable domain).
        WEBAUTHN_RP_NAME (str): Human-readable Relying Party name shown in prompts.
        WEBAUTHN_ORIGIN (str): The exact origin (scheme + host + port) expected
            in WebAuthn responses.
    """

    BASE_URL = os.getenv("BASE_URL_DEV" if _IS_DEVELOPMENT else "BASE_URL_PROD")
    SECRET = os.getenv("SOCKET_SECRET")
    JWT_SECRET = os.getenv("JWT_SECRET")
    SECURE_COOKIES = (
        os.getenv("PYTHON_ENV") != "development"  # Use secure cookies in production
    )
    JWT_ALGORITHM = "HS256"
    JWT_EXP_DELTA_SECONDS = 3600

    # ------------------------------------------------------------------
    # WebAuthn / passkey configuration.
    #
    # RP_ID must be the site's registrable domain with NO scheme and NO port
    # (e.g. "atlas.seas.upenn.edu" or "localhost"). Passkeys are cryptographically
    # bound to it, so it must be correct per-environment.
    #
    # ORIGIN is the full origin the browser reports (scheme + host + [:port]);
    # the library checks the assertion's origin against it exactly.
    #
    # All three can be overridden via env vars so deployments never rely on code
    # edits, but sane per-environment defaults are provided.
    # ------------------------------------------------------------------
    WEBAUTHN_RP_ID = os.getenv(
        "WEBAUTHN_RP_ID", "localhost" if _IS_DEVELOPMENT else "atlas.seas.upenn.edu"
    )
    WEBAUTHN_RP_NAME = os.getenv("WEBAUTHN_RP_NAME", "Atlas")
    WEBAUTHN_ORIGIN = os.getenv(
        "WEBAUTHN_ORIGIN",
        "http://localhost:5173" if _IS_DEVELOPMENT else "https://atlas.seas.upenn.edu",
    )
