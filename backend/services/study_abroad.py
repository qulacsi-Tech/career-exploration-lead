from sqlalchemy.ext.asyncio import AsyncSession

from repositories.study_abroad import StudyAbroadRepository


class StudyAbroadService:
    def __init__(self, db: AsyncSession):
        self.repo = StudyAbroadRepository(db)

    async def get_content(self) -> dict:
        """The whole study-abroad page, in the shape the page renders."""
        reviewed = await self.repo.get_meta("figures_reviewed")
        destinations = await self.repo.list_kind("destination")
        steps = await self.repo.list_kind("step")
        tests = await self.repo.list_kind("test")
        faqs = await self.repo.list_kind("faq")
        return {
            "figuresReviewed": reviewed.data["value"] if reviewed else None,
            "destinations": [row.data for row in destinations],
            "applicationSteps": [row.data for row in steps],
            "admissionTests": [row.data for row in tests],
            "faqs": [row.data for row in faqs],
        }
