from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.program import Program


class ProgramRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recommended(self, limit: int = 3) -> List[Program]:
        stmt = (
            select(Program)
            .where(Program.is_recommended == True)  # noqa: E712
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars())
