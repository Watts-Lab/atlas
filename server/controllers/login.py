"""User login module that handles login via magic links."""

from datetime import datetime, timedelta, timezone, UTC
from json import JSONDecodeError
import secrets
import jwt

from sanic import Sanic, json as json_response

from controllers.utils.email_client import send_magic_link
from database.models.users import User


async def login_user(email: str):
    """
    Handles the POST request for user login.
    """
    try:
        if not email:
            response_data = {"error": "Email is required."}
            return json_response(body=response_data, status=400)

        # Fetch user asynchronously
        user = await User.find_one(User.email == email)
        expiration_time = datetime.now(UTC) + timedelta(hours=1)

        if user:
            # Generate a new magic link
            magic_link = secrets.token_urlsafe(64)
            user.magic_link = magic_link
            user.magic_link_expired = False
            user.magic_link_expiration_date = expiration_time
            user.updated_at = datetime.now(UTC)
            await user.save()  # Save the User asynchronously

            # Send magic link via email
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
        await new_user.create()  # Create the User asynchronously

        # Send magic link via email
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


async def validate_user(email: str, token: str):
    """
    Handles the POST request for validating the magic link.
    """
    app = Sanic.get_app("Atlas")
    try:
        if not email or not token:
            response_data = {"error": "Email and token are required."}
            return json_response(body=response_data, status=400)

        # Fetch user asynchronously
        user = await User.find_one(User.email == email)

        if user:
            if user.magic_link == token and not user.magic_link_expired:
                # Check if the magic link has expired
                if datetime.now(UTC) < user.magic_link_expiration_date.replace(
                    tzinfo=timezone.utc
                ):
                    # user.magic_link_expired = True
                    user.updated_at = datetime.now(UTC)
                    await user.save()  # Save the User asynchronously
                    response_data = {"message": "Magic link validated."}
                    header = {
                        "Access-Control-Expose-Headers": "Authorization",
                        "Authorization": jwt.encode(
                            {
                                "email": email,
                                "token": token,
                                "exp": datetime.now() + timedelta(hours=1),
                            },
                            app.config.JWT_SECRET,
                            algorithm="HS256",
                        ),
                    }
                    return json_response(body=response_data, headers=header, status=200)

                # Magic link has expired
                response_data = {"error": "Magic link has expired."}
                return json_response(body=response_data, status=400)
            else:
                response_data = {"error": "Invalid magic link."}
                return json_response(body=response_data, status=400)
        else:
            response_data = {"error": "User not found."}
            return json_response(body=response_data, status=404)

    except JSONDecodeError:
        response_data = {"error": "Invalid JSON data."}
        return json_response(body=response_data, status=400)
    except Exception as e:
        response_data = {"error": "An error occurred.", "message": str(e)}
        return json_response(body=response_data, status=500)
