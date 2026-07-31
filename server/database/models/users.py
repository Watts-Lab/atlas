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

    Security note on ``exclude=True``
    ---------------------------------
    Every sensitive field below is marked ``Field(exclude=True)``. This is a
    defense-in-depth measure that makes the field **invisible to pydantic
    serialization** (``model_dump`` / ``model_dump_json``) while STILL being
    persisted to MongoDB (bunnet writes documents with its own encoder, which
    ignores this flag). Concretely:

    * If any other model links to ``User`` and something dumps that model
      (even with ``fetch_links=True``), the nested user will only ever expose
      ``email`` / timestamps — never ``magic_link``, encrypted API keys, the
      WebAuthn handle, or billing counters.
    * Login, key decryption, and WebAuthn keep working because the values are
      still stored and read from the database as normal.

    Do NOT remove ``exclude=True`` from these fields, and mark any new sensitive
    field the same way.
    """

    email: Indexed(str, unique=True)  # type: ignore
    magic_link: str = Field(exclude=True)
    magic_link_expired: bool = Field(default=True, exclude=True)
    magic_link_expiration_date: datetime = Field(exclude=True)

    # ------------------------------------------------------------------
    # WebAuthn (passkey) user handle: a random, opaque, base64url token that
    # identifies this user *to authenticators*. It is stored on the device and
    # replayed on every passkey login, so per the WebAuthn spec it must contain
    # NO personally identifiable information and must not be a guessable account
    # identifier (never the email or Mongo id). It maps 1:1 to this User, so a
    # passkey still resolves to exactly one account/email. Populated lazily the
    # first time a user registers a passkey.
    # ------------------------------------------------------------------
    webauthn_user_handle: Optional[str] = Field(default=None, exclude=True)

    # ------------------------------------------------------------------
    # Monthly usage budget in USD (only consumed when the user relies on
    # Atlas' platform LLM keys — bring-your-own keys are not metered).
    #
    # Amounts are stored as integer MICRO-DOLLARS (1 USD = 1_000_000 micros)
    # to avoid floating-point drift when accumulating many small charges via
    # atomic $inc. See services/model_pricing.py. Default limit: $5.00.
    # ------------------------------------------------------------------
    monthly_usd_limit_micros: int = Field(default=5_000_000, exclude=True)
    monthly_usd_used_micros: int = Field(default=0, exclude=True)
    # Start of the current calendar-month usage window (UTC). Used to detect
    # when the counter should reset. None until first metered usage.
    usage_period_start: Optional[datetime] = Field(default=None, exclude=True)

    # ------------------------------------------------------------------
    # Bring-your-own provider keys, stored ENCRYPTED (reversible), never
    # hashed — we must decrypt them to call the provider. See utils/crypto.py.
    # The *_prefix fields are safe-to-display masks (e.g. "sk-...ab12").
    # ------------------------------------------------------------------
    openai_api_key_encrypted: Optional[str] = Field(default=None, exclude=True)
    openai_api_key_prefix: Optional[str] = Field(default=None, exclude=True)
    anthropic_api_key_encrypted: Optional[str] = Field(default=None, exclude=True)
    anthropic_api_key_prefix: Optional[str] = Field(default=None, exclude=True)
    openrouter_api_key_encrypted: Optional[str] = Field(default=None, exclude=True)
    openrouter_api_key_prefix: Optional[str] = Field(default=None, exclude=True)

    # A list of recently viewed projects with their view timestamps
    # format : [{"project_id": str, "viewed_at": datetime}]
    # Private user data — excluded from serialization (see class docstring).
    recently_viewed_projects: List[dict] = Field(
        default_factory=list, exclude=True
    )

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
        """Convert the User to a safe, client-facing dictionary.

        Deliberately EXCLUDES all sensitive fields: ``magic_link`` (a login
        credential), the encrypted provider API keys, the WebAuthn handle, and
        billing counters. Never add secrets here — this is a serialization
        surface that can end up in an API response.
        """
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.email,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
