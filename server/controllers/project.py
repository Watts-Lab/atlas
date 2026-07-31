"""
This file contains the controller for the project
"""

from datetime import datetime

from bunnet import PydanticObjectId
from bunnet.operators import In
from database.models.features import Features
from database.models.projects import Project, ProjectLLMConfig
from database.models.users import User

# Allowed values for the per-project LLM config, validated on update.
_VALID_PROVIDERS = {"atlas", "openai", "anthropic", "openrouter"}
_VALID_STRATEGIES = {"json_schema", "assistant_api"}


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

    available_features = Features.find(
        In(Features.id, [PydanticObjectId(p) for p in (project_features or [])])
    ).run()

    new_project = Project(
        user=user,
        title=project_name,
        description=project_description,
        features=available_features,
    )
    new_project.insert()

    return new_project


def get_project_detail(project_id: str):
    """Get the details of a project.

    Args:
        project_id (str): the id of the project

    Returns:
        Project: the project object
        list[dict]: the papers of the project

    Raises:
        Exception: if the project could not be found

    Example:
        get_project_detail("1234567890")
    """
    user_project: Project = Project.get(project_id, fetch_links=True).run()

    if not user_project:
        return None

    # IMPORTANT: exclude nested link documents. With fetch_links=True the linked
    # `features` (and their `user`) and `papers` resolve to full ORM documents;
    # dumping them would leak the feature creator's User document — including
    # magic_link, encrypted API keys, and billing fields. Exclude them here and
    # re-add safe, explicitly allow-listed shapes below.
    project_dict = user_project.model_dump(
        mode="json", exclude={"user", "features", "papers"}
    )
    project_dict["slug"] = str(project_dict["slug"])
    project_dict["created_at"] = str(project_dict["created_at"])
    project_dict["updated_at"] = str(project_dict["updated_at"])
    project_dict["papers"] = [str(pap.id) for pap in user_project.papers]

    # Allow-listed feature fields only — never the nested `user` document.
    project_dict["features"] = [
        {
            "id": str(f.id),
            "feature_name": f.feature_name,
            "feature_identifier": f.feature_identifier,
            "feature_description": f.feature_description,
            "created_by": "user" if f.user else "provider",
        }
        for f in user_project.features
    ]

    papers = [
        {
            "task_id": pap.title,
            "file_name": pap.title,
        }
        for pap in user_project.papers
    ]

    return project_dict, papers


def update_project(
    project_id: str,
    project_name: str,
    project_description: str,
    project_prompt: str,
    project_llm: dict | None = None,
):
    """Update the project name.
    We should also update the project description and features in the future.

    Args:
        project_id (str): the id of the project
        project_name (str): the new name of the project

    Returns:
        dict or None: A dictionary representing the updated project with the following fields:
        - id (str): The unique ID of the project.
        - title (str): The updated project title.
        - slug (str): The slugified version of the project title.
        - created_at (str): ISO-formatted string representing when the project was created.
        - updated_at (str): ISO-formatted string representing when the project was last updated.
        Returns `None` if the project with the given ID does not exist.

    Raises:
        Exception: if the project could not be updated

    Example:
        update_project("1234567890", "Updated Project")
    """
    user_project: Project = Project.get(project_id).run()
    if not user_project:
        return None

    if project_name is not None and project_name != "":
        user_project.title = project_name

    if project_description is not None and project_description != "":
        user_project.description = project_description

    if project_prompt is not None:
        user_project.prompt = project_prompt

    if project_llm is not None:
        current = user_project.llm or ProjectLLMConfig()
        provider = project_llm.get("provider", current.provider)
        strategy = project_llm.get("strategy", current.strategy)
        if provider not in _VALID_PROVIDERS:
            raise ValueError(f"Unsupported provider: {provider!r}")
        if strategy not in _VALID_STRATEGIES:
            raise ValueError(f"Unsupported strategy: {strategy!r}")
        # model may be None ("use provider default") or a string.
        model = project_llm.get("model", current.model)
        model = model.strip() if isinstance(model, str) and model.strip() else None
        user_project.llm = ProjectLLMConfig(
            provider=provider, model=model, strategy=strategy
        )

    user_project.updated_at = datetime.now()

    user_project.save()
    # Exclude linked documents (user/features/papers) so no nested User document
    # (magic_link, encrypted keys, billing) can leak. This endpoint is fetched
    # without links, but exclude defensively regardless.
    project_dict = user_project.model_dump(
        mode="json", exclude={"user", "features", "papers"}
    )
    project_dict["slug"] = str(project_dict["slug"])
    project_dict["created_at"] = str(project_dict["created_at"])
    project_dict["updated_at"] = str(project_dict["updated_at"])

    return project_dict


def delete_project(project_id: str, user: User):
    """Delete a project.

    Args:
        project_id (str): the id of the project
        user (User): the user deleting the project

    Returns:
        bool: True if the project was deleted, False otherwise

    Raises:
        Exception: if the project could not be deleted

    Example:
        delete_project("1234567890", user)
    """
    user_project: Project = Project.get(project_id, fetch_links=True).run()
    if not user_project:
        return None
    if user.id != user_project.user.id:
        raise PermissionError("You are not allowed to delete this project.")
    user_project.delete()
    return True


async def track_project_view(user: User, project_id: str):
    """
    Track project view asynchronously.
    Args:
        user (User): the user viewing the project
        project_id (str): the id of the project
    Returns:
        None
    Raises:
        Exception: if the project view could not be tracked

    """
    try:
        # Remove if already exists
        user.recently_viewed_projects = [
            view
            for view in user.recently_viewed_projects
            if view["project_id"] != project_id
        ]

        # Add to front
        user.recently_viewed_projects.insert(
            0, {"project_id": project_id, "viewed_at": datetime.now()}
        )

        # Keep only last 10
        user.recently_viewed_projects = user.recently_viewed_projects[:10]

        user.save()

    except Exception as e:
        # Log error but don't fail the request
        print(f"Error tracking project view: {e}")
