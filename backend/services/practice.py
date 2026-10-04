"""Practice tests: content for the player, and scoring of a submitted attempt.

Scoring happens here, not in the browser, so correct answers are never sent
to a candidate before they submit. The rules are a line-for-line port of the
scoring the player used before: an exact set match for multi-select answers, a
numeric tolerance for TITA answers, marks lost on wrong answers, and nothing
for a question that was not answered. A question marked for review without a
saved answer scores nothing, as in the real paper.

Sections are read by position in the paper, not by a question's own section
id, because a mixed sample set reuses questions from several source sections.
"""

import re
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from models.practice import PracticeItem

PUBLIC_QUESTION_OMIT = {"correct", "solution"}
_NUMBER = re.compile(r"^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?")


class PracticeContent:
    """Every test, question and stimulus, loaded once per request."""

    def __init__(self, tests: dict[str, dict], questions: dict[str, dict], stimuli: dict[str, dict]):
        self.tests = tests
        self.questions = questions
        self.stimuli = stimuli

    def flat_questions(self, test: dict) -> list[dict]:
        """Every question in paper order. Ids that resolve to nothing are skipped."""
        out = []
        for section in test["sections"]:
            for qid in section["questionIds"]:
                if qid in self.questions:
                    out.append(self.questions[qid])
        return out

    def public_test(self, test: dict) -> dict:
        """The test as a candidate sees it: no correct answers or solutions."""
        questions = self.flat_questions(test)
        used_stimuli = []
        seen = set()
        for q in questions:
            sid = q.get("stimulusId")
            if sid and sid in self.stimuli and sid not in seen:
                seen.add(sid)
                used_stimuli.append(self.stimuli[sid])
        return {
            **test,
            "questions": [{k: v for k, v in q.items() if k not in PUBLIC_QUESTION_OMIT} for q in questions],
            "stimuli": used_stimuli,
        }


async def load_content(db: AsyncSession) -> PracticeContent:
    rows = (await db.execute(select(PracticeItem))).scalars().all()
    tests, questions, stimuli = {}, {}, {}
    for row in rows:
        if row.kind == "test":
            tests[row.key] = row.data
        elif row.kind == "question":
            questions[row.key] = row.data
        elif row.kind == "stimulus":
            stimuli[row.key] = row.data
    return PracticeContent(tests, questions, stimuli)


def published_tests(content: PracticeContent, exam: Optional[str] = None) -> list[dict]:
    """Published tests, free sample sets first, as cards for the exam pages."""
    tests = [t for t in content.tests.values() if t.get("isPublished")]
    if exam:
        tests = [t for t in tests if t.get("examSlug") == exam]
    tests.sort(key=lambda t: 0 if t.get("isFree") else 1)
    return [summary(content, t) for t in tests]


def summary(content: PracticeContent, test: dict) -> dict:
    """What a card needs: the test's details without its questions."""
    return {
        "slug": test["slug"],
        "examSlug": test["examSlug"],
        "title": test["title"],
        "kind": test["kind"],
        "summary": test["summary"],
        "totalMinutes": test["totalMinutes"],
        "sectionLock": test["sectionLock"],
        "languages": test["languages"],
        "attemptsAllowed": test.get("attemptsAllowed"),
        "isFree": test["isFree"],
        "questionCount": sum(len(s["questionIds"]) for s in test["sections"]),
        "sectionCount": len(test["sections"]),
        "markingSummary": marking_summary(content.flat_questions(test)),
    }


def _fmt(n: Any) -> str:
    """Numbers as the browser writes them: 3 not 3.0."""
    f = float(n)
    return str(int(f)) if f.is_integer() else str(f)


def marking_summary(questions: list[dict]) -> str:
    """The marking scheme in one line. Mirrors the browser's wording exactly."""
    if not questions:
        return "No questions"
    marks = sorted({q["marks"] for q in questions}, key=lambda v: float(v))
    penalties = sorted({q["negativeMarks"] for q in questions if q["negativeMarks"] > 0}, key=lambda v: float(v))
    positive = (
        f"+{_fmt(marks[0])}" if len(marks) == 1 else f"+{_fmt(min(marks))} to +{_fmt(max(marks))}"
    )
    if not penalties:
        return f"{positive} per correct answer · no negative marking"
    negative = (
        f"−{_fmt(penalties[0])}" if len(penalties) == 1 else f"−{_fmt(min(penalties))} to −{_fmt(max(penalties))}"
    )
    return f"{positive} per correct answer · {negative} per wrong answer"


def _parse_float(text: str) -> float:
    """JavaScript parseFloat: the leading number, or NaN when there is none."""
    m = _NUMBER.match(text)
    return float(m.group(0)) if m else float("nan")


def is_correct(correct: dict, saved: Optional[dict]) -> bool:
    if saved is None:
        return False
    if correct["kind"] == "options":
        if saved.get("optionIds") is None:
            return False
        given = set(saved["optionIds"])
        # Exact set match: a partly right multi-select is not right.
        return len(given) == len(correct["optionIds"]) and all(i in given for i in correct["optionIds"])
    if saved.get("value") is None:
        return False
    parsed = _parse_float(saved["value"].strip())
    if parsed != parsed or parsed in (float("inf"), float("-inf")):
        return False
    return abs(parsed - float(correct["value"])) <= float(correct["tolerance"])


def score(content: PracticeContent, test: dict, responses: dict[str, dict]) -> dict:
    """Scores an attempt. `responses` maps question id to {status, saved, secondsSpent}."""
    results = []
    for question in content.flat_questions(test):
        response = responses.get(question["id"]) or {"status": "not-visited", "secondsSpent": 0}
        saved = response.get("saved")
        has_answer = saved is not None
        right = has_answer and is_correct(question["correct"], saved)
        outcome = "skipped" if not has_answer else ("correct" if right else "incorrect")
        if outcome == "correct":
            awarded = question["marks"]
        elif outcome == "incorrect":
            awarded = -question["negativeMarks"]
        else:
            awarded = 0
        results.append({
            "question": question,
            "status": response.get("status", "not-visited"),
            "saved": saved,
            "outcome": outcome,
            "marksAwarded": awarded,
            "secondsSpent": response.get("secondsSpent", 0),
        })

    correct = sum(1 for r in results if r["outcome"] == "correct")
    incorrect = sum(1 for r in results if r["outcome"] == "incorrect")
    skipped = sum(1 for r in results if r["outcome"] == "skipped")
    attempted = correct + incorrect

    # Sliced by position, as the browser did: see the module note.
    sections = []
    cursor = 0
    for section in test["sections"]:
        count = len(section["questionIds"])
        rows = results[cursor:cursor + count]
        cursor += count
        sections.append({
            "id": section["id"],
            "label": section["label"],
            "score": sum(r["marksAwarded"] for r in rows),
            "maxScore": sum(r["question"]["marks"] for r in rows),
            "correct": sum(1 for r in rows if r["outcome"] == "correct"),
            "incorrect": sum(1 for r in rows if r["outcome"] == "incorrect"),
            "skipped": sum(1 for r in rows if r["outcome"] == "skipped"),
            "secondsSpent": sum(r["secondsSpent"] for r in rows),
        })

    topic_map: dict[str, dict] = {}
    for row in results:
        entry = topic_map.setdefault(row["question"]["topic"], {"correct": 0, "total": 0, "secondsSpent": 0})
        entry["total"] += 1
        entry["secondsSpent"] += row["secondsSpent"]
        if row["outcome"] == "correct":
            entry["correct"] += 1
    topics = [{"topic": t, **v} for t, v in topic_map.items()]
    topics.sort(key=lambda t: t["correct"] / t["total"])

    return {
        "test": content.public_test(test),
        "results": results,
        "score": sum(r["marksAwarded"] for r in results),
        "maxScore": sum(r["question"]["marks"] for r in results),
        "attempted": attempted,
        "correct": correct,
        "incorrect": incorrect,
        "skipped": skipped,
        "accuracy": 0 if attempted == 0 else (correct / attempted) * 100,
        "totalSeconds": sum(r["secondsSpent"] for r in results),
        "sections": sections,
        "topics": topics,
    }


def require_published(content: PracticeContent, slug: str) -> dict:
    test = content.tests.get(slug)
    if test is None or not test.get("isPublished"):
        raise NotFoundError("Practice test")
    return test
