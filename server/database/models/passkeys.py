"""
Passkey model. Stores WebAuthn (FIDO2) credentials that let a user log in with
Touch ID, Face ID, Windows Hello, or a hardware security key.

What is (and isn't) secret here
-------------------------------
A passkey's private key never leaves the user's authenticator (Secure Enclave,
TPM, security key). The server only ever stores the **public** key, so — unlike
API keys — there is no secret to hash. We store the public key verbatim; it is
useless to an attacker without the matching private key.

Each credential is bound to exactly one :class:`~database.models.users.User`
via a ``Link`` (mirroring :class:`~database.models.api_keys.ApiKey`), so a
passkey always resolves to a single account and therefore a single email — this
is what keeps per-user credit assignment correct.
"""

from datetime import UTC, datetime
from typing import List, Optional

from bunnet import Document, Indexed, Link
from database.models.users import User
from pydantic import Field


class Passkey(Document):
    """A registered WebAuthn credential belonging to a user.

    Fields
    ------
    credential_id      : base64url credential id from the authenticator.
                         Unique index — used to look up the credential at login.
    public_key         : base64url COSE public key. Used to verify assertions.
                         Public data, not a secret.
    sign_count         : Signature counter; used to detect cloned authenticators.
    transports         : Hints (e.g. ["internal", "hybrid"]) for the browser UI.
    aaguid             : Authenticator model identifier (not user-identifying).
    backup_eligible    : Whether the credential may be synced (e.g. iCloud).
    backup_state       : Whether the credential is currently backed up/synced.
    device_name        : Human-readable label chosen by / inferred for the user.
    user               : Reference to the owning User document.
    is_active          : Whether the credential may still be used to log in.
    created_at         : Registration timestamp.
    last_used_at       : Last successful authentication timestamp.
    """

    credential_id: Indexed(str, unique=True)  # type: ignore[valid-type]
    public_key: str
    sign_count: int = 0
    transports: List[str] = Field(default_factory=list)
    aaguid: Optional[str] = None
    backup_eligible: bool = False
    backup_state: bool = False
    device_name: str = "Passkey"
    user: Link[User]
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_used_at: Optional[datetime] = None

    class Settings:
        name = "passkeys"
        use_revision = True

    def __str__(self) -> str:  # pragma: no cover
        return f"Passkey(device_name={self.device_name!r})"

    def to_dict(self) -> dict:
        """Serialise to a safe dictionary for API responses.

        ``public_key`` and ``credential_id`` are omitted — they are internal
        verification material and never need to reach the client.
        """
        return {
            "id": str(self.id),
            "device_name": self.device_name,
            "is_active": self.is_active,
            "backup_state": self.backup_state,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_used_at": (
                self.last_used_at.isoformat() if self.last_used_at else None
            ),
        }
