from sanic import Blueprint


projects_bp = Blueprint("projects", url_prefix="/api/projects")


# • /api/projects:
#   – GET    -> list all projects
#   – POST   -> create a new project

# • /api/projects/<project_id>:
#   – GET    -> retrieve single project
#   – PUT    -> update existing project

# • /api/projects/<project_id>/features:
#   – GET    -> list features for a project
#   – POST   -> add new feature to a project

# • /api/projects/<project_id>/results:
#   – GET    -> list or retrieve results
#   – POST   -> create new result (if that’s a valid use case)

# • /api/projects/<project_id>/results/<result_id>:
#   – GET    -> retrieve single result
#   – PUT    -> update existing result

