"""
endpoint for running the assistant
"""

import os


from gpt_assistant import AssistantException, call_asssistant_api
from workers.utils.socket_emitter import SocketEmmiter


UPLOAD_DIRECTORY = "papers/"

if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)


def run_assistant_api(file_path: str, project_id: str, emitter: SocketEmmiter):
    """
    Run the assistant with the uploaded file
    """
    try:
        result = call_asssistant_api(
            file_path=file_path,
            project_id=project_id,
            emitter=emitter,
        )

        file_name = file_path.replace("papers/", "").replace(
            f"{emitter.socket_id}-", ""
        )

        response_data = {
            "message": "Success",
            "file_name": file_name,
            "output": result,
        }

        return response_data

    except AssistantException as e:
        # Handle the AssistantException
        response_data = {
            "message": "Failed",
            "file_name": "failed",
            "output": str(e),
        }
        return response_data
    finally:
        # Clean up the file after processing
        if os.path.isfile(file_path):
            os.remove(file_path)
            print("File removed from local storage successfully")
        else:
            # If it fails, inform the user.
            print(f"Error: papers/{emitter.socket_id}-{file_name} file not found")
