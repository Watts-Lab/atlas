from workers.celery_config import celery
from workers.save_to_s3_task import save_file_to_s3


@celery.task(bind=True, name="another_task")
def another_task(self, file_path: str, unique_id: str, user_id: str):
    """
    This task does something and then calls the save_file_to_s3 task.
    """
    # Do some work here
    # ...

    # Call the save_file_to_s3 task
    result = save_file_to_s3.delay(file_path, unique_id, user_id)

    # Optionally, wait for the result
    if result.ready():
        print("Result ready:")

    return {"status": "done"}
