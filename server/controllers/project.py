"""
This file contains the controller for the project
"""

from database.models.projects import Project
from database.models.users import User


def create_project(project_name: str, project_description: str, user: User):
    """
    Run the assistant with the uploaded file
    """
    try:

        new_project = Project(
            user=user,
            title=project_name,
            description=project_description,
        )
        new_project.create()

        return str(new_project.id)

    except Exception as e:
        return str(e)
