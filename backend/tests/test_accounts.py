"""Who may manage whom, the sign-in lockout, and that a socket ticket is not a login."""

import uuid

from tests.conftest import PASSWORD, set_user

API = "/api/v1"


async def test_an_admin_manages_students_but_not_administrators(client, world):
    r = await client.patch(f"{API}/admin/users/{world.super_admin.id}", json={"isActive": False}, headers=world.admin.h)
    assert r.status_code == 403, "an admin must not be able to switch off a super admin"

    r = await client.patch(f"{API}/admin/users/{world.student.id}", json={"isActive": False}, headers=world.admin.h)
    assert r.status_code == 200
    r = await client.patch(f"{API}/admin/users/{world.student.id}", json={"isActive": True}, headers=world.admin.h)
    assert r.status_code == 200


async def test_nobody_can_disable_their_own_account(client, world):
    r = await client.patch(f"{API}/admin/users/{world.super_admin.id}", json={"isActive": False}, headers=world.super_admin.h)
    assert r.status_code == 403


async def test_only_a_super_admin_creates_administrators(client, world):
    body = {"name": "New Admin", "email": f"test-new-{uuid.uuid4().hex[:8]}@example.com", "password": "Strong-pass-1", "role": "ADMIN"}
    r = await client.post(f"{API}/admin/users", json=body, headers=world.admin.h)
    assert r.status_code == 403

    r = await client.post(f"{API}/admin/users", json=body, headers=world.super_admin.h)
    assert r.status_code == 201
    # clean up: this email does not carry the fixture's tag
    from core.database import AsyncSessionLocal
    from models.user import User
    from sqlalchemy import delete

    async with AsyncSessionLocal() as db:
        await db.execute(delete(User).where(User.email == body["email"]))
        await db.commit()


async def test_an_admin_resets_a_students_password_and_the_student_must_change_it(client, world):
    r = await client.post(f"{API}/admin/users/{world.student.id}/reset-password", json={"password": "Temporary-1"}, headers=world.admin.h)
    assert r.status_code == 200

    login = await client.post(f"{API}/auth/login", json={"email": world.student.email, "password": "Temporary-1"})
    assert login.status_code == 200
    assert login.json()["data"]["mustChangePassword"] is True

    # an admin cannot reset a super admin's password
    r = await client.post(f"{API}/admin/users/{world.super_admin.id}/reset-password", json={"password": "Temporary-1"}, headers=world.admin.h)
    assert r.status_code == 403
    await set_user(world.student.id, must_change_password=False)


async def test_five_wrong_passwords_pause_the_account(client, world):
    email = world.admin_b.email
    try:
        for _ in range(5):
            r = await client.post(f"{API}/auth/login", json={"email": email, "password": "wrong-password-1"})
            assert r.status_code == 401

        # even the right password is refused while it waits
        r = await client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
        assert r.status_code == 429
        assert r.json()["error"]["code"] == "TOO_MANY_ATTEMPTS"
    finally:
        await set_user(world.admin_b.id, failed_logins=0, locked_until=None)

    r = await client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200


async def test_a_socket_ticket_cannot_be_used_as_a_login(client, world):
    r = await client.post(f"{API}/ws/ticket", headers=world.student.h)
    assert r.status_code == 200
    ticket = r.json()["data"]["ticket"]

    r = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {ticket}"})
    assert r.status_code == 401


async def test_notifications_are_only_ever_your_own(client, world):
    r = await client.get(f"{API}/notifications", headers=world.student.h)
    assert r.status_code == 200
    # someone else's notification id is simply not found
    other = (await client.get(f"{API}/notifications", headers=world.admin.h)).json()["data"]
    for n in other[:3]:
        r = await client.post(f"{API}/notifications/{n['id']}/acknowledge", headers=world.student.h)
        assert r.status_code == 404
