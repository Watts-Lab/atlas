"""
Celery configuration.
"""

import os
from celery import Celery
from dotenv import load_dotenv
import requests
import socketio

from utils.assistant_retriever import Assistant

load_dotenv()

celery = Celery(__name__)
celery.conf.broker_url = os.getenv("CELERY_BROKER_URL")
celery.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND")


@celery.task(Bind=True, name="create_task")
def create_task(paper_path: str):
    """
    Task to create a task.
    """
    external_sio = socketio.RedisManager("redis://redis:6379/0", write_only=True)
    print("Task created.", paper_path)

    external_sio.emit("task_created", {"task": "Task created."})

    gpt_name_assistant = Assistant(
        "Title retriever",
        "You are an AI assistant that retrieves the name of a paper from its title.",
    )
    res = gpt_name_assistant.run_assistant(paper_path)
    paper_info = search_paper_by_title(res["title"])
    print("TASK DONE:", paper_info["DOI"])
    return paper_info


def search_paper_by_title(title, filtering=None, sort=None, order=None):
    """
    Search for a paper by its title.
    """
    url = f"https://api.crossref.org/works?query.title={title}"

    if filtering:
        url += f"&filter={filtering}"
    if sort:
        url += f"&sort={sort}"
    if order:
        url += f"&order={order}"

    try:
        response = requests.get(url, timeout=20)
    except requests.exceptions.Timeout:
        print("Timeout occurred while searching for the paper.")

    if response.status_code == 200:
        data = response.json()
        if data["message"]["items"]:
            return data["message"]["items"][0]
        else:
            print("No paper found with the given title.")
    else:
        print("Error occurred while searching for the paper.")
