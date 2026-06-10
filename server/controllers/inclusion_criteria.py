"""Controller for Inclusion Criteria."""

from datetime import datetime

from bunnet import PydanticObjectId
from database.models.inclusion_criteria import InclusionCriteria
from database.models.projects import Project


def list_criteria(project_id: str) -> list[dict]:
    criteria = InclusionCriteria.find(
        InclusionCriteria.project.id == PydanticObjectId(project_id)
    ).to_list()
    return [_serialize(c) for c in criteria]


def create_criteria(
    project_id: str, name: str, description: str, formula: dict
) -> dict | None:
    project = Project.get(project_id).run()
    if not project:
        return None
    criteria = InclusionCriteria(
        project=project,
        name=name,
        description=description,
        formula=formula,
    )
    criteria.insert()
    return _serialize(criteria)


def update_criteria(
    criteria_id: str, name: str | None, description: str | None, formula: dict | None
) -> dict | None:
    criteria = InclusionCriteria.get(criteria_id).run()
    if not criteria:
        return None
    if name is not None:
        criteria.name = name
    if description is not None:
        criteria.description = description
    if formula is not None:
        criteria.formula = formula
    criteria.updated_at = datetime.now()
    criteria.save()
    return _serialize(criteria)


def delete_criteria(criteria_id: str) -> bool:
    criteria = InclusionCriteria.get(criteria_id).run()
    if not criteria:
        return False
    criteria.delete()
    return True


def _serialize(c: InclusionCriteria) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "description": c.description,
        "formula": c.formula,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }
