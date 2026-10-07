"""Admin practice tests: write the tests candidates sit, with their questions. ADMIN role required.

A test is edited as one plain-text document: its settings, its sections and, in each
section, its questions (the question, the options, the correct answer, the solution).
Saving converts that to the records the player and the scorer read (see services/practice.py):
text becomes rich-text documents, options get letter ids, and a passage shared by several
questions becomes one stimulus.

Every question of a test is rewritten on save under ids of the form `<test-slug>-q<n>`, so
a test owns its questions. Questions the seed data shares between tests are only removed
when no other test still uses them.

Correct answers and solutions are never sent to candidates; this API is the only place
they are read back out.
"""

import re
import uuid
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, ValidationError as PydanticValidationError
from sqlalchemy import delete, func, select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import NotFoundError, ValidationError
from models.exam import Exam
from models.practice import PracticeItem
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/practice", tags=["admin"])

MAX_SECTIONS = 10
MAX_QUESTIONS = 200
MAX_OPTIONS = 6
LETTERS = "abcdef"


# ── Text <-> rich-text documents ────────────────────────────────────────────
#
# A figure (an image, a GIF, a diagram) is one line of the text:
#
#     ![what the figure shows](/api/uploads/practice-ab12.png "640x380")
#
# The words in brackets are its description for screen readers and are required. The
# optional "WIDTHxHEIGHT" lets the page reserve room before the file loads. A figure is
# its own block, between paragraphs, as it is in the seed data.

_FIGURE = re.compile(r'^!\[(?P<alt>[^\]]*)\]\((?P<src>\S+?)(?:\s+"(?P<w>\d+)x(?P<h>\d+)")?\)$')
_OWN_SRC = ("/api/uploads/", "/images/")


def _figure_node(match: re.Match) -> dict:
    alt = match.group("alt").strip()
    src = match.group("src")
    if not alt:
        raise ValidationError("A figure needs a description (the words in the brackets) for people who cannot see it.")
    if not (src.startswith(_OWN_SRC) or src.startswith("https://")):
        raise ValidationError(f"Figure address '{src[:60]}' is not allowed: use an uploaded file or an https:// link.")
    attrs = {"src": src, "alt": alt}
    if match.group("w"):
        attrs["width"] = int(match.group("w"))
        attrs["height"] = int(match.group("h"))
    return {"type": "image", "attrs": attrs}


def doc_from_text(text: str) -> dict:
    """Text to a document: a blank line starts a paragraph, a new line is a line break,
    and a figure line becomes a figure block."""
    content: list[dict] = []
    lines: list[str] = []

    def flush() -> None:
        if not lines:
            return
        nodes: list[dict] = []
        for i, line in enumerate(lines):
            if i:
                nodes.append({"type": "hardBreak"})
            nodes.append({"type": "text", "text": line})
        content.append({"type": "paragraph", "content": nodes})
        lines.clear()

    for raw in text.replace("\r\n", "\n").split("\n"):
        line = raw.strip()
        figure = _FIGURE.match(line)
        if figure:
            flush()
            content.append(_figure_node(figure))
        elif line:
            lines.append(line)
        else:
            flush()
    flush()
    return {"type": "doc", "content": content}


def _node_text(node: dict) -> str:
    if node.get("type") == "text":
        return node.get("text", "")
    if node.get("type") == "hardBreak":
        return "\n"
    return "".join(_node_text(child) for child in node.get("content") or [])


def _block_text(block: dict) -> str:
    if block.get("type") == "image":
        attrs = block.get("attrs") or {}
        alt = (attrs.get("alt") or "Figure").replace("]", ")").replace("[", "(")
        size = f' "{attrs["width"]}x{attrs["height"]}"' if attrs.get("width") and attrs.get("height") else ""
        return f"![{alt}]({attrs.get('src', '')}{size})"
    return _node_text(block).strip()


def text_from_doc(doc: Optional[dict]) -> str:
    """A document back to text. Figures come back as figure lines; other non-text nodes are dropped."""
    if not doc:
        return ""
    blocks = [_block_text(block) for block in doc.get("content") or []]
    return "\n\n".join(b for b in blocks if b)


def _number(value):
    """3.0 is stored as 3, as the seed data does."""
    return int(value) if float(value).is_integer() else float(value)


# ── Request bodies ──────────────────────────────────────────────────────────


