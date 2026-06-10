"""
This module contains the authentication routes.
"""

from controllers.papers import get_user_papers_controller
from routes.auth import require_jwt
from routes.error_handler import error_handler
from routes.v1.docs import users as docs
from sanic import Blueprint, Request
from sanic.response import json as json_response

users_bp = Blueprint("users", url_prefix="/user")


@users_bp.route("/papers", methods=["GET"], name="user_papers")
@docs.user_papers
@require_jwt
@error_handler
async def user_papers(request: Request):
    """
    A protected route that fetches the user's papers, supporting pagination.
    """
    user = request.ctx.user
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 10))

    result = get_user_papers_controller(user, page, page_size)
    return json_response(result)
