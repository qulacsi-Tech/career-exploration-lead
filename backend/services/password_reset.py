"""Forgot password: a six-digit code by email, then a new password.

Asking for a code never says whether an account exists (the answer is the same either way), is limited to a few a
hour per account, and the code works for ten minutes, for five tries, and once.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import AppException, ValidationError
from core.security import hash_password
from models.password_reset import PasswordReset
from models.user import User
from repositories.user import UserRepository
from services.mailer import send_email

CODE_LIFETIME = timedelta(minutes=10)
MAX_TRIES = 5
MAX_CODES_PER_HOUR = 5
BAD_CODE = "That code is not right, or it has expired. Ask for a new one."


def _hash(user: User, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{user.id}:{code}".encode(), hashlib.sha256).hexdigest()


async def request_code(db: AsyncSession, identifier: str) -> Optional[str]:
    """Sends a code to the account's email. Returns the code only for local testing (RESET_CODE_IN_RESPONSE), else None."""
    user, _ambiguous = await UserRepository(db).find_by_identifier(identifier)
    if user is None or not user.is_active:
        return None  # the same answer as for a real account, so this cannot be used to find who has one

    hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = (await db.execute(select(func.count()).select_from(PasswordReset).where(PasswordReset.user_id == user.id, PasswordReset.created_at >= hour_ago))).scalar_one()
    if recent >= MAX_CODES_PER_HOUR:
        raise AppException(429, "TOO_MANY_RESETS", "Too many codes asked for. Try again in an hour.")

    code = f"{secrets.randbelow(10**6):06d}"
    db.add(PasswordReset(user_id=user.id, code_hash=_hash(user, code), expires_at=datetime.now(timezone.utc) + CODE_LIFETIME))
    await db.commit()

    await send_email(
        user.email,
        "Your TopCollegePath password reset code",
        f"Hello {user.name.split(' ')[0]},\n\nYour code to reset your password is {code}.\nIt works for 10 minutes. "
        "If you did not ask for it, you can ignore this message: your password has not changed.\n\nTopCollegePath",
    )
    return code if settings.RESET_CODE_IN_RESPONSE else None


async def reset_password(db: AsyncSession, identifier: str, code: str, new_password: str) -> None:
    user, _ambiguous = await UserRepository(db).find_by_identifier(identifier)
    if user is None or not user.is_active:
        raise ValidationError(BAD_CODE)

    now = datetime.now(timezone.utc)
    reset = (
        await db.execute(
            select(PasswordReset)
            .where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None), PasswordReset.expires_at > now)
            .order_by(PasswordReset.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if reset is None:
        raise ValidationError(BAD_CODE)
    if reset.attempts >= MAX_TRIES:
        raise ValidationError("Too many wrong codes. Ask for a new one.")

    if not hmac.compare_digest(reset.code_hash, _hash(user, code)):
        reset.attempts += 1
        await db.commit()
        raise ValidationError(BAD_CODE)

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.failed_logins = 0
    user.locked_until = None
    # This code, and any other still open, is now used up.
    await db.execute(update(PasswordReset).where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None)).values(used_at=now))
    await db.commit()
