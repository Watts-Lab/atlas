"""
This file contains the tests for the assistant API.
"""

import unittest
from unittest.mock import Mock, patch
from workers.gpt_assistant import call_asssistant_api


class TestAssistantAPI(unittest.TestCase):
    """
    Test the assistant API.
    """

    @patch("assistant.get_all_features")
    @patch("assistant.build_feature_functions")
    @patch("assistant.upload_file_to_vector_store")
    @patch("assistant.update_assistant")
    @patch("assistant.client.beta.threads.create")
    @patch("assistant.client.beta.threads.runs.create_and_poll")
    @patch("assistant.json.loads")
    @patch("assistant.check_output_format")
    @patch("assistant.client.beta.vector_stores.files.list")
    @patch("assistant.client.beta.vector_stores.delete")
    @patch("assistant.client.files.delete")
    @patch("assistant.client.beta.threads.delete")
    def test_call_assistant_api(
        self,
        mock_delete_thread,
        mock_delete_file,
        mock_delete_vector_store,
        mock_list_files,
        mock_check_output_format,
        mock_json_loads,
        mock_create_and_poll,
        mock_create_thread,
        mock_update_assistant,
        mock_upload_file,
        mock_build_feature_functions,
        mock_get_all_features,
    ):
        """
        Test the call_assistant_api function.
        """
        # Mock the necessary dependencies
        mock_get_all_features.return_value = (
            ["features.condition.name"],
            ["features.behavior.description"],
        )
        mock_build_feature_functions.return_value = {
            "name": "define_conditions_and_behaviors"
        }
        mock_upload_file.return_value = "https://example.com/file"
        mock_update_assistant.return_value = Mock(id="assistant_id")
        mock_create_thread.return_value = Mock(id="thread_id")
        mock_create_and_poll.return_value = Mock(
            required_action=Mock(
                submit_tool_outputs=Mock(
                    tool_calls=[Mock(function=Mock(arguments="{}"))]
                )
            )
        )
        mock_json_loads.return_value = {}
        mock_check_output_format.return_value = True
        mock_list_files.return_value = Mock(data=[Mock(id="file_id")])
        mock_delete_vector_store.return_value = Mock(deleted=True)
        mock_delete_file.return_value = Mock(deleted=True)
        mock_delete_thread.return_value = None

        # Call the function
        result = call_asssistant_api("file_path", "sid", "sio")

        # Assert the expected behavior
        self.assertEqual(result, {})

        # Assert that the dependencies were called with the correct arguments
        mock_get_all_features.assert_called_once()
        mock_build_feature_functions.assert_called_once_with(
            (["features.condition.name"], ["features.behavior.description"])
        )
        mock_upload_file.assert_called_once_with("file_path")
        mock_update_assistant.assert_called_once_with(
            "asst_2THkE8dZlIZDDCZvd3ZBjara",
            "https://example.com/file",
            {"name": "define_conditions_and_behaviors"},
        )
        mock_create_thread.assert_called_once_with(
            messages=[{"role": "user", "content": "define_conditions_and_behaviors"}]
        )
        mock_create_and_poll.assert_called_once_with(
            thread_id="thread_id", assistant_id="assistant_id"
        )
        mock_json_loads.assert_called_once_with("{}")
        mock_check_output_format.assert_called_once_with({})
        mock_list_files.assert_called_once_with(vector_store_id="vector_store_id")
        mock_delete_vector_store.assert_called_once_with(
            vector_store_id="vector_store_id"
        )
        mock_delete_file.assert_called_once_with(file_id="file_id")
        mock_delete_thread.assert_called_once_with(thread_id="thread_id")


if __name__ == "__main__":
    unittest.main()
