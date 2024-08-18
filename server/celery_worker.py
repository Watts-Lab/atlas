"""
Celery configuration.
"""

import os
import sys
from celery import Celery, Task
from celery.signals import worker_process_init, worker_process_shutdown
from dotenv import load_dotenv
import requests
import socketio
import boto3

from controllers.assisstant import run_assistant_api
from database.database import init_db
from database.models.papers import Paper
from database.models.results import Result
from database.models.users import User
from utils.assistant_retriever import Assistant


load_dotenv()

sys.path.append(os.getcwd())

celery = Celery(
    __name__,
    broker=os.getenv("CELERY_BROKER_URL"),
    backend=os.getenv("CELERY_RESULT_BACKEND"),
)


AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_S3_KEY = os.getenv("AWS_S3_KEY")
AWS_S3_SECRET = os.getenv("AWS_S3_SECRET")

# Global variable to hold the initialized database
DB_INITIALIZED = False


@worker_process_init.connect
def init_celery_worker(**kwargs):
    """
    Initialize the Beanie/MongoDB connection for each worker process.
    """
    global DB_INITIALIZED
    if not DB_INITIALIZED:
        init_db()
        DB_INITIALIZED = True


@worker_process_shutdown.connect
def shutdown_celery_worker(**kwargs):
    """
    Shutdown the Beanie/MongoDB connection for each worker process.
    """
    global DB_INITIALIZED
    if DB_INITIALIZED:
        DB_INITIALIZED = False


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


def save_paper_info(paper_info: dict) -> Paper:
    """
    Save the paper info to the database.
    """
    user = User.find_one(User.email == "amirhossein.nakhaei@rwth-aachen.de").run()

    new_paper = Paper(
        user=user,
        title=paper_info["title"],
        run_ids=[paper_info["run_id"]],
        truth_ids=[],
        s3_url=paper_info["s3_url"],
    )

    return new_paper.create()


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
            "status": "Starting assistant...",
            "progress": 0,
            "task_id": task_id,
            "done": False,
        },
        to=socket_id,
        namespace="/home",
    )

    s3 = boto3.client(
        "s3",
        aws_access_key_id=AWS_S3_KEY,
        aws_secret_access_key=AWS_S3_SECRET,
    )

    try:
        s3.upload_file(
            paper_path,
            AWS_S3_BUCKET,
            f"amirhossein.nakhaei@rwth-aachen.de/{paper_path}",
            ExtraArgs=None,
            Callback=None,
            Config=None,
        )

        res = {
            "title": paper_path.replace("paper/", "").replace(f"{socket_id}-", ""),
            "run_id": task_id,
            "s3_url": f"https://{AWS_S3_BUCKET}.s3.amazonaws.com/amirhossein.nakhaei@rwth-aachen.de/{paper_path}",
        }

        # Save the paper info to the database
        new_paper = save_paper_info(res)

        print(f"File uploaded to S3: {res}")
    except Exception as e:
        print(f"Error uploading file to S3: {e}")

    open_ai_res = run_assistant_api(
        file_path=paper_path, sid=socket_id, sio=external_sio, task_id=task_id
    )

    result_obj = Result(
        user=User.find_one(User.email == "amirhossein.nakhaei@rwth-aachen.de").run(),
        json_response=open_ai_res["output"]["result"],
        prompt_token=open_ai_res["output"]["prompt_token"],
        completion_token=open_ai_res["output"]["completion_token"],
        quality=0.9,
        feature_list=default_experiments_features,
        run_id=task_id,
    )

    external_sio.emit(
        "status",
        {
            "status": "Saving results to database...",
            "progress": 90,
            "task_id": task_id,
            "done": False,
        },
        to=socket_id,
        namespace="/home",
    )

    result_obj.create()

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

    return {
        "message": "Success",
        "file_name": open_ai_res["file_name"],
        "experiments": open_ai_res["output"]["result"]["experiments"],
    }


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


default_experiments_features = [
    "experiments.name",
    "experiments.description",
    "experiments.participant_source",
    "experiments.participant_source_category",
    "experiments.units_randomized",
    "experiments.units_analyzed",
    "experiments.sample_size_randomized",
    "experiments.sample_size_analyzed",
    "experiments.sample_size_notes",
    "experiments.adults",
    "experiments.age_mean",
    "experiments.age_sd",
    "experiments.female_perc",
    "experiments.male_perc",
    "experiments.gender_other",
    "experiments.language",
    "experiments.language_secondary",
    "experiments.compensation",
    "experiments.demographics_conditions",
    "experiments.population_other",
    "experiments.conditions.name",
    "experiments.conditions.description",
    "experiments.conditions.type",
    "experiments.conditions.message",
    "experiments.conditions.behaviors.name",
    "experiments.conditions.behaviors.description",
    "experiments.conditions.behaviors.priority",
    "experiments.conditions.behaviors.focal",
]
