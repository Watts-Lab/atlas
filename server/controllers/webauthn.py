"""
WebAuthn (passkey) controller: registration and authentication ceremonies.

This module implements passwordless login with platform authenticators (Touch
ID, Face ID, Windows Hello) and roaming security keys, layered *alongside* the
existing magic-link flow rather than replacing it — a lost device therefore
never locks a user out.

Design decisions specific to Atlas
----------------------------------
- **Discoverable credentials (resident keys).** Login is usernameless: the
  authenticator reveals which passkey to use and returns its ``user_handle``,
  which we map to a single :class:`~database.models.users.User`. This is purely
  a UX/enumeration improvement — every credential is still bound server-side to
  exactly one account (and therefore one email), so per-user credit assignment
  is unaffected.
- **user_verification = REQUIRED.** For a *passwordless* factor we must be sure
  a biometric or PIN actually happened, so we require UV in both ceremonies.
- **Challenges live in MongoDB**, single-use, short TTL, bound to the browser
  via a ceremony cookie. See ``controllers/utils/challenge_store.py``.
- **Session issuance is identical to magic-link login.** On success we mint the
  same HTTP-only ``jwt`` cookie that ``controllers/login.validate_user`` issues,
  so the rest of the app needs no changes.
"""

import logging
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from controllers.utils.challenge_store import (
    consume_challenge,
    create_challenge,
)
from database.models.passkeys import Passkey
from database.models.users import User
from database.models.webauthn_challenge import (
    CEREMONY_AUTHENTICATION,
    CEREMONY_REGISTRATION,
)
from sanic import Sanic
from sanic import json as json_response
from sanic import raw as raw_response
from webauthn import (
    base64url_to_bytes,
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

logger = logging.getLogger(__name__)

# Name of the short-lived cookie that binds a verify request to the options
# request that started the ceremony.
CEREMONY_COOKIE = "webauthn_ceremony"
_CEREMONY_COOKIE_MAX_AGE = 300  # seconds; matches the challenge TTL

# Cap passkeys per user to keep the allow-list bounded (mirrors the API-key cap).
_MAX_PASSKEYS_PER_USER = 20


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _config():
    return Sanic.get_app("Atlas").config


def _ensure_user_handle(user: User) -> bytes:
    """Return the user's WebAuthn handle bytes, creating one if absent.

    The handle is a random, opaque, base64url token containing no PII. It is
    generated once per user and reused for every credential they register.
    """
    if not getattr(user, "webauthn_user_handle", None):
        user.webauthn_user_handle = secrets.token_urlsafe(32)
        user.updated_at = datetime.now(UTC)
        user.save()
    return base64url_to_bytes(user.webauthn_user_handle)


def _issue_session_cookie(response, email: str) -> None:
    """Attach the same ``jwt`` session cookie used by magic-link login."""
    config = _config()
    token = jwt.encode(
        {
            "email": email,
            "exp": datetime.now(UTC) + timedelta(hours=48),
        },
        config.JWT_SECRET,
        algorithm="HS256",
    )
    response.add_cookie(
        "jwt",
        value=token,
        max_age=60 * 60 * 24 * 2,  # 2 days, matching validate_user
        httponly=True,
        secure=config.SECURE_COOKIES,
        samesite="Lax",
    )


def _set_ceremony_cookie(response, ceremony_id: str) -> None:
    config = _config()
    response.add_cookie(
        CEREMONY_COOKIE,
        value=ceremony_id,
        max_age=_CEREMONY_COOKIE_MAX_AGE,
        httponly=True,
        secure=config.SECURE_COOKIES,
        samesite="Lax",
    )


def _clear_ceremony_cookie(response) -> None:
    config = _config()
    response.add_cookie(
        CEREMONY_COOKIE,
        value="",
        max_age=0,
        httponly=True,
        secure=config.SECURE_COOKIES,
        samesite="Lax",
    )


def _device_name_from_request(body: dict) -> str:
    name = (body.get("device_name") or "").strip()
    if not name:
        return "Passkey"
    return name[:100]


# ---------------------------------------------------------------------------
# Registration ceremony (must be called by an authenticated user)
# ---------------------------------------------------------------------------
def registration_options(user: User):
    """Begin passkey registration for the authenticated *user*."""
    config = _config()

    active_count = Passkey.find(
        Passkey.user.id == user.id,  # type: ignore[union-attr]
        Passkey.is_active == True,  # noqa: E712 - bunnet needs ==
        fetch_links=False,
    ).count()
    if active_count >= _MAX_PASSKEYS_PER_USER:
        return json_response(
            {
                "error": True,
                "message": (
                    f"You already have the maximum of {_MAX_PASSKEYS_PER_USER} "
                    "passkeys. Remove one before adding another."
                ),
            },
            status=400,
        )

    handle = _ensure_user_handle(user)

    # Exclude already-registered credentials so the same authenticator can't be
    # enrolled twice.
    existing = Passkey.find(
        Passkey.user.id == user.id,  # type: ignore[union-attr]
        fetch_links=False,
    ).to_list()
    exclude = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(pk.credential_id))
        for pk in existing
    ]

    options = generate_registration_options(
        rp_id=config.WEBAUTHN_RP_ID,
        rp_name=config.WEBAUTHN_RP_NAME,
        user_id=handle,
        user_name=user.email,
        user_display_name=user.email,
        exclude_credentials=exclude,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
    )

    ceremony_id = create_challenge(
        challenge=bytes_to_base64url(options.challenge),
        ceremony_type=CEREMONY_REGISTRATION,
        user_email=user.email,
    )

    # options_to_json() already returns a JSON *string*; send it raw so we don't
    # double-encode it (which would deliver a quoted string to the browser and
    # break navigator.credentials.create()).
    response = raw_response(
        options_to_json(options), status=200, content_type="application/json"
    )
    _set_ceremony_cookie(response, ceremony_id)
    return response


