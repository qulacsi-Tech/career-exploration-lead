"""Duplicate names for exams and news, the exam listing priority, and page numbers to slugs.

What they protect: an exam or news item cannot be added, or renamed, to a name another one already has (case and
spacing aside); the admin can set and clear an exam's place on the listing; and /public-ids turns the number in a
page address (/exams/12-cat) into the slug the page is read by.
"""

import uuid

from sqlalchemy import delete

from core.database import AsyncSessionLocal
from models.article import Article
from models.exam import Exam

API = "/api/v1"


def _exam(slug: str, name: str) -> dict:
    return {"slug": slug, "name": name, "conductingBody": "Test Board", "level": "National", "description": "A test exam."}


def _article(slug: str, title: str) -> dict:
    return {"slug": slug, "title": title, "excerpt": "A test story.", "publishedAt": "2026-11-01", "isPublished": True}


async def test_exam_names_are_unique_and_priority_is_set(client, world):
    tag = uuid.uuid4().hex[:6]
    first, second = f"dup-exam-{tag}", f"dup-exam2-{tag}"
    name = f"Duplicate Check Exam {tag}"
    h = world.admin.h
    try:
        assert (await client.post(f"{API}/admin/exams", json=_exam(first, name), headers=h)).status_code == 201

        # The same name, in another case and with stray spaces: refused.
        r = await client.post(f"{API}/admin/exams", json=_exam(second, f"  {name.lower()}  "), headers=h)
        assert r.status_code == 409 and r.json()["error"]["code"] == "EXAM_NAME_TAKEN", r.text
        assert (await client.post(f"{API}/admin/exams", json=_exam(second, f"{name} Two"), headers=h)).status_code == 201

        # Renaming the second to the first's name is refused; saving the first with its own name is not.
        r = await client.patch(f"{API}/admin/exams/{second}", json={"name": name.upper()}, headers=h)
        assert r.status_code == 409 and r.json()["error"]["code"] == "EXAM_NAME_TAKEN"
        assert (await client.patch(f"{API}/admin/exams/{first}", json={"name": name}, headers=h)).status_code == 200

        # Listing priority: set, read back on the public exam, and cleared with 0.
        assert (await client.patch(f"{API}/admin/exams/{second}", json={"listingPriority": 2}, headers=h)).status_code == 200
        exam = (await client.get(f"{API}/exams/{second}")).json()["data"]
        assert exam["listingPriority"] == 2
        assert (await client.patch(f"{API}/admin/exams/{second}", json={"listingPriority": 0}, headers=h)).status_code == 200
        assert (await client.get(f"{API}/exams/{second}")).json()["data"]["listingPriority"] is None
        assert (await client.patch(f"{API}/admin/exams/{second}", json={"listingPriority": 1000}, headers=h)).status_code == 422

        # The priority dialog sets several at once; None takes one off; an unknown exam or a bad number is refused.
        r = await client.put(f"{API}/admin/exam-priorities", json={"priorities": {first: 3, second: 1}}, headers=h)
        assert r.status_code == 200, r.text
        assert (await client.get(f"{API}/exams/{first}")).json()["data"]["listingPriority"] == 3
        assert (await client.get(f"{API}/exams/{second}")).json()["data"]["listingPriority"] == 1
        assert (await client.put(f"{API}/admin/exam-priorities", json={"priorities": {first: None}}, headers=h)).status_code == 200
        assert (await client.get(f"{API}/exams/{first}")).json()["data"]["listingPriority"] is None
        assert (await client.get(f"{API}/exams/{second}")).json()["data"]["listingPriority"] == 1
        assert (await client.put(f"{API}/admin/exam-priorities", json={"priorities": {"no-such-exam-x": 1}}, headers=h)).status_code == 400
        assert (await client.put(f"{API}/admin/exam-priorities", json={"priorities": {first: 0}}, headers=h)).status_code == 422
        assert (await client.put(f"{API}/admin/exam-priorities", json={"priorities": {first: 1}}, headers=world.student.h)).status_code == 403

        # The number in the exam's address leads back to its slug.
        r = await client.get(f"{API}/public-ids/exam/{exam['publicId']}")
        assert r.status_code == 200 and r.json()["data"]["slug"] == second
        assert (await client.get(f"{API}/public-ids/exam/999999999")).status_code == 404
        assert (await client.get(f"{API}/public-ids/nonsense/1")).status_code == 422
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(Exam).where(Exam.slug.in_([first, second])))
            await db.commit()


async def test_news_titles_are_unique(client, world):
    tag = uuid.uuid4().hex[:6]
    first, second = f"dup-news-{tag}", f"dup-news2-{tag}"
    title = f"Duplicate Check Story {tag}"
    h = world.admin.h
    try:
        assert (await client.post(f"{API}/admin/articles", json=_article(first, title), headers=h)).status_code == 201
        r = await client.post(f"{API}/admin/articles", json=_article(second, title.replace(" ", "  ").upper()), headers=h)
        assert r.status_code == 409 and r.json()["error"]["code"] == "ARTICLE_TITLE_TAKEN", r.text
        assert (await client.post(f"{API}/admin/articles", json=_article(second, f"{title} again"), headers=h)).status_code == 201
        r = await client.patch(f"{API}/admin/articles/{second}", json={"title": title}, headers=h)
        assert r.status_code == 409 and r.json()["error"]["code"] == "ARTICLE_TITLE_TAKEN"
        assert (await client.patch(f"{API}/admin/articles/{first}", json={"title": title}, headers=h)).status_code == 200
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(Article).where(Article.slug.in_([first, second])))
            await db.commit()
