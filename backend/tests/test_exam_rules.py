import pytest

from core import exam_rules as r


@pytest.mark.parametrize("value", ["26 Mar 2027", "5 Mar 2027", "29 Feb 2028", "", None])
def test_valid_dates(value):
    assert r.check_date(value) == (value.strip() if value else value)


@pytest.mark.parametrize("value", ["31 Feb 2026", "15 OCT 2026", "01 Jan 2027", "Usually June", "1 Jan 1990", "1 Jan 2101", "12-01-202700"])
def test_invalid_dates(value):
    with pytest.raises(ValueError):
        r.check_date(value)


@pytest.mark.parametrize("value", ["₹1,000", "1500", "₹100 (no fee for women, SC, ST)", "Free", "Rs. 500", "", None])
def test_valid_fees(value):
    r.check_fee(value)


@pytest.mark.parametrize("value", ["abc", "fee later", "₹"])
def test_invalid_fees(value):
    with pytest.raises(ValueError):
        r.check_fee(value)


def test_urls():
    assert r.check_url("https://ssc.gov.in") == "https://ssc.gov.in"
    for bad in ["not a url", "ftp://x.org", "javascript:alert(1)"]:
        with pytest.raises(ValueError):
            r.check_url(bad)


def test_html_is_refused_in_plain_text():
    assert r.plain_text("QA Board", "Name") == "QA Board"
    with pytest.raises(ValueError):
        r.plain_text("<img src=x onerror=alert(1)>", "Name")


def test_registration_must_close_by_the_exam_date():
    r.check_order("1 Jun 2027", "15 Jun 2027")
    r.check_order("15 Jun 2027", "15 Jun 2027")
    r.check_order(None, "15 Jun 2027")
    with pytest.raises(ValueError):
        r.check_order("1 Dec 2027", "15 Jun 2027")


def test_data_issues_flag_old_records():
    assert r.data_issues("1 Jun 2027", "15 Jun 2027", "₹100") == []
    issues = r.data_issues("1 Dec 2027", "31 Feb 2026", "abc")
    assert len(issues) == 2 + 0 or len(issues) >= 2
    assert any("Application fee" in i for i in issues)
