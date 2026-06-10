"""
This file is used to group all the version 1 blueprints under a common prefix.
"""

from routes.v1.api_keys import api_keys_bp
from routes.v1.assistant import assistant_bp
from routes.v1.auth import auth_bp
from routes.v1.features import features_bp
from routes.v1.inclusion_criteria import ic_bp
from routes.v1.papers import paper_bp
from routes.v1.projects import projects_bp
from routes.v1.results import results_bp
from routes.v1.users import users_bp
from sanic import Blueprint

# from routes.v1.features import features_bp
# from routes.v1.results import results_bp
# from routes.v1.users import users_bp


# from routes.v1.projects import projects_bp
# • /api/projects:
#   – GET    -> list all projects
#   – POST   -> create a new project

# • /api/projects/<project_id>:
#   – GET    -> retrieve single project
#   – PUT    -> update existing project
v1_blueprint = Blueprint.group(
    projects_bp,
    paper_bp,
    ic_bp,
    auth_bp,
    assistant_bp,
    features_bp,
    results_bp,
    users_bp,
    api_keys_bp,
    url_prefix="/v1",
)
