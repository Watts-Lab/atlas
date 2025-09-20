"""User login module that handles login via magic links."""

from datetime import datetime, timedelta, timezone, UTC
from json import JSONDecodeError
import secrets
import jwt

from sanic import Request, Sanic, json as json_response

from controllers.utils.email_client import send_magic_link, send_sdk_login
from database.models.users import User


async def login_user(email: str, is_sdk: bool = False):
    """
    Handles the POST request for user login.

    Args:
        email: User's email address
        is_sdk: Whether this is an SDK login request
    """
    try:
        if not email:
            response_data = {"error": "Email is required."}
            return json_response(body=response_data, status=400)

        # Fetch user asynchronously
        user = User.find_one(User.email == email).run()
        expiration_time = datetime.now(UTC) + timedelta(hours=1)

        if user:
            # Generate a new magic link
            magic_link = secrets.token_urlsafe(64)
            user.magic_link = magic_link
            user.magic_link_expired = False
            user.magic_link_expiration_date = expiration_time
            user.updated_at = datetime.now(UTC)
            user.save()  # Save the User asynchronously

            # Send appropriate email based on request type
            if is_sdk:
                send_sdk_login(email=email, token=magic_link)
                response_data = {"message": "SDK token sent. Check your email."}
            else:
                send_magic_link(email=email, token=magic_link)
                response_data = {"message": "Magic link generated. Check your email."}
            return json_response(body=response_data, status=200)

        # Create a new user and send magic link
        new_user = User(
            email=email,
            magic_link=secrets.token_urlsafe(64),
            magic_link_expired=False,
            magic_link_expiration_date=expiration_time,
            number_of_tokens=5000,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        new_user.create()  # Create the User asynchronously

        # Send appropriate email based on request type
        if is_sdk:
            send_sdk_login(email=email, token=new_user.magic_link)
            response_data = {
                "message": "User created. Check your email for the SDK token."
            }
        else:
            send_magic_link(email=email, token=new_user.magic_link)
            response_data = {
                "message": "User created. Check your email for the magic link."
            }
        return json_response(body=response_data, status=200)

    except JSONDecodeError:
        response_data = {"error": "Invalid JSON data."}
        return json_response(body=response_data, status=400)
    except Exception as e:
        response_data = {"error": "An error occurred.", "message": str(e)}
        return json_response(body=response_data, status=500)


async def logout_user():
    """
    Handles the POST request for user login.
    """
    try:
        app = Sanic.get_app("Atlas")
        response = json_response(body={"message": "Logged out"}, status=200)
        response.add_cookie(
            "jwt",
            value="",
            max_age=0,
            httponly=True,
            secure=app.config.SECURE_COOKIES,
        )

        return response
    except Exception as e:
        response_data = {"error": "An error occurred.", "message": str(e)}
        return json_response(body=response_data, status=500)


async def validate_user(email: str, token: str):
    """
    Handles the POST request for validating the magic link.
    """
    try:
        app = Sanic.get_app("Atlas")

        if not email or not token:
            response_data = {"error": "Email and token are required."}
            return json_response(body=response_data, status=400)

        # Fetch user asynchronously
        user = User.find_one(User.email == email).run()

        if user:
            if user.magic_link == token and not user.magic_link_expired:
                # Check if the magic link has expired
                if datetime.now(UTC) < user.magic_link_expiration_date.replace(
                    tzinfo=timezone.utc
                ):
                    # user.magic_link_expired = True
                    user.updated_at = datetime.now(UTC)
                    user.magic_link_expired = True
                    user.save()  # Save the User asynchronously

                    response_data = {
                        "message": "Magic link validated.",
                        "email": email,
                        "credits": user.number_of_tokens,
                    }

                    jwt_token = jwt.encode(
                        {
                            "email": email,
                            "token": token,
                            "exp": datetime.now(UTC) + timedelta(hours=48),
                        },
                        app.config.JWT_SECRET,
                        algorithm="HS256",
                    )

                    response = json_response(body=response_data, status=200)
                    response.add_cookie(
                        "jwt",
                        value=jwt_token,
                        max_age=60 * 60 * 24 * 2,  # 2 days
                        httponly=True,
                        secure=app.config.SECURE_COOKIES,
                    )

                    return response

                # Magic link has expired
                response_data = {"error": "Magic link has expired."}
                return json_response(body=response_data, status=400)

            response_data = {"error": "Invalid magic link."}
            return json_response(body=response_data, status=400)

        response_data = {"error": "User not found."}
        return json_response(body=response_data, status=404)

    except JSONDecodeError:
        response_data = {"error": "Invalid JSON data."}
        return json_response(body=response_data, status=400)
    except Exception as e:
        response_data = {"error": "An error occurred.", "message": str(e)}
        return json_response(body=response_data, status=500)


async def validate_token(request: Request):
    """
    Handles the POST request for validating the magic link.
    """
    try:
        token = request.cookies.get("jwt")
        user_jwt = jwt.decode(
            token, request.app.config.JWT_SECRET, algorithms=["HS256"]
        )
        user = User.find_one(User.email == user_jwt["email"]).run()

        if user:
            # Users local storage token is valid
            response_data = {
                "message": "Token is valid.",
                "email": user.email,
                "loggedIn": True,
                "credits": user.number_of_tokens,
            }
            return json_response(body=response_data, status=200)

        # Check if the token is valid
        response_data = {"error": "User not found."}
        return json_response(body=response_data, status=404)

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=400)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=400)
    except JSONDecodeError:
        response_data = {"error": "Invalid JSON data."}
        return json_response(body=response_data, status=400)
    except Exception as e:
        response_data = {"error": "An error occurred.", "message": str(e)}
        return json_response(body=response_data, status=500)
