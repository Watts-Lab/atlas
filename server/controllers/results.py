"""
This module contains the controller for the repeatability results and evaluations.
"""

import math
import json
from bunnet import PydanticObjectId
from database.models.repeatability import RepeatabilityResult

def evaluate_repeatability_controller(user, feature_id, paper_id, project_id, socket_id):
    """
    Trigger repeatability evaluation for a feature.
    """
    if not paper_id or not socket_id:
        return {"error": "Missing parameters.", "status": 400}

    from workers.evaluate_repeatability_task import evaluate_feature_repeatability

    task = evaluate_feature_repeatability.delay(
        feature_id=feature_id,
        paper_id=paper_id,
        user_id=str(user.id),
        project_id=project_id,
        socket_id=socket_id,
        num_runs=5,
    )

    return {"task_id": task.id}

def run_feature_extraction_controller(user, feature_id, paper_id, project_id, socket_id):
    """
    Run a single extraction for a feature on a paper.
    """
    if not paper_id:
        return {"error": "paper_id is required", "status": 400}

    from workers.evaluate_repeatability_task import evaluate_feature_repeatability

    task = evaluate_feature_repeatability.delay(
        feature_id=feature_id,
        paper_id=paper_id,
        user_id=str(user.id),
        project_id=project_id,
        socket_id=socket_id,
        num_runs=1,
    )

    return {"task_id": task.id}

def get_feature_evaluations_controller(feature_id):
    """
    Get evaluation history for a feature.
    """
    evals = (
        RepeatabilityResult.find(
            RepeatabilityResult.feature.id == PydanticObjectId(feature_id),
            fetch_links=True,
        )
        .sort("-created_at")
        .to_list()
    )

    res = []
    for e in evals:
        res.append(
            {
                "id": str(e.id),
                "paper_id": str(e.paper.id),
                "version": e.feature_version,
                "alpha": None if math.isnan(e.alpha_score) else e.alpha_score,
                "status": e.status,
                "created_at": e.created_at.isoformat(),
            }
        )

    return {"evaluations": res}

def get_repeatability_result_controller(result_id):
    """
    Get detailed information for a repeatability result.

    Returns an explicit allow-list of fields. We must NOT dump the whole document
    with fetch_links=True, because the linked `user` (and feature/paper) would
    resolve to full ORM documents — leaking the user's magic_link, encrypted API
    keys, and billing fields to the client.
    """
    result = RepeatabilityResult.get(result_id, fetch_links=True).run()
    if not result:
        return {"error": "Result not found", "status": 404}

    return {
        "id": str(result.id),
        "feature_id": str(result.feature.id) if result.feature else None,
        "feature_version": result.feature_version,
        "paper_id": str(result.paper.id) if result.paper else None,
        "extractions": result.extractions,
        "alpha_score": result.alpha_score,
        "status": result.status,
        "task_id": result.task_id,
        "created_at": (
            result.created_at.isoformat() if result.created_at else None
        ),
        "updated_at": (
            result.updated_at.isoformat() if result.updated_at else None
        ),
    }
