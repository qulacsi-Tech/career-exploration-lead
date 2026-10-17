"""Live updates to open browser tabs.

Each backend worker keeps the WebSockets that connected to it, grouped by person. It also holds one
database connection that LISTENs on the `tcp_events` channel (see services/notify.py). A NOTIFY
issued by any worker reaches every worker, and each forwards it to its own sockets for that person.
So the two production workers behave as one, with no Redis or other service.

What goes over a socket is only a nudge ({"event": "notification.created", "id": ...}). The page
reads the real data from the API, which is the source of truth.
"""

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

import asyncpg
from fastapi import WebSocket

from core.config import settings
from services.notify import CHANNEL

logger = logging.getLogger(__name__)

MAX_SOCKETS_PER_USER = 5


class Hub:
    def __init__(self) -> None:
        self._sockets: dict[str, set[WebSocket]] = defaultdict(set)

    def add(self, user_id: str, socket: WebSocket) -> bool:
        """False when this person already has too many tabs connected."""
        if len(self._sockets[user_id]) >= MAX_SOCKETS_PER_USER:
            return False
        self._sockets[user_id].add(socket)
        return True

    def remove(self, user_id: str, socket: WebSocket) -> None:
        self._sockets[user_id].discard(socket)
        if not self._sockets[user_id]:
            self._sockets.pop(user_id, None)

    async def send(self, user_id: str, message: dict[str, Any]) -> None:
        for socket in list(self._sockets.get(user_id, ())):
            try:
                await socket.send_json(message)
            except Exception:  # noqa: BLE001 - a dead socket is cleaned up by its own receive loop
                self.remove(user_id, socket)

    async def send_all(self, message: dict[str, Any]) -> None:
        for user_id in list(self._sockets):
            await self.send(user_id, message)


hub = Hub()


def _dsn() -> str:
    # SQLAlchemy's "postgresql+asyncpg://" is not a form asyncpg itself understands.
    return settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)


async def listen_forever() -> None:
    """Holds the LISTEN connection for the life of the worker, reconnecting if it drops."""
    delay = 1.0
    while True:
        connection = None
        try:
            connection = await asyncpg.connect(_dsn())

            def on_event(_conn, _pid, _channel, payload: str) -> None:
                try:
                    data = json.loads(payload)
                    user = data.pop("user")
                except (ValueError, KeyError):
                    return
                asyncio.get_running_loop().create_task(hub.send(user, data))

            await connection.add_listener(CHANNEL, on_event)
            # Anything announced while the connection was down was missed, so tell every open tab to re-read.
            await hub.send_all({"event": "resync"})
            delay = 1.0
            while not connection.is_closed():
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("realtime listener lost its connection; retrying in %.0fs", delay)
        finally:
            if connection is not None and not connection.is_closed():
                await connection.close()
        await asyncio.sleep(delay)
        delay = min(delay * 2, 30.0)
