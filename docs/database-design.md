# Database Design

## Database: PostgreSQL 16

---

## Entity Relationship Overview

```
users ──────────────────────────── reviews
                                     │
colleges ──┬── courses               │
           ├── placements             │
           ├── cutoffs                │
           ├── reviews ◄─────────────┘
           └── rating_breakdown (computed from reviews or stored)

exams ──── (referenced by courses.exams_accepted JSON array)

locations ── (city/state lookup)

articles ── (standalone)

programs ── → college (university_slug FK)

leads ── → college (optional FK)

newsletter_subscribers ── (standalone)
```

---

## Tables

### `users`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(200) | NOT NULL |
| email | VARCHAR(320) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(72) | NOT NULL |
| role | ENUM('USER','ADMIN') | NOT NULL, default 'USER' |
| phone | VARCHAR(20) | NULLABLE |
| is_verified | BOOLEAN | NOT NULL, default FALSE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |
| updated_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes: `idx_users_email`

---

### `colleges`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default gen_random_uuid() |
| slug | VARCHAR(200) | NOT NULL, UNIQUE |
| name | VARCHAR(500) | NOT NULL |
| city | VARCHAR(200) | NOT NULL |
| state | VARCHAR(200) | NOT NULL |
| ownership | ENUM('Private','Government','Deemed') | NOT NULL |
| stream | VARCHAR(100) | NOT NULL |
| ranking_authority | VARCHAR(100) | NULLABLE |
| ranking_rank | INTEGER | NULLABLE |
| rating | NUMERIC(3,1) | NOT NULL, default 0.0 |
| review_count | INTEGER | NOT NULL, default 0 |
| courses_offered | INTEGER | NOT NULL, default 0 |
| fees_range | VARCHAR(100) | NULLABLE |
| exams_accepted | JSONB | NOT NULL, default '[]' |
| tags | JSONB | NOT NULL, default '[]' |
| approvals | JSONB | NOT NULL, default '[]' |
| established | INTEGER | NULLABLE |
| about | TEXT | NULLABLE |
| is_featured | BOOLEAN | NOT NULL, default FALSE |
| view_count | INTEGER | NOT NULL, default 0 |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |
| updated_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes:
- `idx_colleges_slug` (unique)
- `idx_colleges_stream`
- `idx_colleges_city`
- `idx_colleges_state`
- `idx_colleges_ownership`
- `idx_colleges_rating`
- `idx_colleges_is_featured`

---

### `courses`

One college → many courses.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| college_id | UUID | FK → colleges.id, ON DELETE CASCADE |
| name | VARCHAR(200) | NOT NULL |
| duration | VARCHAR(100) | NOT NULL |
| mode | VARCHAR(100) | NOT NULL |
| fees | VARCHAR(200) | NOT NULL |
| exams | JSONB | NOT NULL, default '[]' |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes: `idx_courses_college_id`

---

### `placements`

One college → one placement record per year.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| college_id | UUID | FK → colleges.id, ON DELETE CASCADE |
| year | INTEGER | NOT NULL |
| average_package | VARCHAR(50) | NULLABLE |
| median_package | VARCHAR(50) | NULLABLE |
| highest_package | VARCHAR(50) | NULLABLE |
| top_recruiters | JSONB | NOT NULL, default '[]' |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Unique: `(college_id, year)`
Indexes: `idx_placements_college_id`

---

### `cutoffs`

One college → many cutoff records.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| college_id | UUID | FK → colleges.id, ON DELETE CASCADE |
| exam | VARCHAR(100) | NOT NULL |
| category | VARCHAR(100) | NOT NULL |
| score | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes: `idx_cutoffs_college_id`

---

### `reviews`

