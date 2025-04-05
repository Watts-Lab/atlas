"""
This module contains the Assistant class that interacts with the OpenAI API to run the assistant.
"""

from datetime import datetime
import json
from typing import Dict
from openai import OpenAI


class AssistantException(Exception):
    """Custom exception class for assistant errors."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self):
        return f"AssistantException: {self.message}"


class Assistant:
    """
    Assistant class to interact with the OpenAI API to run the assistant.
    """

    def __init__(
        self,
        assisstant_name: str,
        assistant_instructions: str,
    ):
        self.client = OpenAI()
        self.assistant = self.create_temporary_assistant(
            assisstant_name, assistant_instructions
        )

    def create_temporary_assistant(
        self, assisstant_name: str, assistant_instructions: str
    ):
        """Creates a temporary assistant with the given functions."""
        assistant = self.client.beta.assistants.create(
            instructions=assistant_instructions,
            name=assisstant_name,
            model="gpt-4o",
            temperature=1,
        )
        return assistant

    def upload_file_to_vector_store(self, file_path: str) -> str:
        """Uploads a file to the vector store."""
        file_info = self.client.files.create(
            file=open(file_path, "rb"), purpose="assistants"
        )

        print("file info:", file_info.id)
        now = datetime.now()
        date_time = now.strftime("%Y_%m_%d_%H_%M_%S")

        vector_store = self.client.beta.vector_stores.create(
            name=f"atlas_run_{date_time}",
            file_ids=[file_info.id],
            expires_after={"anchor": "last_active_at", "days": 1},
        )
        return vector_store.id

    def run_assistant(self, file_path: str) -> Dict:
        """Runs the assistant with the uploaded file and returns the output."""
        try:

            print("file path:", file_path)
            vector_store_id = self.upload_file_to_vector_store(file_path)

            function = {
                "name": "name_of_the_paper",
                "description": "Get the title of the paper.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "What is the title of the paper?",
                        },
                    },
                    "required": ["title"],
                },
            }

            updated_assistant = self.client.beta.assistants.update(
                assistant_id=self.assistant.id,
                tool_resources={"file_search": {"vector_store_ids": [vector_store_id]}},
                tools=[
                    {"type": "file_search"},
                    {"type": "function", "function": function},
                ],
            )

            thread_message = self.client.beta.threads.create(
                messages=[
                    {
                        "role": "user",
                        "content": "run function name_of_the_paper",
                    }
                ],
            )
            run = self.client.beta.threads.runs.create_and_poll(
                thread_id=thread_message.id,
                assistant_id=updated_assistant.id,
            )

            tool_outputs = json.loads(
                run.required_action.submit_tool_outputs.tool_calls[0].function.arguments
            )

            self.check_output_format(tool_outputs)

        except Exception as e:
            raise AssistantException(f"Assistant run failed: {str(e)}") from e

        finally:
            self.cleanup_resources(vector_store_id, self.assistant, thread_message.id)

        return tool_outputs

    def check_output_format(self, output) -> bool:
        """Checks if the tool output is correctly formatted."""
        if isinstance(output, dict) and "title" in output:
            return True

        raise AssistantException("Output format is incorrect")

    def cleanup_resources(self, vector_store_id: str, assistant: dict, thread_id: str):
        """Cleans up resources after running the assistant."""
        # Delete vector store and associated files
        vector_store_files = self.client.beta.vector_stores.files.list(vector_store_id)
        for file_info in vector_store_files.data:
            self.client.files.delete(file_info.id)

        self.client.beta.vector_stores.delete(vector_store_id)
        self.client.beta.threads.delete(thread_id)
        self.client.beta.assistants.delete(assistant.id)
