"""
This module contains the controller for the features.
"""

from bunnet import PydanticObjectId
from bunnet.operators import In, Or
from sanic import json as json_response

from database.models.features import Features
from database.models.projects import Project
from database.schemas.gpt_interface import FeatureCreate

def list_all_features(user, project_id=None):
    """
    Get all the features for the user and public features, and optionally project features.
    """
    # Find user features, shared features, and unowned features
    experiment_features = Features.find(
        Or(
            Features.user == None,
            Features.user == user.id,
            Features.is_shared == True,
        )
    ).to_list()

    # If project_id is provided, fetch features assigned to that project
    project_owned_features = []
    if project_id and project_id != "undefined" and project_id != "preview":
        try:
            project = Project.get(project_id, fetch_links=True).run()
        except Exception:
            project = None
        if project and hasattr(project, "features"):
            project_owned_features = project.features or []

    # Merge features, avoiding duplicates by id
    all_features_dict = {}
    for feature in experiment_features:
        all_features_dict[str(feature.id)] = feature
    for feature in project_owned_features:
        all_features_dict[str(feature.id)] = feature

    res = []
    for feature in all_features_dict.values():
        o = feature.model_dump()
        res.append(
            {
                "id": str(o["id"]),
                "feature_name": o["feature_name"],
                "feature_description": o["feature_description"],
                "feature_identifier": o["feature_identifier"],
                "feature_type": o["feature_gpt_interface"].get("type", "string"),
                "feature_prompt": o["feature_gpt_interface"].get(
                    "description", "No prompt found."
                ),
                "feature_enum_options": o["feature_gpt_interface"].get("enum", []),
                "is_shared": o.get("is_shared", False),
                "created_by": "user" if o.get("user") else "provider",
                "version": o.get("version", 1),
            }
        )

    return {
        "response": "success",
        "features": res,
    }

def create_feature(user, json_data):
    """
    Create a new feature.
    """
    payload = FeatureCreate(**json_data)
    # build the JSON-schema for GPT
    gpt_iface = payload.to_gpt_interface()

    feat = Features(
        feature_name=payload.feature_name,
        feature_identifier=payload.feature_identifier,
        feature_parent=payload.feature_parent,
        feature_description=payload.feature_description,
        is_shared=payload.is_shared,
        feature_gpt_interface=gpt_iface,
        user=user.id,
    )
    feat.save()

    out = feat.model_dump()

    return {
        "response": "success",
        "feature": {
            "id": str(out["id"]),
            "feature_name": out["feature_name"],
            "feature_identifier": out["feature_identifier"],
            "feature_description": out["feature_description"],
        },
    }

def delete_feature_controller(user, feature_id):
    """
    Delete a feature by its ID.
    """
    try:
        feat: Features = Features.get(feature_id, fetch_links=True).run()
    except Exception:
        return {"error": "Feature not found.", "status": 404}

    if feat.user != user:
        return {"error": "Forbidden.", "status": 403}

    feat.delete()
    return {"response": "success"}

def update_feature_controller(user, feature_id, json_data):
    """
    Update a feature with versioning.
    """
    feat = Features.get(feature_id).run()
    if not feat:
        return {"error": "Feature not found.", "status": 404}
    if feat.user != user:
        return {"error": "Forbidden.", "status": 403}

    payload = FeatureCreate(**json_data)
    new_gpt_iface = payload.to_gpt_interface()

    # Check if interface changed
    if feat.feature_gpt_interface != new_gpt_iface:
        # Save old one to history
        feat.history.append(feat.feature_gpt_interface)
        feat.version += 1
        feat.feature_gpt_interface = new_gpt_iface

    feat.feature_name = payload.feature_name
    feat.feature_identifier = payload.feature_identifier
    feat.feature_parent = payload.feature_parent
    feat.feature_description = payload.feature_description
    feat.is_shared = payload.is_shared
    feat.save()

    return {"response": "success", "version": feat.version}

def get_project_features_controller(project_id):
    """
    Get the features of a project.
    """
    user_project: Project = Project.get(project_id, fetch_links=True).run()

    # Check if the project exists
    if not user_project:
        return {"error": "Project not found.", "status": 404}

    # Already added features
    project_feature_list = [
        {
            "id": str(f.id),
            "feature_name": f.feature_name,
            "feature_description": f.feature_description,
            "feature_identifier": f.feature_identifier,
            "created_by": "user" if f.user else "provider",
        }
        for f in user_project.features
    ]

    return {"message": "Project feature list.", "features": project_feature_list}

def add_project_features_controller(project_id, feature_ids):
    """
    Add features to a project.
    """
    user_project: Project = Project.get(project_id, fetch_links=True).run()

    # Check if the project exists
    if not user_project:
        return {"error": "Project not found.", "status": 404}

    feature_docs = Features.find(
        In(Features.id, [PydanticObjectId(p) for p in feature_ids])
    ).run()

    if len(feature_docs) != len(feature_ids):
        return {"error": "Some features not found.", "status": 404}

    user_project.features = feature_docs
    user_project.save()

    return {"message": "Feature updated."}

def remove_project_features_controller(project_id, feature_ids_to_remove):
    """
    Remove features from a project.
    """
    # Retrieve the project
    user_project = Project.get(project_id, fetch_links=False).run()

    if not user_project:
        return {"error": "Project not found.", "status": 404}

    # Filter out any features from user_project.features whose IDs match feature_ids_to_remove
    user_project.features = [
        f for f in user_project.features if str(f.id) not in feature_ids_to_remove
    ]

    # Save once
    user_project.save()

    return {"message": "Feature removed."}
