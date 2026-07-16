"""
User model. This model is used to store user data in the database.
"""

from datetime import UTC, datetime
from typing import List, Optional

from bunnet import Document, Indexed
from pydantic import Field


class User(Document):
    """
    User model.
    """

    email: Indexed(str, unique=True)  # type: ignore
    magic_link: str
    magic_link_expired: bool = True
    magic_link_expiration_date: datetime

    # ------------------------------------------------------------------
    # WebAuthn (passkey) user handle: a random, opaque, base64url token that
    # identifies this user *to authenticators*. It is stored on the device and
    # replayed on every passkey login, so per the WebAuthn spec it must contain
    # NO personally identifiable information and must not be a guessable account
    # identifier (never the email or Mongo id). It maps 1:1 to this User, so a
    # passkey still resolves to exactly one account/email. Populated lazily the
    # first time a user registers a passkey.
    # ------------------------------------------------------------------
    webauthn_user_handle: Optional[str] = None

    # ------------------------------------------------------------------
    # Monthly usage budget in USD (only consumed when the user relies on
    # Atlas' platform LLM keys — bring-your-own keys are not metered).
    #
    # Amounts are stored as integer MICRO-DOLLARS (1 USD = 1_000_000 micros)
    # to avoid floating-point drift when accumulating many small charges via
    # atomic $inc. See services/model_pricing.py. Default limit: $5.00.
    # ------------------------------------------------------------------
    monthly_usd_limit_micros: int = 5_000_000
    monthly_usd_used_micros: int = 0
    # Start of the current calendar-month usage window (UTC). Used to detect
    # when the counter should reset. None until first metered usage.
    usage_period_start: Optional[datetime] = None

    # ------------------------------------------------------------------
    # Bring-your-own provider keys, stored ENCRYPTED (reversible), never
    # hashed — we must decrypt them to call the provider. See utils/crypto.py.
    # The *_prefix fields are safe-to-display masks (e.g. "sk-...ab12").
    # ------------------------------------------------------------------
    openai_api_key_encrypted: Optional[str] = None
    openai_api_key_prefix: Optional[str] = None
    anthropic_api_key_encrypted: Optional[str] = None
    anthropic_api_key_prefix: Optional[str] = None

    # A list of recently viewed projects with their view timestamps
    # format : [{"project_id": str, "viewed_at": datetime}]
    recently_viewed_projects: List[dict] = Field(default_factory=list)

    created_at: datetime = datetime.now(UTC)
    updated_at: datetime = datetime.now(UTC)

    class Settings:
        """
        Settings for the User model.
        """

        name = "users"
        use_revision = True

    def __str__(self):
        return self.email

    def to_dict(self) -> dict:
        """
        Convert the User object to a dictionary.
        """
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.email,
            "magic_link": self.magic_link,
            "magic_link_expired": self.magic_link_expired,
            "magic_link_expiration_date": self.magic_link_expiration_date,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
