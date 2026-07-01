"""Symmetric encryption helpers for secrets stored at rest.

Used to store users' bring-your-own LLM provider keys (OpenAI / Anthropic).
Unlike Atlas API keys — which are *hashed* because we only ever need to verify
them — provider keys must be **reversibly encrypted**: we have to recover the
plaintext to actually call the provider on the user's behalf.

Encryption uses Fernet (AES-128-CBC + HMAC) with a key supplied via the
``ENCRYPTION_KEY`` environment variable. Generate one with::

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

The key must be kept secret and stable — rotating it makes previously stored
ciphertext undecryptable.
"""

import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken


class EncryptionError(RuntimeError):
    """Raised when encryption/decryption cannot be performed."""


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    """Build (once) the Fernet instance from ``ENCRYPTION_KEY``."""
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise EncryptionError(
            "ENCRYPTION_KEY environment variable is not set. It is required to "
            "encrypt/decrypt stored provider API keys."
        )
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except (ValueError, TypeError) as exc:
        raise EncryptionError(
            "ENCRYPTION_KEY is not a valid Fernet key. Generate one with "
            "Fernet.generate_key()."
        ) from exc


def encrypt_secret(plaintext: str) -> str:
    """Encrypt *plaintext* and return URL-safe base64 ciphertext (str)."""
    if not plaintext:
        raise EncryptionError("Cannot encrypt an empty secret.")
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt *ciphertext* produced by :func:`encrypt_secret`.

    Raises :class:`EncryptionError` if the ciphertext is invalid or was
    encrypted with a different key.
    """
    if not ciphertext:
        raise EncryptionError("Cannot decrypt an empty value.")
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise EncryptionError(
            "Failed to decrypt secret — the ENCRYPTION_KEY may have changed or "
            "the stored value is corrupt."
        ) from exc
