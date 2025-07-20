"""
Assistant API Strategy for Feature Extraction
"""

import json
import time
import logging
from typing import Dict, Any, Optional

from gpt_assistant import (
    build_parent_objects,
    enforce_additional_properties,
    get_all_features,
    build_openai_feature_functions,
    upload_file_to_vector_store,
    update_assistant,
    check_output_format,
    create_temporary_assistant,
)
from workers.strategies.extraction_strategy import ExtractionStrategy


logger = logging.getLogger(__name__)


class AssistantAPIStrategy(ExtractionStrategy):
    """Strategy for extracting features using OpenAI Assistant API."""

    def get_strategy_name(self) -> str:
        return "assistant_api"

    def extract(
        self,
        file_path: str,
        temperature: float = 0.7,
        custom_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extract features using Assistant API with function calling."""

        vector_store = None
        assistant = None
        thread = None

        try:
            self.emitter.emit_status(message="Starting task...", progress=0)

            feature_list, feature_obj = get_all_features(self.project_id)

            self.emitter.emit_status(
                message="Building feature functions...", progress=5
            )

            functions = build_openai_feature_functions(feature_list, feature_obj)

            self.emitter.emit_status(
                message="Uploading file to vector store...", progress=10
            )
            vector_store = upload_file_to_vector_store(self.client, file_path)

            self.emitter.emit_status(message="Creating assistant...", progress=15)

            assistant = create_temporary_assistant(
                self.client, temperature, custom_prompt
            )

            schema = self._build_json_schema(feature_list, feature_obj)

            updated_assistant = update_assistant(
                self.client, assistant.id, vector_store, functions, schema=schema
            )

            self.emitter.emit_status(message="Running assistant...", progress=20)

            thread = self.client.beta.threads.create(
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "Please use the defined function to extract features from the paper."
                            "Use the tool call `extract_features` to extract the features "
                            f"which would conform to the following schema: {json.dumps(functions)}"
                        ),
                    }
                ]
            )

            run = self.client.beta.threads.runs.create_and_poll(
                assistant_id=updated_assistant.id,
                thread_id=thread.id,
            )

            # Process run status and handle tool calls
            end_states = ["expired", "completed", "failed", "incomplete", "canceled"]
            while run.status not in end_states:
                logger.info("Assistant run status: %s", run.status)
                run = self.client.beta.threads.runs.retrieve(
                    thread_id=run.thread_id, run_id=run.id
                )
                if run.status in end_states:
                    break
                if run.status == "requires_action":
                    run = self.client.beta.threads.runs.submit_tool_outputs(
                        thread_id=run.thread_id,
                        run_id=run.id,
                        tool_outputs=[
                            {
                                "tool_call_id": run.required_action.submit_tool_outputs.tool_calls[
                                    0
                                ].id,
                                "output": run.required_action.submit_tool_outputs.tool_calls[
                                    0
                                ].function.arguments,
                            }
                        ],
                    )
                time.sleep(10)

            self.emitter.emit_status(message="Assistant run completed.", progress=60)

            messages = self.client.beta.threads.messages.list(thread_id=run.thread_id)
            tool_outputs = json.loads(messages.data[0].content[0].text.value)

            check_output_format(tool_outputs)

            return {
                "result": tool_outputs,
                "prompt_tokens": run.usage.prompt_tokens if run.usage else 0,
                "completion_tokens": run.usage.completion_tokens if run.usage else 0,
            }

        except Exception as e:
            logger.error("Error in AssistantAPIStrategy: %s", e)
            raise
        finally:
            self._cleanup(vector_store, assistant, thread)

    def _build_json_schema(self, feature_list: list, feature_obj: dict) -> dict:
        """Build the JSON schema from features."""
        properties = build_parent_objects(feature_list, feature_obj)

        schema = {
            "type": "object",
            "properties": properties,
            "required": ["paper"],
            "additionalProperties": False,
        }

        # Ensure all objects have additionalProperties: False
        return enforce_additional_properties(schema)

    def _cleanup(self, vector_store, assistant, thread):
        """Clean up resources."""
        self.emitter.emit_status(message="Cleaning up resources...", progress=70)

        try:
            if vector_store:
                vector_store_files = self.client.vector_stores.files.list(
                    vector_store_id=vector_store.id
                )
                file_ids = [file.id for file in vector_store_files.data]

                deleted_vector_store = self.client.vector_stores.delete(
                    vector_store_id=vector_store.id
                )
                if deleted_vector_store.deleted:
                    logger.info("Vector store deleted successfully")

                for file_id in file_ids:
                    deleted_file = self.client.files.delete(file_id)
                    if deleted_file.deleted:
                        logger.info("File deleted successfully")

            if thread:
                self.client.beta.threads.delete(thread_id=thread.id)

            if assistant:
                self.client.beta.assistants.delete(assistant.id)

        except Exception as e:
            logger.error("Error during cleanup: %s", e)
