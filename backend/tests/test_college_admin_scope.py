"""
The college admin's walls. Each of these is a way someone could see or change something that is not
theirs, so each is checked through the real API with a real token.
"""

import uuid

from sqlalchemy import delete

from core.database import AsyncSessionLocal
from models.lead import Lead, LeadType
from tests.conftest import set_user

API = "/api/v1"


def _ids(response) -> set[str]:
    return {lead["id"] for lead in response.json()["data"]}


async def test_college_admin_sees_only_their_own_consented_leads(client, world):
    r = await client.get(f"{API}/college/leads", headers=world.admin_a.h)
    assert r.status_code == 200
    ids = _ids(r)
    assert str(world.lead_a) in ids
    assert str(world.lead_b) not in ids, "another college's lead must not appear"
    assert str(world.lead_a_private) not in ids, "a lead whose sender did not agree to be shared must not appear"

    lead = next(l for l in r.json()["data"] if l["id"] == str(world.lead_a))
    assert lead["visitorId"] is None, "browsing history stays with the platform team"
    assert lead["userId"] == "linked", "the student's account id is not shared"


async def test_college_admin_cannot_change_or_reply_to_another_colleges_lead(client, world):
    r = await client.patch(f"{API}/college/leads/{world.lead_b}", json={"status": "closed"}, headers=world.admin_a.h)
    assert r.status_code == 404
    r = await client.post(f"{API}/college/leads/{world.lead_b}/replies", json={"body": "hello there"}, headers=world.admin_a.h)
    assert r.status_code == 404
    # and a lead of their own college that was not shared with it is just as invisible
    r = await client.patch(f"{API}/college/leads/{world.lead_a_private}", json={"status": "closed"}, headers=world.admin_a.h)
    assert r.status_code == 404


async def test_college_admin_is_refused_by_platform_endpoints(client, world):
    for method, path in (
        ("GET", "/admin/leads"),
        ("GET", "/admin/users"),
        ("GET", "/admin/analytics"),
        ("GET", f"/admin/colleges/{world.college_b.slug}/record"),
        ("GET", "/admin/change-requests"),
        ("GET", "/admin/leads/export.csv"),
    ):
        r = await client.request(method, f"{API}{path}", headers=world.admin_a.h)
        assert r.status_code == 403, f"{method} {path} let a college admin in ({r.status_code})"


async def test_platform_admin_is_refused_by_college_endpoints(client, world):
    r = await client.get(f"{API}/college/leads", headers=world.admin.h)
    assert r.status_code == 403


async def test_requests_without_a_token_are_refused(client, world):
    for path in ("/college/leads", "/college/record", "/college/threads", "/admin/users"):
        r = await client.get(f"{API}{path}")
        assert r.status_code == 401, path


async def test_a_disabled_college_admin_is_refused_at_once(client, world):
    await set_user(world.admin_a.id, is_active=False)
    try:
        r = await client.get(f"{API}/college/leads", headers=world.admin_a.h)
        assert r.status_code == 401
    finally:
        await set_user(world.admin_a.id, is_active=True)


async def test_a_temporary_password_blocks_everything_until_replaced(client, world):
    await set_user(world.admin_a.id, must_change_password=True)
    try:
        r = await client.get(f"{API}/college/leads", headers=world.admin_a.h)
        assert r.status_code == 403
        assert r.json()["error"]["code"] == "PASSWORD_CHANGE_REQUIRED"
        # the password change itself must still work, or they could never get out
        r = await client.get(f"{API}/me", headers=world.admin_a.h)
        assert r.status_code == 200 and r.json()["data"]["mustChangePassword"] is True
    finally:
        await set_user(world.admin_a.id, must_change_password=False)


async def test_college_admin_csv_has_only_their_leads_and_neutralises_formulas(client, world):
    async with AsyncSessionLocal() as db:
        evil = Lead(
            id=uuid.uuid4(), name="=1+1", phone="9876543210", email=world.student.email.replace("student", "evil"),
            college_slug=world.college_a.slug, type=LeadType.ENQUIRY, consent=True,
        )
        db.add(evil)
        await db.commit()
    try:
        r = await client.get(f"{API}/college/leads/export.csv", headers=world.admin_a.h)
        assert r.status_code == 200
        text = r.content.decode("utf-8")
        assert text.startswith("﻿"), "the byte order mark is what makes Excel read it as UTF-8"
        assert "'=1+1" in text, "a name that starts with = must not be left as a formula"
        assert str(world.lead_b)[:8].upper() not in text
        assert "Came from" not in text.splitlines()[0], "how they found the site is not for the college"
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(Lead).where(Lead.id == evil.id))
            await db.commit()


