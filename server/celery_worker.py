"""
Celery configuration.
"""

import os
import sys
from celery import Celery, Task
from dotenv import load_dotenv
import requests
import socketio

from controllers.assisstant import run_assistant_api
from utils.assistant_retriever import Assistant

load_dotenv()

sys.path.append(os.getcwd())

celery = Celery(__name__)
celery.conf.broker_url = os.getenv("CELERY_BROKER_URL")
celery.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND")


@celery.task(bind=True, name="get_paper_info")
def get_paper_info(paper_path: str):
    """
    Task to create a task.
    """
    external_sio = socketio.RedisManager(
        os.getenv("CELERY_BROKER_URL"), write_only=True
    )
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


@celery.task(bind=True, name="run_assistant")
def run_assistant(self: Task, paper_path: str, socket_id: str):
    """
    Task to create a task.
    """
    external_sio = socketio.RedisManager(
        os.getenv("CELERY_BROKER_URL"), write_only=True
    )

    task_id = self.request.id

    external_sio.emit(
        "status",
        {
            "status": "Updating assistant...",
            "progress": 0,
            "task_id": task_id,
            "done": False,
        },
        to=socket_id,
        namespace="/home",
    )

    res = run_assistant_api(
        file_path=paper_path, sid=socket_id, sio=external_sio, task_id=task_id
    )

    external_sio.emit(
        "status",
        {
            "status": "Finishing up...",
            "progress": 100,
            "task_id": task_id,
            "done": True,
        },
        to=socket_id,
        namespace="/home",
    )

    return res


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
