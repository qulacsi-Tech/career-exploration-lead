import pytest

from core import college_rules as r


@pytest.mark.parametrize("value", ["98 percentile", "Rank 1200", "172/300 marks", "Closed", "N/A", "90 - 95 percentile", "0.5 percentile"])
def test_cutoffs_that_are_fine(value):
    assert r.check_score(value) == value


@pytest.mark.parametrize("value", ["abc", "-5", "Rank -5", "(-3) percentile", "150 percentile"])
def test_cutoffs_that_are_refused(value):
    with pytest.raises(ValueError):
        r.check_score(value)


@pytest.mark.parametrize("value", ["2 Years", "5.5 Years", "18 Months", "96 Months", "8 Years"])
def test_durations_in_range(value):
    r.check_duration(value)


@pytest.mark.parametrize("value", ["50 Years", "97 Months", "9 Years"])
def test_durations_out_of_range(value):
    with pytest.raises(ValueError):
        r.check_duration(value)


def test_fee_limits():
    r.check_fee_range("₹4L - 20L")
    r.check_fee_range("₹1.5 Cr")
    r.check_amount("₹72 LPA", "Highest package")
    for bad in ["999999 L", "₹60 Cr"]:
        with pytest.raises(ValueError):
            r.check_fee_range(bad)
        with pytest.raises(ValueError):
            r.check_amount(bad, "Fees")


def test_award_year_not_in_the_future():
    from schemas.college_detail import AwardItem

    AwardItem(title="Best College", year="2024-25")
    with pytest.raises(ValueError):
        AwardItem(title="Best College", year="2099")
