"""Exam communities, through the real app against the real database.

What they protect: one community per exam; only members post; a visitor who is not signed in reads only the first
few posts; hidden content and restricted communities leave the site; a blocked student can still read but cannot
take part; only the platform team moderates.
"""

import uuid

import pytest_asyncio
from sqlalchemy import delete, select

from core.database import AsyncSessionLocal
from core.security import hash_password
from models.community import Community, CommunityUserStatus
from models.exam import Exam
from models.user import User, UserRole
from routers.community import GUEST_POSTS
from tests.conftest import PASSWORD, _person, bearer

V1 = "/api/v1"


@pytest_asyncio.fixture(scope="module")
async def cast():
    """Two students and a platform admin, and an exam that has no community yet. All removed afterwards."""
    tag = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db:
        taken = select(Community.exam_id)
        exam = (await db.execute(select(Exam).where(Exam.archived.is_(False), Exam.id.not_in(taken)).limit(1))).scalar_one()

        def make(role: UserRole, label: str) -> User:
            return User(
                id=uuid.uuid4(), name=f"Test {label.title()} Person", email=f"test-comm-{label}-{tag}@example.com",
                password_hash=hash_password(PASSWORD), role=role, auth_provider="password", is_verified=True, is_active=True,
            )

        first, second, admin = make(UserRole.USER, "first"), make(UserRole.USER, "second"), make(UserRole.ADMIN, "admin")
        db.add_all([first, second, admin])
        await db.commit()
        people = {"exam": exam.slug, "exam_id": exam.id, "first": _person(first), "second": _person(second), "admin": _person(admin)}

    yield people

    async with AsyncSessionLocal() as db:
        await db.execute(delete(Community).where(Community.exam_id == people["exam_id"]))
        ids = [people[k].id for k in ("first", "second", "admin")]
        await db.execute(delete(CommunityUserStatus).where(CommunityUserStatus.user_id.in_(ids)))
        await db.execute(delete(User).where(User.id.in_(ids)))
        await db.commit()


