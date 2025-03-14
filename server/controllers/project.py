"""
This file contains the controller for the project
"""

from database.models.projects import Project
from database.models.users import User


def create_project(project_name: str, project_description: str, user: User):
    """Create a new project.

    Args:
        project_name (str): the name of the project
        project_description (str): the description of the project
        user (User): the user creating the project

    Returns:
        Project: the newly created project

    Raises:
        Exception: if the project could not be created

    Example:
        create_project("New Project", "New Project", user)
    """
    try:
        new_project = Project(
            user=user,
            title=project_name,
            description=project_description,
        )
        new_project.insert()

        return new_project

    except Exception as e:
        return str(e)
