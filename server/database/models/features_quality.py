"""
Features model.
"""

from datetime import datetime
from typing import List
from bunnet import Document, Link
from pydantic import Field

from database.models.features import Features
from database.models.papers import Paper
from database.models.projects import Project
from database.models.results import Result


class FeaturesQuality(Document):
    """Features quality model.
    This model tracks the quality of features in relation to papers and projects.
    """

    feature: Link[Features]
    project: Link[Project]
    feature_score: float
    paper_ids: List[Link[Paper]] = []
    results_ids: List[Link[Result]] = []

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        """Settings for the FeaturesQuality model."""

        name = "features_quality"

    def __str__(self) -> str:
        return f"Feature {self.feature} in Project {self.project} has score {self.feature_score}"
