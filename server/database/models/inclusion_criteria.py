"""Inclusion Criteria model."""

from datetime import datetime

from bunnet import Document, Link
from database.models.projects import Project
from pydantic import Field


class InclusionCriteria(Document):
    """
    Stores a named formula (rule tree) evaluated client-side against results
    to determine whether a paper passes this criterion.

    The formula is a recursive RuleNode dict tree:
      LogicNode  → { type: "logic", logic: "AND"|"OR"|"NOT", rules: [...] }
      ArrayNode  → { type: "array", field: str, operator: "any"|"all"|"count_gte"|..., value?: int, rule?: RuleNode }
      FieldNode  → { type: "field", field: str, operator: "eq"|"ne"|"gt"|..., value?: any }
    """

    project: Link[Project]
    name: str
    description: str = ""
    formula: dict  # Serialized RuleNode tree — evaluated on the frontend

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "inclusion_criteria"