async def test_community_lifecycle(client, cast):
    exam = cast["exam"]
    first, second, admin = cast["first"], cast["second"], cast["admin"]

    # Nobody has started it yet.
    r = await client.get(f"{V1}/exams/{exam}/community")
    assert r.status_code == 200 and r.json()["data"]["community"] is None

    # Starting one needs an account; an admin account cannot.
    assert (await client.post(f"{V1}/exams/{exam}/community", json={})).status_code == 401
    assert (await client.post(f"{V1}/exams/{exam}/community", json={}, headers=admin.h)).status_code == 403

    # The first student starts it; the second cannot start another.
    r = await client.post(f"{V1}/exams/{exam}/community", json={"description": "Help each other"}, headers=first.h)
    assert r.status_code == 201, r.text
    cid = r.json()["data"]["id"]
    assert (await client.post(f"{V1}/exams/{exam}/community", json={}, headers=second.h)).status_code == 409

    # Only members post. The founder is one already.
    post = {"kind": "discussion", "title": "", "body": "Which mock series is worth it?", "image": ""}
    assert (await client.post(f"{V1}/communities/{cid}/posts", json=post, headers=second.h)).status_code == 403
    assert (await client.post(f"{V1}/communities/{cid}/join", headers=second.h)).status_code == 200
    r = await client.get(f"{V1}/exams/{exam}/community", headers=second.h)
    assert r.json()["data"]["viewer"]["member"] is True and r.json()["data"]["community"]["members"] == 2

    # A banner needs a picture, and only one uploaded here.
    banner = {**post, "kind": "banner"}
    assert (await client.post(f"{V1}/communities/{cid}/posts", json=banner, headers=second.h)).status_code == 400
    assert (await client.post(f"{V1}/communities/{cid}/posts", json={**banner, "image": "https://evil.example/x.png"}, headers=second.h)).status_code == 422

    post_ids = []
    for i in range(GUEST_POSTS + 2):
        who = first if i % 2 else second
        r = await client.post(f"{V1}/communities/{cid}/posts", json={**post, "body": f"Post number {i} here"}, headers=who.h)
        assert r.status_code == 201, r.text
        post_ids.append(r.json()["data"]["id"])
    total = GUEST_POSTS + 2

    # A visitor gets the first few and the lock; asking for more changes nothing.
    r = await client.get(f"{V1}/communities/{cid}/posts?offset=5&limit=30")
    page = r.json()["data"]
    assert len(page["items"]) == GUEST_POSTS and page["locked"] is True and page["hasMore"] is False and page["total"] == total
    # Signed in, everything.
    page = (await client.get(f"{V1}/communities/{cid}/posts?limit=30", headers=second.h)).json()["data"]
    assert len(page["items"]) == total and page["locked"] is False

    # Replies and reactions need an account.
    target = post_ids[-1]
    assert (await client.post(f"{V1}/community/posts/{target}/replies", json={"body": "Same question"})).status_code == 401
    r = await client.post(f"{V1}/community/posts/{target}/replies", json={"body": "Try the official papers"}, headers=first.h)
    assert r.status_code == 201 and r.json()["data"]["author"] == "Test P."
    r = await client.put(f"{V1}/community/posts/{target}/reaction", json={"reaction": "love"}, headers=first.h)
    assert r.json()["data"]["reactions"]["love"] == 1
    r = await client.put(f"{V1}/community/posts/{target}/reaction", json={"reaction": "like"}, headers=first.h)
    assert r.json()["data"]["reactions"] == {"like": 1, "love": 0, "celebrate": 0, "insightful": 0}
    r = await client.put(f"{V1}/community/posts/{target}/reaction", json={"reaction": None}, headers=first.h)
    assert r.json()["data"]["reactions"]["like"] == 0

    # Students cannot moderate.
    assert (await client.get(f"{V1}/admin/community/posts", headers=first.h)).status_code == 403
    # Nor delete someone else's post.
    assert (await client.delete(f"{V1}/community/posts/{post_ids[0]}", headers=first.h)).status_code == 404

    # The team hides a post: gone from the site, still in the admin.
    r = await client.put(f"{V1}/admin/community/posts/{target}/hidden", json={"hidden": True, "reason": "Off topic"}, headers=admin.h)
    assert r.status_code == 200
    page = (await client.get(f"{V1}/communities/{cid}/posts?limit=30", headers=second.h)).json()["data"]
    assert page["total"] == total - 1 and target not in [p["id"] for p in page["items"]]
    assert (await client.post(f"{V1}/community/posts/{target}/replies", json={"body": "Hello again"}, headers=first.h)).status_code == 404
    admin_page = (await client.get(f"{V1}/admin/community/posts?community={cid}&status=hidden", headers=admin.h)).json()["data"]
    assert [p["id"] for p in admin_page["items"]] == [target] and admin_page["items"][0]["hiddenReason"] == "Off topic"

    # The team blocks the second student: reading still works, taking part does not.
    r = await client.put(f"{V1}/admin/community/users/{second.id}", json={"blocked": True, "flagged": True, "note": "Spam"}, headers=admin.h)
    assert r.status_code == 200 and r.json()["data"]["blocked"] is True
    assert (await client.get(f"{V1}/communities/{cid}/posts", headers=second.h)).status_code == 200
    assert (await client.get(f"{V1}/exams/{exam}/community", headers=second.h)).json()["data"]["viewer"]["blocked"] is True
    for call in (
        client.post(f"{V1}/communities/{cid}/posts", json=post, headers=second.h),
        client.post(f"{V1}/community/posts/{post_ids[1]}/replies", json={"body": "Blocked reply"}, headers=second.h),
        client.put(f"{V1}/community/posts/{post_ids[1]}/reaction", json={"reaction": "like"}, headers=second.h),
        client.post(f"{V1}/communities/{cid}/join", headers=second.h),
    ):
        assert (await call).status_code == 403
    users = (await client.get(f"{V1}/admin/community/users?status=blocked", headers=admin.h)).json()["data"]["items"]
    assert any(u["id"] == str(second.id) and u["flagged"] and u["note"] == "Spam" for u in users)
    # Lifted: they take part again.
    await client.put(f"{V1}/admin/community/users/{second.id}", json={"blocked": False}, headers=admin.h)
    assert (await client.post(f"{V1}/communities/{cid}/posts", json=post, headers=second.h)).status_code == 201

    # Restricted: hidden from the site, listed in the admin.
    assert (await client.put(f"{V1}/admin/community/communities/{cid}", json={"restricted": True}, headers=admin.h)).status_code == 200
    assert (await client.get(f"{V1}/communities/{cid}/posts")).status_code == 404
    assert (await client.get(f"{V1}/exams/{exam}/community")).json()["data"]["restricted"] is True
    assert cid not in [c["id"] for c in (await client.get(f"{V1}/communities")).json()["data"]]
    overview = (await client.get(f"{V1}/admin/community/overview", headers=admin.h)).json()["data"]
    assert any(c["id"] == cid and c["restricted"] for c in overview["communities"])
