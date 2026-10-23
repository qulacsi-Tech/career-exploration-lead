"""The college record rules (core/college_rules.py). Pure functions: no database needed."""

import pytest

from core import college_rules as r


def test_name_accepts_real_names_and_refuses_markup():
    assert r.check_name("  St.  Xavier's  College (Autonomous) ") == "St. Xavier's College (Autonomous)"
    assert r.check_name("बेंगलुरु संस्थान")
    for bad in ["<script>alert(1)</script>", "x'; DROP TABLE colleges;--", "a", "   ", "Name {x}"]:
        with pytest.raises(ValueError):
            r.check_name(bad)


def test_year_established_has_one_range(monkeypatch):
    assert r.check_year_established(1800) == 1800
    assert r.check_year_established(None) is None
    for bad in (1000, 1799, 2999):
        with pytest.raises(ValueError, match="between 1800"):
            r.check_year_established(bad)


@pytest.mark.parametrize("text", ["₹4.2L - 9.6L", "₹7 - 18 LPA", "₹1.2Cr - 2Cr", "₹5L - 5L", ""])
def test_fee_range_ok(text):
    assert r.check_fee_range(text) == text


def test_fee_range_refuses_inverted_and_negative():
    with pytest.raises(ValueError, match="'From' fee"):
        r.check_fee_range("₹20L - 5L")
    with pytest.raises(ValueError, match="negative"):
        r.check_fee_range("₹-5L - 10L")
    # units are compared, so 1 Cr is above 50 L
    with pytest.raises(ValueError):
        r.check_fee_range("₹1Cr - 50L")
    assert r.check_fee_range("₹50L - 1Cr")
    # half a range is not a range
    for half in ("₹5L - ", "₹ - 9.6L", "₹5 - LPA"):
        with pytest.raises(ValueError, match="both"):
            r.check_fee_range(half)
    assert r.check_fee_range("₹7.5L")


def test_amount_and_packages():
    assert r.check_amount("₹0L", "Fees") == "₹0L"
    with pytest.raises(ValueError, match="0 or more"):
        r.check_amount("₹-5L", "Fees")
    r.check_packages("₹10 LPA", "₹8 LPA", "₹1 Cr")  # 1 Cr is 100 LPA: fine
    with pytest.raises(ValueError, match="average"):
        r.check_packages("₹10 LPA", "", "₹5 LPA")
    with pytest.raises(ValueError, match="median"):
        r.check_packages("", "₹10 LPA", "₹5 LPA")


def test_duration_batch_ratio_score():
    assert r.check_duration("24 Months") == "24 Months"
    assert r.check_duration("2 years") == "2 years"
    for bad in ("abc", "", "two years", "0x"):
        with pytest.raises(ValueError):
            r.check_duration(bad)
    for ok in ("2021", "2021-2025", "2023–25"):
        assert r.check_batch(ok)
    with pytest.raises(ValueError):
        r.check_batch("abcd")
    assert r.check_ratio("15:1") == "15:1" and r.check_ratio("") == ""
    with pytest.raises(ValueError):
        r.check_ratio("0:0")
    assert r.check_score("98 percentile")
    with pytest.raises(ValueError, match="between 0 and 100"):
        r.check_score("150 percentile")
    with pytest.raises(ValueError):
        r.check_score("high")
    assert r.check_score("Rank 1,200")


def test_dates():
    assert r.check_not_future("2020-01-01", "Date", 2000)
    with pytest.raises(ValueError, match="future"):
        r.check_not_future("2999-01-01", "Date")
    with pytest.raises(ValueError, match="before 2000"):
        r.check_not_future("1999-01-01", "Date", 2000)


def test_exams_resolve_to_the_directory_name_and_old_values_are_kept():
    table = r.exam_lookup([("cat", "Common Admission Test (CAT)"), ("xat", "XAT")])
    assert r.resolve_exams(["cat", "XAT"], table, set(), "Exams") == ["Common Admission Test (CAT)", "XAT"]
    with pytest.raises(ValueError, match="FAKE"):
        r.resolve_exams(["FAKE"], table, set(), "Exams")
    # already on the record: kept even if the directory has never heard of it
    assert r.resolve_exams(["KCET"], table, {"kcet"}, "Exams") == ["KCET"]
    # and a short form already on the record is not rewritten
    assert r.resolve_exams(["CAT"], table, {"cat"}, "Exams") == ["CAT"]
