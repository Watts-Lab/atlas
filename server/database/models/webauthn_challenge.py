"""
WebAuthnChallenge model — short-lived, single-use challenges for WebAuthn
(passkey) registration and authentication ceremonies.

Why this lives in MongoDB (and not Redis)
------------------------------------------
The Atlas web tier treats Redis as *optional* (see ``api.py``: the socket.io
manager is only wired up "if redis is set"), whereas MongoDB is a hard
dependency there. Storing ceremony state in Redis would introduce a new hard
dependency to the request path, so we keep it in Mongo where we already have a
connection.

Security properties
-------------------
- **Single-use:** consumed via delete the moment it is looked up, so a captured
  challenge cannot be replayed.
- **Short-lived:** a TTL index on ``expires_at`` lets MongoDB reap stale
  challenges automatically; ``consume`` also re-checks expiry in code because
  the TTL monitor only runs about once a minute.
- **Ceremony-bound:** each challenge carries a random ``ceremony_id`` that is
  also handed to the browser as an HTTP-only cookie, so the verify step must
  present the same cookie that started the ceremony.
- **User-bound (registration only):** registration challenges record the
  ``user_email`` of the logged-in session that created them, so a challenge
  minted for one account cannot be completed against another.
"""

from datetime import UTC, datetime
from typing import Optional

from bunnet import Document, Indexed
from pydantic import Field
from pymongo import ASCENDING, IndexModel

# Ceremony type constants.
CEREMONY_REGISTRATION = "registration"
CEREMONY_AUTHENTICATION = "authentication"


class WebAuthnChallenge(Document):
    """A pending WebAuthn ceremony challenge."""

    # Random opaque id, also delivered to the browser as an HTTP-only cookie so
    # the verify request must originate from the same client that began it.
    ceremony_id: Indexed(str, unique=True)  # type: ignore[valid-type]

    # base64url-encoded challenge bytes handed to the authenticator.
    challenge: str

    # One of CEREMONY_REGISTRATION / CEREMONY_AUTHENTICATION.
    ceremony_type: str

    # For registration ceremonies: the email of the authenticated user the
    # challenge was issued to. None for (discoverable) authentication ceremonies.
    user_email: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime

    class Settings:
        name = "webauthn_challenges"
        # TTL index: MongoDB deletes each document once wall-clock passes
        # expires_at (expireAfterSeconds=0 means "at the stored time").
        indexes = [
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
        ]
