"""
ApiKey model. Stores hashed API keys for programmatic access.

The raw key is NEVER stored — only a SHA-256 hex digest of it.
The raw key is returned exactly once (at creation time) by the controller.
"""

from datetime import UTC, datetime
from typing import Optional

from bunnet import Document, Indexed, Link
from database.models.users import User
from pydantic import Field


class ApiKey(Document):
    """
    Represents a user-created API key.

    Fields
    ------
    key_hash  : SHA-256 hex digest of the full raw key. Unique index for O(1) lookup.
    prefix    : First 8 characters of the raw key (e.g. ``atlas_a3``).
                Safe to display — conveys no secret information.
    name      : Human-readable label chosen by the user.
    user      : Reference to the owning User document.
    is_active : Whether the key is currently valid.
    created_at   : Creation timestamp.
    last_used_at : Last successful authentication timestamp (None until first use).
    """

    key_hash: Indexed(str, unique=True)  # type: ignore[valid-type]
    prefix: str
    name: str
    user: Link[User]
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_used_at: Optional[datetime] = None

    class Settings:
        name = "api_keys"
        use_revision = True

    def __str__(self) -> str:  # pragma: no cover
        return f"ApiKey(prefix={self.prefix!r}, name={self.name!r})"

    def to_dict(self) -> dict:
        """
        Serialise to a safe dictionary — the ``key_hash`` field is intentionally
        excluded so it is never accidentally leaked in an API response.
        """
        return {
            "id": str(self.id),
            "prefix": self.prefix,
            "name": self.name,
            "user_id": str(self.user.ref.id) if self.user else None,  # type: ignore[union-attr]
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_used_at": (
                self.last_used_at.isoformat() if self.last_used_at else None
            ),
        }