def registration_verify(user: User, credential: dict, ceremony_id: str, body: dict):
    """Complete passkey registration for the authenticated *user*."""
    config = _config()

    challenge = consume_challenge(ceremony_id, ceremony_type=CEREMONY_REGISTRATION)
    if challenge is None:
        return json_response(
            {"error": True, "message": "Registration session expired. Try again."},
            status=400,
        )

    # The challenge is bound to the account that started the ceremony; a logged
    # in user may only complete their own registration.
    if challenge.user_email != user.email:
        return json_response(
            {"error": True, "message": "Registration session mismatch."},
            status=400,
        )

    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge.challenge),
            expected_origin=config.WEBAUTHN_ORIGIN,
            expected_rp_id=config.WEBAUTHN_RP_ID,
            require_user_verification=True,
        )
    except Exception as exc:  # noqa: BLE001 - library raises many subtypes
        logger.warning("Passkey registration verification failed: %s", exc)
        return json_response(
            {"error": True, "message": "Could not verify passkey."}, status=400
        )

    credential_id = bytes_to_base64url(verification.credential_id)

    # Guard against duplicate credential ids (also enforced by the unique index).
    if Passkey.find_one(Passkey.credential_id == credential_id).run() is not None:
        return json_response(
            {"error": True, "message": "This passkey is already registered."},
            status=409,
        )

    Passkey(
        credential_id=credential_id,
        public_key=bytes_to_base64url(verification.credential_public_key),
        sign_count=verification.sign_count,
        transports=body.get("transports") or [],
        aaguid=verification.aaguid,
        # "multi_device" credentials are eligible to be synced (e.g. iCloud/Google).
        backup_eligible=verification.credential_device_type == "multi_device",
        backup_state=bool(verification.credential_backed_up),
        device_name=_device_name_from_request(body),
        user=user,  # type: ignore[arg-type]
        is_active=True,
    ).create()

    response = json_response({"verified": True}, status=201)
    _clear_ceremony_cookie(response)
    return response


# ---------------------------------------------------------------------------
# Authentication ceremony (anonymous → session)
# ---------------------------------------------------------------------------
def authentication_options():
    """Begin usernameless passkey login."""
    config = _config()

    # Discoverable credentials: no allow-list, the authenticator picks. This is
    # what makes login usernameless and avoids account enumeration.
    options = generate_authentication_options(
        rp_id=config.WEBAUTHN_RP_ID,
        user_verification=UserVerificationRequirement.REQUIRED,
    )

    ceremony_id = create_challenge(
        challenge=bytes_to_base64url(options.challenge),
        ceremony_type=CEREMONY_AUTHENTICATION,
    )

    # See registration_options: send the pre-serialized JSON string raw.
    response = raw_response(
        options_to_json(options), status=200, content_type="application/json"
    )
    _set_ceremony_cookie(response, ceremony_id)
    return response


