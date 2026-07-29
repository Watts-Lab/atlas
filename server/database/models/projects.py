"""
Projects model.
"""

from datetime import datetime
from typing import List
from uuid import UUID, uuid4
from bunnet import Document, Link, PydanticObjectId

from typing import Optional

from pydantic import BaseModel, Field

from database.models.features import Features
from database.models.papers import Paper
from database.models.users import User


class ProjectLLMConfig(BaseModel):
    """Per-project LLM preferences.

    provider:
        - "atlas"      -> use Atlas' shared platform key (metered, rate limited)
        - "openai"     -> use the user's BYO OpenAI key (not metered)
        - "anthropic"  -> use the user's BYO Anthropic key (not metered)
        - "openrouter" -> use the user's BYO OpenRouter key (not metered)
    model:
        Concrete model id for the chosen provider. ``None`` means "use that
        provider's sensible default".
    strategy:
        Extraction approach: "json_schema" (provider-agnostic) or
        "assistant_api" (OpenAI Assistant API only).
    """

    provider: str = "atlas"
    model: Optional[str] = None
    strategy: str = "json_schema"


class Project(Document):
    """
    Project model.

    This model is responsible for storing the project information.

    fields:
    - user: User
    - title: str
    - description: str
    - slug: UUID
    - papers: List[Link[Paper]]
    - features: List[Link[Features]]

    """

    user: Link[User]
    title: str
    description: str = "Created on " + str(datetime.now())
    prompt: str = ""
    # LLM preferences. Older projects created before this field default to the
    # atlas/json_schema configuration below via the default_factory.
    llm: ProjectLLMConfig = Field(default_factory=ProjectLLMConfig)
    slug: UUID = Field(default_factory=uuid4)
    papers: List[Link[Paper]] = []
    features: List[Link[Features]] = []

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        """
        Settings for the Projects model.
        """

        name = "projects"


class ProjectView(BaseModel):
    """
    Project view model.
    """

    id: PydanticObjectId
    title: str
    description: str
    papers: List[Link[Paper]]
    updated_at: datetime

    class Settings:
        projection = {
            "id": "$_id",
            "title": 1,
            "description": 1,
            "papers": "$papers.count",
            "updated_at": 1,
        }


class ProjectVersion(Document):
    """
    Aggregate the project versions.
    it should keep track of who made changes and when.

    """

    user: Link[User]
    title: str
    slug: UUID = Field(default_factory=uuid4)
    versions: List[Link[Project]] = []

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
