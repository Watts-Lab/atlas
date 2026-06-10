"""
Controller functions for API key management.

Security design
---------------
- Raw keys are generated with ``secrets.token_hex(32)`` (256 bits of entropy).
- The key format is:  ``atlas_<64-hex-chars>``  (~70 chars total).
- Only the SHA-256 hex digest of the full raw key is persisted; the raw key
  itself is returned *once* by ``create_api_key`` and never stored.
- The first 8 characters of the raw key (e.g. ``atlas_a3``) are stored as a
  display-only ``prefix`` so users can identify a key without exposing it.
"""

import hashlib
import secrets
from datetime import UTC, datetime
from typing import Optional

from bunnet import PydanticObjectId
from database.models.api_keys import ApiKey
from database.models.users import User

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_KEY_PREFIX = "atlas_"

# Maximum number of *active* keys a single user may hold at once.
_MAX_ACTIVE_KEYS_PER_USER = 20

# Maximum length of a user-supplied key label.
_MAX_KEY_NAME_LENGTH = 100


def _generate_raw_key() -> str:
    """Return a fresh raw key: ``atlas_`` + 64 hex chars (32 random bytes)."""
    return _KEY_PREFIX + secrets.token_hex(32)


def _hash_key(raw_key: str) -> str:
    """Return the SHA-256 hex digest of *raw_key*."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _display_prefix(raw_key: str) -> str:
    """
    Return the first 8 characters of *raw_key* for display purposes.

    Example: ``atlas_a3``
    """
    return raw_key[:8]


# ---------------------------------------------------------------------------
# Public controller functions
# ---------------------------------------------------------------------------


def create_api_key(user: User, name: str) -> dict:
    """
    Generate a new API key for *user*, persist only the hash, and return the
    raw key exactly once.

    Parameters
    ----------
    user : User
        The owning user document (must already be saved in the database).
    name : str
        A human-readable label for the key.

    Returns
    -------
    dict
        ``{"key": <raw_key>, "prefix": ..., "name": ..., "id": ...}``

        .. warning::
            ``key`` is the **only** time the raw key is ever available.
            It must be displayed to the user immediately and cannot be
            recovered afterwards.

    Raises
    ------
    ValueError
        If *name* is empty or too long, or the user already holds the maximum
        number of active keys.
    """
    name = (name or "").strip()
    if not name:
        raise ValueError("A non-empty 'name' is required.")
    if len(name) > _MAX_KEY_NAME_LENGTH:
        raise ValueError(f"'name' must be at most {_MAX_KEY_NAME_LENGTH} characters.")

    active_count = ApiKey.find(
        ApiKey.user.id == user.id,  # type: ignore[union-attr]
        ApiKey.is_active == True,  # noqa: E712 - bunnet query needs ==
        fetch_links=False,
    ).count()
    if active_count >= _MAX_ACTIVE_KEYS_PER_USER:
        raise ValueError(
            f"You already have the maximum of {_MAX_ACTIVE_KEYS_PER_USER} "
            "active API keys. Revoke one before creating another."
        )

    raw_key = _generate_raw_key()
    key_hash = _hash_key(raw_key)
    prefix = _display_prefix(raw_key)

    api_key = ApiKey(
        key_hash=key_hash,
        prefix=prefix,
        name=name,
        user=user,  # type: ignore[arg-type]
        is_active=True,
        created_at=datetime.now(UTC),
        last_used_at=None,
    )
    api_key.create()

    return {
        "key": raw_key,  # shown once — never stored
        "prefix": prefix,
        "name": name,
        "id": str(api_key.id),
    }


def list_api_keys(user: User) -> list:
    """
    Return all API keys belonging to *user*.

    The ``key_hash`` field is **never** included in the output.

    Parameters
    ----------
    user : User
        The owning user document.

    Returns
    -------
    list[dict]
        Each entry contains: ``id``, ``name``, ``prefix``, ``is_active``,
        ``created_at``, ``last_used_at``.
    """
    keys: list[ApiKey] = ApiKey.find(
        ApiKey.user.id == user.id,  # type: ignore[union-attr]
        fetch_links=False,
    ).to_list()

    return [
        {
            "id": str(k.id),
            "name": k.name,
            "prefix": k.prefix,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        }
        for k in keys
    ]


def revoke_api_key(user: User, key_id: str) -> dict:
    """
    Deactivate an API key (set ``is_active = False``).

    The key document is retained in the database so that audit logs remain
    intact. Use :func:`delete_api_key` for a hard delete.

    Parameters
    ----------
    user : User
        Must be the owner of the key.
    key_id : str
        The ``id`` of the :class:`~database.models.api_keys.ApiKey` document.

    Returns
    -------
    dict
        ``{"success": True, "id": key_id}`` on success.

    Raises
    ------
    ValueError
        If the key is not found or does not belong to *user*.
    """
    try:
        oid = PydanticObjectId(key_id)
    except Exception:
        raise ValueError(f"Invalid key_id: {key_id!r}")

    api_key: Optional[ApiKey] = ApiKey.get(oid).run()

    if api_key is None:
        raise ValueError("API key not found.")

    if str(api_key.user.ref.id) != str(user.id):  # type: ignore[union-attr]
        raise ValueError("API key not found.")  # deliberate: don't leak existence

    api_key.is_active = False
    api_key.save()

    return {"success": True, "id": key_id}


def delete_api_key(user: User, key_id: str) -> dict:
    """
    Permanently delete an API key document.

    Parameters
    ----------
    user : User
        Must be the owner of the key.
    key_id : str
        The ``id`` of the :class:`~database.models.api_keys.ApiKey` document.

    Returns
    -------
    dict
        ``{"success": True, "id": key_id}`` on success.

    Raises
    ------
    ValueError
        If the key is not found or does not belong to *user*.
    """
    try:
        oid = PydanticObjectId(key_id)
    except Exception:
        raise ValueError(f"Invalid key_id: {key_id!r}")

    api_key: Optional[ApiKey] = ApiKey.get(oid).run()

    if api_key is None:
        raise ValueError("API key not found.")

    if str(api_key.user.ref.id) != str(user.id):  # type: ignore[union-attr]
        raise ValueError("API key not found.")  # deliberate: don't leak existence

    api_key.delete()

    return {"success": True, "id": key_id}


def authenticate_api_key(raw_key: str) -> Optional[User]:
    """
    Validate *raw_key* and return the associated :class:`~database.models.users.User`.

    Steps
    -----
    1. Hash the supplied key with SHA-256.
    2. Look up the ``ApiKey`` document by ``key_hash`` (unique index — O(1)).
    3. Reject if ``is_active`` is ``False``.
    4. Update ``last_used_at`` to *now*.
    5. Fetch and return the linked ``User`` document.

    Parameters
    ----------
    raw_key : str
        The full raw API key as supplied by the caller (e.g. via the
        ``X-API-Key`` request header).

    Returns
    -------
    User | None
        The owning user on success, or ``None`` if the key is invalid,
        inactive, or the user no longer exists.
    """
    if not raw_key:
        return None

    key_hash = _hash_key(raw_key)

    api_key: Optional[ApiKey] = ApiKey.find_one(ApiKey.key_hash == key_hash).run()

    if api_key is None or not api_key.is_active:
        return None

    # Update last_used_at — best-effort; don't let a save failure block auth.
    try:
        api_key.last_used_at = datetime.now(UTC)
        api_key.save()
    except Exception:
        pass

    # Resolve the Link[User] reference.
    try:
        user: Optional[User] = User.get(api_key.user.ref.id).run()  # type: ignore[union-attr]
    except Exception:
        return None

    return user
