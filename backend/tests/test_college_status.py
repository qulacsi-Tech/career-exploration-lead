"""A college added in the admin is a draft: not public until published, hidden when archived,
and only an archived one can be deleted for good. Checked through the real API."""

import uuid

from sqlalchemy import delete

from core.database import AsyncSessionLocal
from models.college import College

API = "/api/v1"


def _body(slug: str, **extra) -> dict:
    return {
        "name": f"Status Check College {slug[-6:]}", "slug": slug, "city": "Pune", "state": "Maharashtra",
        "ownership": "Private", "stream": "Management", "established": 1999, **extra,
    }


async def test_draft_publish_archive_delete(client, world):
    slug = f"status-check-{uuid.uuid4().hex[:6]}"
    h = world.admin.h
    try:
        r = await client.post(f"{API}/admin/colleges", json=_body(slug), headers=h)
        assert r.status_code == 201, r.text

        # a draft is in the admin list, with its status, and nowhere public
        r = await client.get(f"{API}/admin/colleges?q={slug[-6:]}&limit=50", headers=h)
        assert [c["status"] for c in r.json()["data"] if c["slug"] == slug] == ["draft"]
        assert (await client.get(f"{API}/colleges/{slug}")).status_code == 404
        # The sitemap lists colleges by their address, "<public id>-<slug>".
        assert not [k for k in (await client.get(f"{API}/sitemap/colleges")).json()["data"] if k.endswith(f"-{slug}")]
        assert slug not in {c["slug"] for c in (await client.get(f"{API}/colleges?limit=50")).json()["data"]}

        r = await client.patch(f"{API}/admin/colleges/{slug}/status", json={"status": "published"}, headers=h)
        assert r.status_code == 200
        r = await client.get(f"{API}/colleges/{slug}")
        assert r.status_code == 200
        assert f"{r.json()['data']['publicId']}-{slug}" in (await client.get(f"{API}/sitemap/colleges")).json()["data"]

        # a published college cannot be deleted in one click
        r = await client.delete(f"{API}/admin/colleges/{slug}", headers=h)
        assert r.status_code == 409

        await client.patch(f"{API}/admin/colleges/{slug}/status", json={"status": "archived"}, headers=h)
        assert (await client.get(f"{API}/colleges/{slug}")).status_code == 404

        r = await client.delete(f"{API}/admin/colleges/{slug}", headers=h)
        assert r.status_code == 200
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(College).where(College.slug == slug))
            await db.commit()


async def test_add_college_refuses_bad_input_and_a_duplicate(client, world):
    slug = f"status-dup-{uuid.uuid4().hex[:6]}"
    other = f"status-dup2-{uuid.uuid4().hex[:6]}"
    elsewhere = f"status-dup3-{uuid.uuid4().hex[:6]}"
    h = world.admin.h
    try:
        for bad in ({"name": "<script>alert(1)</script>"}, {"established": 2999}, {"established": 1000}, {"feesRange": "₹20L - 5L"}):
            r = await client.post(f"{API}/admin/colleges", json=_body(slug, **bad), headers=h)
            assert r.status_code in (400, 422), (bad, r.status_code, r.text)

        r = await client.post(f"{API}/admin/colleges", json=_body(slug), headers=h)
        assert r.status_code == 201
        name = _body(slug)["name"]

        # Same name in the same city, whatever the case or spacing: refused, even when asked to go ahead.
        twin = _body(other, name="  " + name.upper().replace(" ", "   ") + " ", city=" pune ")
        r = await client.post(f"{API}/admin/colleges", json=twin, headers=h)
        assert r.status_code == 409 and r.json()["error"]["code"] == "COLLEGE_NAME_TAKEN", r.text
        r = await client.post(f"{API}/admin/colleges", json={**twin, "confirmDuplicate": True}, headers=h)
        assert r.status_code == 409

        # The same name in another city is another campus: allowed.
        r = await client.post(f"{API}/admin/colleges", json=_body(elsewhere, name=name, city="Mumbai"), headers=h)
        assert r.status_code == 201, r.text

        # Moving it into the first one's city, or renaming another college to that name there, is refused.
        r = await client.patch(f"{API}/admin/colleges/{elsewhere}", json={"city": "Pune"}, headers=h)
        assert r.status_code == 409 and r.json()["error"]["code"] == "COLLEGE_NAME_TAKEN"
        # Saving it with its own name unchanged is fine.
        r = await client.patch(f"{API}/admin/colleges/{slug}", json={"name": name}, headers=h)
        assert r.status_code == 200
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(College).where(College.slug.in_([slug, other, elsewhere])))
            await db.commit()