class QuestionBody(BaseModel):
    type: Literal["mcq-single", "mcq-multi", "tita"]
    topic: str = Field(default="", max_length=100)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    stem: str = Field(default="", max_length=5000)
    # A passage, caselet or figure description shared with the questions that carry the same text.
    passage: str = Field(default="", max_length=10000)
    options: list[str] = Field(default_factory=list, max_length=MAX_OPTIONS)
    correctOptions: list[int] = Field(default_factory=list, max_length=MAX_OPTIONS)
    answerValue: Optional[float] = None
    tolerance: float = Field(default=0, ge=0, le=1000000)
    marks: float = Field(default=1, ge=0, le=100)
    negativeMarks: float = Field(default=0, ge=0, le=100)
    expectedSeconds: int = Field(default=120, ge=10, le=3600)
    solution: str = Field(default="", max_length=5000)
    model_config = ConfigDict(extra="forbid")


class SectionBody(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    durationMinutes: Optional[int] = Field(default=None, ge=1, le=600)
    questions: list[QuestionBody] = Field(default_factory=list, max_length=MAX_QUESTIONS)
    model_config = ConfigDict(extra="forbid")


class TestBody(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    kind: Literal["full-mock", "sectional", "previous-year", "sample"] = "full-mock"
    summary: str = Field(default="", max_length=400)
    # 0 means untimed.
    totalMinutes: int = Field(default=0, ge=0, le=600)
    sectionLock: bool = False
    languages: list[str] = Field(default_factory=lambda: ["English"], min_length=1, max_length=10)
    # None: unlimited retakes.
    attemptsAllowed: Optional[int] = Field(default=None, ge=1, le=100)
    isFree: bool = False
    isPublished: bool = False
    sections: list[SectionBody] = Field(min_length=1, max_length=MAX_SECTIONS)
    model_config = ConfigDict(extra="forbid")


class NewTestBody(BaseModel):
    examSlug: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=2, max_length=200)
    model_config = ConfigDict(extra="forbid")


def _parse(model, raw: dict):
    try:
        return model.model_validate(raw)
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _check_question(q: QuestionBody, where: str) -> None:
    if not q.stem.strip():
        raise ValidationError(f"{where}: the question text is empty.")
    if q.type == "tita":
        if q.answerValue is None:
            raise ValidationError(f"{where}: a type-in answer needs the correct number.")
        return
    options = [o.strip() for o in q.options]
    if len(options) < 2:
        raise ValidationError(f"{where}: a multiple-choice question needs at least two options.")
    if any(not o for o in options):
        raise ValidationError(f"{where}: an option is empty.")
    if not q.correctOptions:
        raise ValidationError(f"{where}: mark the correct option.")
    if len(set(q.correctOptions)) != len(q.correctOptions) or any(not 0 <= i < len(options) for i in q.correctOptions):
        raise ValidationError(f"{where}: the correct option is not one of the options.")
    if q.type == "mcq-single" and len(q.correctOptions) != 1:
        raise ValidationError(f"{where}: a single-answer question has exactly one correct option.")


# ── Reading ─────────────────────────────────────────────────────────────────


async def _items(db, kind: str) -> dict[str, PracticeItem]:
    rows = (await db.execute(select(PracticeItem).where(PracticeItem.kind == kind))).scalars().all()
    return {r.key: r for r in rows}


def _question_ids(test: dict) -> list[str]:
    return [qid for section in test["sections"] for qid in section["questionIds"]]


def _card(test: dict) -> dict:
    return {
        "slug": test["slug"],
        "examSlug": test["examSlug"],
        "title": test["title"],
        "kind": test["kind"],
        "summary": test.get("summary", ""),
        "totalMinutes": test.get("totalMinutes", 0),
        "isFree": bool(test.get("isFree")),
        "isPublished": bool(test.get("isPublished")),
        "questionCount": len(_question_ids(test)),
        "sectionCount": len(test["sections"]),
    }


@router.get("/tests", response_model=SuccessResponse[dict])
async def list_tests(_admin: AdminPayload, db: DbSession, exam: str):
    """Every test of an exam, published or not."""
    tests = [t.data for t in (await _items(db, "test")).values() if t.data.get("examSlug") == exam]
    tests.sort(key=lambda t: (0 if t.get("isFree") else 1, t["title"]))
    return SuccessResponse[dict](data={"tests": [_card(t) for t in tests]})


@router.get("/tests/{slug}", response_model=SuccessResponse[dict])
async def get_test(slug: str, _admin: AdminPayload, db: DbSession):
    """A test as the editor shows it: plain text, with the correct answers."""
    tests = await _items(db, "test")
    if slug not in tests:
        raise NotFoundError("Practice test")
    test = tests[slug].data
    questions = {k: v.data for k, v in (await _items(db, "question")).items()}
    stimuli = {k: v.data for k, v in (await _items(db, "stimulus")).items()}

    sections = []
    for section in test["sections"]:
        rows = []
        for qid in section["questionIds"]:
            q = questions.get(qid)
            if q is None:
                continue
            correct = q.get("correct") or {}
            option_ids = [o["id"] for o in q.get("options") or []]
            stimulus = stimuli.get(q.get("stimulusId") or "")
            rows.append({
                "type": q["type"],
                "topic": q.get("topic", ""),
                "difficulty": q.get("difficulty", "medium"),
                "stem": text_from_doc(q.get("stem")),
                "passage": text_from_doc(stimulus["body"]) if stimulus else "",
                "options": [text_from_doc(o.get("body")) for o in q.get("options") or []],
                "correctOptions": [option_ids.index(i) for i in correct.get("optionIds", []) if i in option_ids],
                "answerValue": correct.get("value"),
                "tolerance": correct.get("tolerance", 0),
                "marks": q.get("marks", 1),
                "negativeMarks": q.get("negativeMarks", 0),
                "expectedSeconds": q.get("expectedSeconds", 120),
                "solution": text_from_doc(q.get("solution")),
            })
        sections.append({"label": section["label"], "durationMinutes": section.get("durationMinutes"), "questions": rows})

    return SuccessResponse[dict](data={
        "slug": test["slug"],
        "examSlug": test["examSlug"],
        "title": test["title"],
        "kind": test["kind"],
        "summary": test.get("summary", ""),
        "totalMinutes": test.get("totalMinutes", 0),
        "sectionLock": bool(test.get("sectionLock")),
        "languages": test.get("languages") or ["English"],
        "attemptsAllowed": test.get("attemptsAllowed"),
        "isFree": bool(test.get("isFree")),
        "isPublished": bool(test.get("isPublished")),
        "sections": sections,
    })


# ── Writing ─────────────────────────────────────────────────────────────────


async def _next_position(db) -> int:
    return ((await db.execute(select(func.max(PracticeItem.position)))).scalar() or 0) + 1


async def _drop_unshared(db, test: dict, other_tests: list[dict], questions: dict[str, PracticeItem]) -> None:
    """Deletes this test's questions and passages, except any another test still uses."""
    used_questions = {qid for t in other_tests for qid in _question_ids(t)}
    used_stimuli = {
        questions[qid].data.get("stimulusId") for qid in used_questions if qid in questions
    }
    mine = [qid for qid in _question_ids(test) if qid not in used_questions]
    my_stimuli = {questions[qid].data.get("stimulusId") for qid in mine if qid in questions} - {None} - used_stimuli
    if mine:
        await db.execute(delete(PracticeItem).where(PracticeItem.kind == "question", PracticeItem.key.in_(mine)))
    if my_stimuli:
        await db.execute(delete(PracticeItem).where(PracticeItem.kind == "stimulus", PracticeItem.key.in_(list(my_stimuli))))


@router.post("/tests", response_model=SuccessResponse[dict], status_code=201)
async def create_test(_admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(NewTestBody, body)
    if not (await db.execute(select(Exam.id).where(Exam.slug == data.examSlug))).scalar_one_or_none():
        raise ValidationError(f"examSlug: no exam '{data.examSlug}'.")
    slug = _slugify(data.title)
    if len(slug) < 2:
        raise ValidationError("title: use letters or numbers.")
    if slug in await _items(db, "test"):
        raise ValidationError(f"title: a test called '{data.title.strip()}' already exists. Choose another title.")

    test = {
        "slug": slug,
        "examSlug": data.examSlug,
        "title": data.title.strip(),
        "kind": "full-mock",
        "summary": "",
        "totalMinutes": 0,
        "sectionLock": False,
        "sections": [{"id": "section-1", "label": "Section 1", "questionIds": []}],
        "languages": ["English"],
        "attemptsAllowed": None,
        "isFree": False,
        "isPublished": False,
    }
    db.add(PracticeItem(id=uuid.uuid4(), kind="test", key=slug, position=await _next_position(db), data=test))
    await db.commit()
    return SuccessResponse[dict](data={"slug": slug, "message": f"{test['title']} created. Add its questions, then publish it."})


@router.put("/tests/{slug}", response_model=SuccessResponse[dict])
async def save_test(slug: str, _admin: AdminPayload, db: DbSession, body: dict):
    data = _parse(TestBody, body)
    tests = await _items(db, "test")
    row = tests.get(slug)
    if row is None:
        raise NotFoundError("Practice test")
    old = row.data

    total = sum(len(s.questions) for s in data.sections)
    if total > MAX_QUESTIONS:
        raise ValidationError(f"sections: a test holds at most {MAX_QUESTIONS} questions.")
    if data.isPublished and total == 0:
        raise ValidationError("isPublished: add at least one question before publishing.")
    if data.sectionLock and any(s.durationMinutes is None for s in data.sections):
        raise ValidationError("sectionLock: give every section its own time when sections are locked.")

    # Validate everything before touching anything stored.
    for si, section in enumerate(data.sections, start=1):
        for qi, question in enumerate(section.questions, start=1):
            _check_question(question, f"{section.label.strip()}, question {qi}")

    questions_existing = await _items(db, "question")
    await _drop_unshared(db, old, [t.data for k, t in tests.items() if k != slug], questions_existing)
    await db.flush()

    # Rebuild this test's content.
    position = await _next_position(db)
    stimulus_ids: dict[str, str] = {}
    section_rows, new_items = [], []
    seen_section_ids: set[str] = set()
    counter = 0
    for si, section in enumerate(data.sections, start=1):
        section_id = _slugify(section.label) or f"section-{si}"
        while section_id in seen_section_ids:
            section_id = f"{section_id}-{si}"
        seen_section_ids.add(section_id)
        question_ids = []
        for q in section.questions:
            counter += 1
            qid = f"{slug}-q{counter}"
            question_ids.append(qid)

            passage = q.passage.strip()
            stimulus_id = None
            if passage:
                if passage not in stimulus_ids:
                    stimulus_ids[passage] = f"{slug}-s{len(stimulus_ids) + 1}"
                    new_items.append(("stimulus", stimulus_ids[passage], {
                        "id": stimulus_ids[passage],
                        "kind": "passage",
                        "label": f"Passage {len(stimulus_ids)}",
                        "body": doc_from_text(passage),
                    }))
                stimulus_id = stimulus_ids[passage]

            record = {
                "id": qid,
                "examSlug": old["examSlug"],
                "sectionId": section_id,
                "topic": q.topic.strip() or section.label.strip(),
                "difficulty": q.difficulty,
                "type": q.type,
                "stem": doc_from_text(q.stem),
                "marks": _number(q.marks),
                "negativeMarks": _number(q.negativeMarks),
                "expectedSeconds": q.expectedSeconds,
            }
            if stimulus_id:
                record["stimulusId"] = stimulus_id
            if q.solution.strip():
                record["solution"] = doc_from_text(q.solution)
            if q.type == "tita":
                record["correct"] = {"kind": "value", "value": _number(q.answerValue), "tolerance": _number(q.tolerance)}
            else:
                record["options"] = [{"id": LETTERS[i], "body": doc_from_text(o)} for i, o in enumerate(q.options)]
                record["correct"] = {"kind": "options", "optionIds": [LETTERS[i] for i in sorted(q.correctOptions)]}
            new_items.append(("question", qid, record))

        entry = {"id": section_id, "label": section.label.strip(), "questionIds": question_ids}
        if section.durationMinutes:
            entry["durationMinutes"] = section.durationMinutes
        section_rows.append(entry)

    for kind, key, record in new_items:
        position += 1
        # An id left over from an earlier save of this test is replaced.
        await db.execute(delete(PracticeItem).where(PracticeItem.kind == kind, PracticeItem.key == key))
        db.add(PracticeItem(id=uuid.uuid4(), kind=kind, key=key, position=position, data=record))

    row.data = {
        "slug": slug,
        "examSlug": old["examSlug"],
        "title": data.title.strip(),
        "kind": data.kind,
        "summary": data.summary.strip(),
        "totalMinutes": data.totalMinutes,
        "sectionLock": data.sectionLock,
        "sections": section_rows,
        "languages": [l.strip() for l in data.languages if l.strip()] or ["English"],
        "attemptsAllowed": data.attemptsAllowed,
        "isFree": data.isFree,
        "isPublished": data.isPublished,
    }
    await db.commit()
    state = "published" if data.isPublished else "saved as a draft"
    return SuccessResponse[dict](data={"message": f"{data.title.strip()} {state} with {total} question{'' if total == 1 else 's'}."})


@router.delete("/tests/{slug}", response_model=SuccessResponse[dict])
async def delete_test(slug: str, _admin: AdminPayload, db: DbSession):
    tests = await _items(db, "test")
    row = tests.get(slug)
    if row is None:
        raise NotFoundError("Practice test")
    await _drop_unshared(db, row.data, [t.data for k, t in tests.items() if k != slug], await _items(db, "question"))
    await db.delete(row)
    await db.commit()
    return SuccessResponse[dict](data={"message": "Practice test deleted."})
