"""How a lead is shown in an admin inbox, shared by the platform admin and the college admin endpoints."""

from models.lead import Lead


def _value(enum_or_str) -> str:
    return enum_or_str.value if hasattr(enum_or_str, "value") else str(enum_or_str)


def lead_json(lead: Lead, *, for_college: bool = False) -> dict:
    """
    A lead as the inbox shows it.

    For a college admin, two things are left out: the visitor id (it opens the person's browsing
    history, which stays with the platform team) and the student's account id, replaced by a plain
    marker that says a reply can be shown to them.
    """
    return {
        "id": str(lead.id),
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "collegeSlug": lead.college_slug,
        "type": _value(lead.type),
        "status": _value(lead.status),
        "createdAt": lead.created_at.isoformat() if lead.created_at else None,
        "userId": ("linked" if for_college else str(lead.user_id)) if lead.user_id else None,
        "visitorId": None if for_college else (str(lead.visitor_id) if lead.visitor_id else None),
        "stream": lead.stream,
        "city": lead.city,
        "message": lead.message,
        "programName": lead.program_name,
        "source": lead.source,
        "sourceUrl": lead.source_url,
        "consent": bool(lead.consent),
        "repeatCount": lead.repeat_count or 0,
        "replies": [
            {
                "id": str(r.id),
                "authorName": r.author_name,
                "body": r.body,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r in lead.replies
        ],
    }