async def test_a_change_request_does_not_touch_the_live_college_until_approved(client, world):
    slug = world.college_a.slug
    live = (await client.get(f"{API}/admin/colleges/{slug}/record", headers=world.admin.h)).json()["data"]
    original = {k: v for k, v in live.items() if k not in ("slug", "updatedAt")}

    mine = (await client.get(f"{API}/college/record", headers=world.admin_a.h)).json()["data"]
    proposal = {k: v for k, v in mine.items() if k not in ("slug", "updatedAt")}
    new_about = f"Proposed by test {uuid.uuid4().hex[:6]}"
    proposal["about"] = new_about

    try:
        r = await client.post(f"{API}/college/change-requests", json={"kind": "edit", "record": proposal}, headers=world.admin_a.h)
        assert r.status_code == 201, r.text
        request_id = r.json()["data"]["id"]

        # not live yet
        now = (await client.get(f"{API}/admin/colleges/{slug}/record", headers=world.admin.h)).json()["data"]
        assert now["about"] == original["about"]

        # one at a time
        again = await client.post(f"{API}/college/change-requests", json={"kind": "edit", "record": proposal}, headers=world.admin_a.h)
        assert again.status_code == 409

        # the team sees exactly what changed
        detail = (await client.get(f"{API}/admin/change-requests/{request_id}", headers=world.admin.h)).json()["data"]
        assert [c["path"] for c in detail["diff"]] == ["about"]

        # the platform team is told, and must acknowledge
        notes = (await client.get(f"{API}/notifications", headers=world.admin.h)).json()["data"]
        assert any(n["kind"] == "request.submitted" and n["requiresAck"] for n in notes)

        # approving publishes it, and tells the college admin
        approved = await client.post(f"{API}/admin/change-requests/{request_id}/approve", json={}, headers=world.admin.h)
        assert approved.status_code == 200, approved.text
        now = (await client.get(f"{API}/admin/colleges/{slug}/record", headers=world.admin.h)).json()["data"]
        assert now["about"] == new_about
        notes = (await client.get(f"{API}/notifications", headers=world.admin_a.h)).json()["data"]
        assert any(n["kind"] == "request.approved" for n in notes)

        # the first decision stands
        second = await client.post(f"{API}/admin/change-requests/{request_id}/reject", json={"note": "too late"}, headers=world.super_admin.h)
        assert second.status_code == 409
    finally:
        await client.put(f"{API}/admin/colleges/{slug}/record", json=original, headers=world.admin.h)


async def test_a_request_with_no_changes_is_refused(client, world):
    mine = (await client.get(f"{API}/college/record", headers=world.admin_a.h)).json()["data"]
    proposal = {k: v for k, v in mine.items() if k not in ("slug", "updatedAt")}
    r = await client.post(f"{API}/college/change-requests", json={"kind": "edit", "record": proposal}, headers=world.admin_a.h)
    assert r.status_code in (400, 422)


async def test_college_admin_cannot_read_another_colleges_threads(client, world):
    created = await client.post(
        f"{API}/college/threads", json={"subject": "A question", "body": "Hello team"}, headers=world.admin_b.h
    )
    assert created.status_code == 201, created.text
    thread_id = created.json()["data"]["id"]

    r = await client.get(f"{API}/college/threads/{thread_id}", headers=world.admin_a.h)
    assert r.status_code == 404
    listed = (await client.get(f"{API}/college/threads", headers=world.admin_a.h)).json()["data"]
    assert all(t["id"] != thread_id for t in listed)

    # a platform reply resolves it for the team, and the college admin is told
    reply = await client.post(f"{API}/admin/threads/{thread_id}/messages", json={"body": "Here is the answer"}, headers=world.admin.h)
    assert reply.status_code == 201
    assert reply.json()["data"]["status"] == "resolved"
    notes = (await client.get(f"{API}/notifications", headers=world.admin_b.h)).json()["data"]
    assert any(n["kind"] == "thread.reply" for n in notes)
    # and writing again reopens it
    again = await client.post(f"{API}/college/threads/{thread_id}/messages", json={"body": "One more thing"}, headers=world.admin_b.h)
    assert again.json()["data"]["status"] == "open"


async def test_the_database_allows_one_college_admin_per_college(client, world):
    r = await client.post(
        f"{API}/admin/colleges/{world.college_a.slug}/admin",
        json={"name": "Second Person", "email": f"second-{uuid.uuid4().hex[:6]}@example.com", "password": "Another-pass-1"},
        headers=world.admin.h,
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "COLLEGE_ADMIN_EXISTS"
