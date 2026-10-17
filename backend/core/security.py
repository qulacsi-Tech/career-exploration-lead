from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from core.config import settings


def hash_password(plain: str) -> str:
    """Return bcrypt hash of plain-text password."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored bcrypt hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    """Return a signed JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {"sub": subject, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    # A WebSocket ticket is signed with the same key; it must never pass as a login token.
    if payload.get("typ") == "ws":
        raise jwt.InvalidTokenError("not an access token")
    return payload


# ── WebSocket tickets ─────────────────────────────────────────────────────────
# A browser cannot send its httpOnly cookie token to JavaScript, and a token in a WebSocket address
# would end up in logs. So the site's server asks for a ticket on the person's behalf: valid for a
# minute, usable once, and good for nothing except opening one socket.

WS_TICKET_SECONDS = 60
_used_tickets: dict[str, float] = {}


def create_ws_ticket(user_id: str) -> str:
    import uuid
    from datetime import datetime, timedelta, timezone

    expire = datetime.now(timezone.utc) + timedelta(seconds=WS_TICKET_SECONDS)
    payload = {"sub": user_id, "typ": "ws", "jti": uuid.uuid4().hex, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def redeem_ws_ticket(ticket: str) -> str:
    """Returns the user id the ticket was issued for. Raises jwt.PyJWTError if it is bad, expired or already used."""
    import time

    payload = jwt.decode(ticket, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("typ") != "ws":
        raise jwt.InvalidTokenError("not a socket ticket")
    jti = payload["jti"]
    now = time.monotonic()
    for old in [k for k, v in _used_tickets.items() if v < now]:
        _used_tickets.pop(old, None)
    if jti in _used_tickets:
        raise jwt.InvalidTokenError("ticket already used")
    _used_tickets[jti] = now + WS_TICKET_SECONDS + 5
    return payload["sub"]
