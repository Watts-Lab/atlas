"""
This file contains the controller for the project
"""

from bunnet import PydanticObjectId
from bunnet.operators import In
from database.models.features import Features
from database.models.projects import Project
from database.models.users import User


def create_project(
    project_name: str, project_description: str, project_features: list[str], user: User
):
    """Create a new project.

    Args:
        project_name (str): the name of the project
        project_description (str): the description of the project
        project_features (list[str]): the features of the project
        user (User): the user creating the project

    Returns:
        Project: the newly created project

    Raises:
        Exception: if the project could not be created

    Example:
        create_project("New Project", "New Project", ["Feature1", "Feature2"], user)
    """
    try:
        available_features = Features.find(
            In(Features.id, [PydanticObjectId(p) for p in project_features])
        ).run()

        new_project = Project(
            user=user,
            title=project_name,
            description=project_description,
            features=available_features,
        )
        new_project.insert()

        return new_project

    except Exception as e:
        return str(e)