def authentication_verify(credential: dict, ceremony_id: str):
    """Complete passkey login and, on success, establish a session."""
    config = _config()

    # Generic failure used for every rejection so we never reveal whether a
    # given credential or account exists.
    def _reject():
        return json_response(
            {"error": True, "message": "Passkey authentication failed."}, status=401
        )

    challenge = consume_challenge(ceremony_id, ceremony_type=CEREMONY_AUTHENTICATION)
    if challenge is None:
        return _reject()

    credential_id = credential.get("id")
    if not credential_id:
        return _reject()

    passkey = Passkey.find_one(Passkey.credential_id == credential_id).run()
    if passkey is None or not passkey.is_active:
        return _reject()

    # Resolve the owning user and confirm the returned user handle matches, so a
    # signed assertion for credential X can only log in as X's owner.
    try:
        user = User.get(passkey.user.ref.id).run()  # type: ignore[union-attr]
    except Exception:  # noqa: BLE001
        return _reject()
    if user is None:
        return _reject()

    response_handle = (credential.get("response") or {}).get("userHandle")
    if response_handle and user.webauthn_user_handle:
        if response_handle != user.webauthn_user_handle:
            return _reject()

    try:
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge.challenge),
            expected_origin=config.WEBAUTHN_ORIGIN,
            expected_rp_id=config.WEBAUTHN_RP_ID,
            credential_public_key=base64url_to_bytes(passkey.public_key),
            credential_current_sign_count=passkey.sign_count,
            require_user_verification=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Passkey authentication verification failed: %s", exc)
        return _reject()

    # Signature-counter cloning check. Authenticators that implement a counter
    # must be strictly increasing; many synced passkeys report 0 forever, which
    # is legitimate, so only reject a real regression (new <= stored, stored>0).
    new_count = verification.new_sign_count
    if passkey.sign_count > 0 and new_count != 0 and new_count <= passkey.sign_count:
        logger.warning(
            "Passkey sign_count regression for credential ending %s (stored=%s new=%s)",
            passkey.credential_id[-6:],
            passkey.sign_count,
            new_count,
        )
        return _reject()

    # Best-effort bookkeeping — don't let a write failure block a valid login.
    try:
        passkey.sign_count = new_count
        passkey.last_used_at = datetime.now(UTC)
        passkey.save()
    except Exception:  # noqa: BLE001
        pass

    from services.llm_credentials import get_usage

    response = json_response(
        {
            "message": "Passkey authentication successful.",
            "email": user.email,
            "usage": get_usage(user),
        },
        status=200,
    )
    _issue_session_cookie(response, user.email)
    _clear_ceremony_cookie(response)
    return response


# ---------------------------------------------------------------------------
# Passkey management (session-only)
# ---------------------------------------------------------------------------
def list_passkeys(user: User) -> list:
    """Return all passkeys belonging to *user* (no secret material)."""
    passkeys = Passkey.find(
        Passkey.user.id == user.id,  # type: ignore[union-attr]
        fetch_links=False,
    ).to_list()
    return [pk.to_dict() for pk in passkeys]


def delete_passkey(user: User, passkey_id: str) -> dict:
    """Permanently delete one of *user*'s passkeys.

    Raises ``ValueError`` if the passkey is not found or not owned by *user*.
    Ownership failures return the same "not found" message so existence is not
    leaked (mirrors the API-key controller).
    """
    from bunnet import PydanticObjectId

    try:
        oid = PydanticObjectId(passkey_id)
    except Exception:
        raise ValueError("Passkey not found.")

    passkey = Passkey.get(oid).run()
    if passkey is None:
        raise ValueError("Passkey not found.")
    if str(passkey.user.ref.id) != str(user.id):  # type: ignore[union-attr]
        raise ValueError("Passkey not found.")

    passkey.delete()
    return {"success": True, "id": passkey_id}
