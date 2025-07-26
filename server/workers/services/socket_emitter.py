"""Socket emitter module to handle socket events."""

import os
from typing import Optional

import socketio


class SocketEmmiter:
    """
    Socket emitter class to handle socket events.
    """

    def __init__(self, socket_id: str, task_id: str):
        self.socket_id = socket_id
        self.task_id = task_id
        self.external_sio = socketio.RedisManager(
            os.getenv("CELERY_BROKER_URL"), write_only=True
        )

    def emit_status(
        self,
        message: str,
        progress: int,
        done: bool = False,
        status: Optional[str] = None,
    ):
        """
        Emit a socket event with status information.

        Args:
            message: Status message to display
            progress: Progress percentage (0-100)
            done: Whether the task is complete
            status: Optional status code (SUCCESS, FAILURE, etc.)
        """
        event_data = {
            "status": message,
            "message": message,  # Include both for compatibility
            "progress": progress,
            "task_id": self.task_id,
            "done": done,
        }

        # Add status code if provided
        if status is not None:
            event_data["status_code"] = status

        self.external_sio.emit(
            "status",
            event_data,
            to=self.socket_id,
            namespace="/home",
        )

    def emit_done(self, message: str = "Finishing up...", status: Optional[str] = None):
        """
        Emit a socket event when the task is done.

        Args:
            message: Completion message
            status: Optional status code
        """
        event_data = {
            "status": message,
            "message": message,
            "progress": 100,
            "task_id": self.task_id,
            "done": True,
        }

        if status is not None:
            event_data["status_code"] = status

        self.external_sio.emit(
            "status",
            event_data,
            to=self.socket_id,
            namespace="/home",
        )
