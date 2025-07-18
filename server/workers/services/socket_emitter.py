"""Socket emitter module to handle socket events."""

import os
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

    def emit_status(self, message: str, progress: int):
        """
        Emit a socket event.
        """
        self.external_sio.emit(
            "status",
            {
                "status": message,
                "progress": progress,
                "task_id": self.task_id,
                "done": False,
            },
            to=self.socket_id,
            namespace="/home",
        )

    def emit_done(self):
        """
        Emit a socket event when the task is done.
        """
        self.external_sio.emit(
            "status",
            {
                "status": "Finishing up...",
                "progress": 100,
                "task_id": self.task_id,
                "done": True,
            },
            to=self.socket_id,
            namespace="/home",
        )