User reviews for a college.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| college_id | UUID | FK → colleges.id, ON DELETE CASCADE |
| user_id | UUID | FK → users.id, ON DELETE SET NULL, NULLABLE |
| author_name | VARCHAR(200) | NOT NULL |
| course | VARCHAR(200) | NOT NULL |
| batch | VARCHAR(50) | NOT NULL |
| verified | BOOLEAN | NOT NULL, default FALSE |
| review_date | DATE | NOT NULL |
| rating | NUMERIC(3,1) | NOT NULL |
| body | TEXT | NOT NULL |
| rating_placements | NUMERIC(3,1) | NULLABLE |
| rating_faculty | NUMERIC(3,1) | NULLABLE |
| rating_infrastructure | NUMERIC(3,1) | NULLABLE |
| rating_campus_life | NUMERIC(3,1) | NULLABLE |
| is_approved | BOOLEAN | NOT NULL, default TRUE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes:
- `idx_reviews_college_id`
- `idx_reviews_user_id`
- `idx_reviews_is_approved`

---

### `exams`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| slug | VARCHAR(200) | NOT NULL, UNIQUE |
| name | VARCHAR(500) | NOT NULL |
| conducting_body | VARCHAR(200) | NOT NULL |
| level | ENUM('National','State') | NOT NULL |
| description | TEXT | NOT NULL |
| registration_closes | VARCHAR(50) | NULLABLE |
| exam_date | VARCHAR(50) | NULLABLE |
| stream | VARCHAR(100) | NULLABLE |
| is_featured | BOOLEAN | NOT NULL, default FALSE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |
| updated_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes: `idx_exams_slug` (unique), `idx_exams_level`, `idx_exams_stream`

---

### `locations`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| slug | VARCHAR(200) | NOT NULL, UNIQUE |
| name | VARCHAR(200) | NOT NULL |
| state | VARCHAR(200) | NOT NULL |
| college_count | INTEGER | NOT NULL, default 0 |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes: `idx_locations_slug` (unique)

---

### `articles`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| slug | VARCHAR(200) | NOT NULL, UNIQUE |
| title | VARCHAR(500) | NOT NULL |
| excerpt | TEXT | NOT NULL |
| body | TEXT | NULLABLE |
| published_at | DATE | NOT NULL |
| is_published | BOOLEAN | NOT NULL, default TRUE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |
| updated_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes: `idx_articles_slug` (unique), `idx_articles_published_at`

---

### `programs`

Recommended programs/courses.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| slug | VARCHAR(200) | NOT NULL, UNIQUE |
| name | VARCHAR(500) | NOT NULL |
| university_name | VARCHAR(500) | NOT NULL |
| university_slug | VARCHAR(200) | NOT NULL |
| online_duration | VARCHAR(100) | NULLABLE |
| online_fees | VARCHAR(200) | NULLABLE |
| online_fees_note | VARCHAR(200) | NULLABLE |
| on_campus_duration | VARCHAR(100) | NULLABLE |
| on_campus_fees | VARCHAR(200) | NULLABLE |
| is_recommended | BOOLEAN | NOT NULL, default FALSE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes: `idx_programs_slug` (unique), `idx_programs_is_recommended`

---

### `leads`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| phone | VARCHAR(20) | NOT NULL |
| email | VARCHAR(320) | NULLABLE |
| college_slug | VARCHAR(200) | NULLABLE |
| type | ENUM('callback','counselling','brochure','enquiry') | NOT NULL |
| status | ENUM('new','contacted','converted','closed') | NOT NULL, default 'new' |
| created_at | TIMESTAMP WITH TZ | NOT NULL, default now() |

Indexes:
- `idx_leads_phone`
- `idx_leads_college_slug`
- `idx_leads_type`
- `idx_leads_created_at`

---

### `newsletter_subscribers`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(320) | NOT NULL, UNIQUE |
| subscribed_at | TIMESTAMP WITH TZ | NOT NULL, default now() |
| is_active | BOOLEAN | NOT NULL, default TRUE |

Indexes: `idx_newsletter_email` (unique)

---

## Normalization Notes

- `exams_accepted`, `tags`, `approvals` stored as JSONB arrays on `colleges` — acceptable for a read-heavy directory where these are filters applied in Meilisearch, not relational joins
- `rating_breakdown` computed on-the-fly from `reviews` or via the 4 `rating_*` columns on the `reviews` table (averaged per college)
- `college_count` on `locations` is a denormalized counter — updated by trigger or seed; acceptable for read performance

## Migration Strategy

- Alembic auto-generate from SQLAlchemy models
- One initial migration: `001_initial_schema.py`
- All future schema changes via new numbered migrations
- Never edit past migrations
