import jwt
from sanic import HTTPResponse, Request, Sanic
from sanic.response import json as json_response
from database.models.users import User


def require_jwt(func):
    app = Sanic.get_app("Atlas")

    async def wrapper(request: Request, *args, **kwargs):
        try:
            token = request.token
            user_jwt = jwt.decode(token, app.config.JWT_SECRET, algorithms=["HS256"])
            request.ctx.user = User.find_one(User.email == user_jwt["email"]).run()
            if not request.ctx.user:
                return json_response(
                    {"error": True, "message": "User not found."}, status=404
                )
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
        return await func(request, *args, **kwargs)

    return wrapper
