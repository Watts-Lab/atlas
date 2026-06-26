"""OpenAPI documentation for authentication routes."""

from routes.v1.docs.common import (
    Endpoint,
    json_body,
    make_getattr,
    response,
)

__getattr__ = make_getattr(
    "Authentication",
    {
        "login": Endpoint(
            summary="Request a magic-link login",
            description=(
                "Send a passwordless magic-link to the given email. Set "
                "`client_type` to `sdk` for SDK/CLI logins. Complete login by "
                "POSTing the returned token to `/auth/validate`."
            ),
            body=json_body(
                {
                    "email": {"type": "string", "format": "email"},
                    "client_type": {
                        "type": "string",
                        "description": "Set to `sdk` for SDK logins; otherwise omit.",
                    },
                },
                required=["email"],
                example={"email": "researcher@upenn.edu"},
            ),
            responses=[response("200", "Magic link sent.")],
        ),
        "logout": Endpoint(
            summary="Log out the current user",
            description="Clear the `jwt` session cookie for the current user.",
            responses=[response("200", "Logged out.")],
        ),
        "validate": Endpoint(
            summary="Validate a magic-link token",
            description=(
                "Exchange the emailed magic-link token for a session. On success "
                "the server sets the HTTP-only `jwt` cookie used for `cookieAuth`."
            ),
            body=json_body(
                {
                    "email": {"type": "string", "format": "email"},
                    "magic_link": {
                        "type": "string",
                        "description": "The token from the magic-link email.",
                    },
                },
                required=["email", "magic_link"],
            ),
            responses=[
                response("200", "Session established; `jwt` cookie set."),
                response("401", "Invalid or expired token."),
            ],
        ),
        "check_token": Endpoint(
            summary="Check JWT validity",
            description="Return whether the caller's `jwt` cookie is currently valid.",
            responses=[
                response("200", "Token is valid."),
                response("401", "Token is missing, invalid, or expired."),
            ],
        ),
    },
    secured=False,
    secured_by_name={"check_token": True},
)
