"""
# server/database/models/project_paper_result.py
This module defines the ProjectPaperResult model, which serves as a junction table
┌─────────────┐     ┌──────────────────────┐     ┌────────────┐
│   Project   │────▶│ ProjectPaperResult   │◀────│   Paper    │
│             │     │                      │     │            │
│ features:[] │     │ - project            │     │ s3_url     │
│ prompt      │     │ - paper              │     │ file_hash  │
└─────────────┘     │ - result (latest)    │     └────────────┘
                    │ - all_results[]      │
                    └──────────────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │  Result  │
                        │          │
                        │ version  │
                        │ features │
                        │ json_resp│
                        └──────────┘
"""

from datetime import datetime
from typing import List
from bunnet import Document, Link
from database.models.projects import Project
from database.models.papers import Paper
from database.models.results import Result


class ProjectPaperResult(Document):
    """Junction table for project-paper-result relationships."""

    project: Link[Project]
    paper: Link[Paper]
    result: Link[Result]  # Current/latest result
    all_results: List[Link[Result]] = []  # All versions
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        """Settings for the ProjectPaperResult model."""

        name = "project_paper_results"
