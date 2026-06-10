"""
This module contains the controller for papers.
"""

from database.models.papers import Paper, PaperView

def get_user_papers_controller(user, page, page_size):
    """
    Get the user's papers, supporting pagination.
    """
    skip = (page - 1) * page_size
    limit = page_size

    total_papers = Paper.find({"user.$id": user.id}).count()
    papers = (
        Paper.find({"user.$id": user.id})
        .project(PaperView)
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    pr_response = [p.model_dump(mode="json") for p in papers]

    return {
        "papers": pr_response,
        "total_papers": total_papers,
        "page": page,
        "page_size": page_size,
    }
