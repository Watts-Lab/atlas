"""
Celery configuration.
"""

import os
import sys
import boto3
from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown
from dotenv import load_dotenv
from redis import Redis

from database.database import init_db


load_dotenv()

sys.path.append(os.getcwd())

celery = Celery(
    __name__,
    broker=os.getenv("CELERY_BROKER_URL"),
    backend=os.getenv("CELERY_RESULT_BACKEND"),
)

celery.conf.broker_connection_retry_on_startup = True


AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_REGION = os.getenv("AWS_REGION")
AWS_S3_KEY = os.getenv("AWS_S3_KEY")
AWS_S3_SECRET = os.getenv("AWS_S3_SECRET")

REDIS_URL = os.getenv("CELERY_BROKER_URL")


# Global variable to hold the initialized database
DB_INITIALIZED = False

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_S3_KEY,
    aws_secret_access_key=AWS_S3_SECRET,
)


@worker_process_init.connect
def init_celery_worker(**kwargs):
    """
    Initialize the Bunnet/MongoDB connection for each worker process.
    """
    global DB_INITIALIZED
    if not DB_INITIALIZED:
        init_db()
        DB_INITIALIZED = True


@worker_process_shutdown.connect
def shutdown_celery_worker(**kwargs):
    """
    Shutdown the Bunnet/MongoDB connection for each worker process.
    """
    global DB_INITIALIZED
    if DB_INITIALIZED:
        DB_INITIALIZED = False


redis_client = Redis.from_url(REDIS_URL)


# Import the tasks to register them with Celery
from workers.add_paper_task import add_paper
from workers.add_paper_task import reprocess_paper
from workers.score_features import score_csv_data

celery.register_task(add_paper)
celery.register_task(reprocess_paper)
celery.register_task(score_csv_data)
