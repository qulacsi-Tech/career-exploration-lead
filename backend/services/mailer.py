"""Sends email, when the server is set up to.

Set SMTP_HOST (and SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) in the environment and messages go out
through that server. While SMTP_HOST is empty nothing is sent: the message is written to the server log instead,
clearly marked, so a developer can still read a password reset code. Sending never raises: a failed email must
not turn a request into an error page.
"""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from core.config import settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
        if settings.SMTP_STARTTLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)


async def send_email(to: str, subject: str, body: str) -> bool:
    """Sends the message. True when it went out, False when email is not set up or the send failed."""
    if not settings.SMTP_HOST:
        logger.warning("[email is not set up, so this was not sent] To: %s | Subject: %s\n%s", to, subject, body)
        return False
    try:
        await asyncio.to_thread(_send, to, subject, body)
        return True
    except Exception:  # noqa: BLE001
        logger.exception("could not send an email to %s", to)
        return False
