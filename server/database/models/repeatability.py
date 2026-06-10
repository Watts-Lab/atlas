"""
Repeatability model.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from bunnet import Document, Link
from pydantic import Field

from database.models.features import Features
from database.models.papers import Paper
from database.models.users import User

class RepeatabilityResult(Document):
    """This class represents a repeatability test result."""

    feature: Link[Features]
    feature_version: int
    paper: Link[Paper]
    user: Link[User]
    
    # The 10 extraction results
    extractions: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Calculated scores
    alpha_score: float = 0.0
    
    status: str = "pending" # pending, processing, completed, failed
    task_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        """Settings for the RepeatabilityResult model."""
        name = "repeatability_results"

    def __str__(self) -> str:
        return f"Repeatability for {self.feature} on {self.paper}: {self.alpha_score}"
