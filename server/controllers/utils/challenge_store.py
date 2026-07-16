"""
Server-side storage for in-flight WebAuthn ceremony challenges.

A WebAuthn ceremony spans two HTTP requests:

1. ``/options`` — the server generates a random challenge and returns it to the
   browser to feed to the authenticator.
2. ``/verify``  — the browser returns the authenticator's signed response, which
   the server checks against the challenge it issued in step 1.

The challenge issued in step 1 must be remembered until step 2, then destroyed
so it can never be reused (replay protection). We persist it in MongoDB (see
:class:`~database.models.webauthn_challenge.WebAuthnChallenge` for why Mongo and
not Redis) with a TTL index for automatic cleanup.

Each helper returns/accepts a random ``ceremony_id`` which the route layer also
sets as a short-lived HTTP-only cookie, binding the verify request to the same
browser that started the ceremony.
"""

import secrets
from datetime import UTC, datetime, timedelta
from typing import Optional

from database.models.webauthn_challenge import WebAuthnChallenge

# How long a ceremony may stay open before the challenge is rejected.
_CHALLENGE_TTL_SECONDS = 300  # 5 minutes


def create_challenge(
    *,
    challenge: str,
    ceremony_type: str,
    user_email: Optional[str] = None,
) -> str:
    """Persist a new challenge and return its random ``ceremony_id``.

    Parameters
    ----------
    challenge : str
        base64url-encoded challenge bytes issued to the authenticator.
    ceremony_type : str
        ``"registration"`` or ``"authentication"``.
    user_email : str, optional
        For registration, the email of the authenticated user the challenge is
        issued to (binds the ceremony to that account).
    """
    ceremony_id = secrets.token_urlsafe(32)
    now = datetime.now(UTC)

    WebAuthnChallenge(
        ceremony_id=ceremony_id,
        challenge=challenge,
        ceremony_type=ceremony_type,
        user_email=user_email,
        created_at=now,
        expires_at=now + timedelta(seconds=_CHALLENGE_TTL_SECONDS),
    ).create()

    return ceremony_id


def consume_challenge(
    ceremony_id: str, *, ceremony_type: str
) -> Optional[WebAuthnChallenge]:
    """Atomically fetch-and-delete a challenge, enforcing single use.

    Returns the challenge document if it exists, matches *ceremony_type*, and
    has not expired; otherwise ``None``. The document is deleted regardless of
    the expiry outcome so a challenge can never be presented twice.

    Parameters
    ----------
    ceremony_id : str
        The id returned by :func:`create_challenge` (read from the ceremony
        cookie by the caller).
    ceremony_type : str
        The ceremony type the caller expects; a mismatch is treated as invalid.
    """
    if not ceremony_id:
        return None

    # find_one_and_delete is atomic at the document level in MongoDB, so two
    # concurrent verify requests can never both observe the same challenge.
    # We drop to the raw pymongo collection because bunnet has no single-call
    # fetch-and-delete on the query builder.
    raw = WebAuthnChallenge.get_motor_collection().find_one_and_delete(
        {"ceremony_id": ceremony_id}
    )

    if raw is None:
        return None

    doc = WebAuthnChallenge.model_validate(raw)

    if doc.ceremony_type != ceremony_type:
        return None

    # Defensive expiry check: the TTL monitor only sweeps ~once per minute, so a
    # just-expired challenge may still be present.
    expires_at = doc.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if datetime.now(UTC) >= expires_at:
        return None

    return doc
