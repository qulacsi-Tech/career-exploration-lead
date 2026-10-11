"""Applies pending database migrations, so the code and the database never drift apart.

Called when the API starts. `uvicorn --reload` starts the API again after every code change,
so a migration you have just added is applied the moment you save it, with no extra command.
The start scripts and the Docker entrypoint still run `alembic upgrade head` first; this is the
same operation, so with nothing pending it does nothing.

Several workers can start at the same moment (the production image runs two). A Postgres advisory
lock makes them take turns: the first applies what is pending, the others find nothing left to do.

Set AUTO_MIGRATE=0 to turn it off, for example where migrations are run by a separate deploy step.
It only applies migration files that exist. Writing a new one after changing a model is still done
by hand (`alembic revision --autogenerate -m "..."`), because a generated migration should be read
before it runs against real data.
"""

import asyncio
import logging
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text

from core.database import engine

logger = logging.getLogger(__name__)

# Any fixed number; every worker has to use the same one.
_LOCK_KEY = 727_274_001
_BACKEND = Path(__file__).resolve().parent.parent


def _upgrade() -> None:
    cfg = Config(str(_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND / "alembic"))
    command.upgrade(cfg, "head")


async def run_migrations() -> None:
    if os.environ.get("AUTO_MIGRATE", "1").lower() in {"0", "false", "no", "off"}:
        logger.info("AUTO_MIGRATE is off: skipping migrations")
        return
    # The lock belongs to this connection, which stays open while Alembic works on its own.
    async with engine.connect() as conn:
        await conn.execute(text("SELECT pg_advisory_lock(:k)"), {"k": _LOCK_KEY})
        try:
            # Alembic's env.py runs its own event loop, so it gets its own thread.
            await asyncio.to_thread(_upgrade)
        finally:
            await conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _LOCK_KEY})
            await conn.commit()
    logger.info("Database is up to date")
