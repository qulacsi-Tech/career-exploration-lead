# Import all models here so Alembic's env.py picks up every table
# when it imports `models` and inspects Base.metadata.

from models.user import User, UserRole  # noqa: F401
from models.college import College, OwnershipType  # noqa: F401
from models.course import Course  # noqa: F401
from models.placement import Placement  # noqa: F401
from models.cutoff import Cutoff  # noqa: F401
from models.review import Review  # noqa: F401
from models.exam import Exam, ExamLevel  # noqa: F401
from models.location import Location  # noqa: F401
from models.article import Article  # noqa: F401
from models.program import Program  # noqa: F401
from models.lead import Lead, LeadType, LeadStatus  # noqa: F401
from models.newsletter import NewsletterSubscriber  # noqa: F401
from models.course_catalogue import CourseCatalogue  # noqa: F401
from models.specialisation import Specialisation  # noqa: F401
from models.ranking import RankingList, RankingEntry  # noqa: F401
from models.study_abroad import StudyAbroadItem  # noqa: F401
from models.collection import Collection  # noqa: F401
from models.site_content import SiteContent  # noqa: F401
