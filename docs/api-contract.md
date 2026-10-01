# API Contract

## Base URL
`/api/v1`

## Response Envelope

All responses use a consistent envelope:

```json
// Success
{ "success": true, "data": <payload> }

// List
{ "success": true, "data": [...], "meta": { "total": 0, "page": 1, "limit": 20, "pages": 1 } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

---

## 1. Health

### GET /api/ping
Auth: Public
Response: `{ "status": "ok" }`

---

## 2. Colleges

### GET /api/v1/colleges
Auth: Public

Query params:
| Param | Type | Description |
|---|---|---|
| page | int (default 1) | Page number |
| limit | int (default 20, max 100) | Items per page |
| stream | string | e.g. management, engineering |
| city | string | e.g. Bangalore |
| state | string | e.g. Karnataka |
| ownership | string | Private \| Government \| Deemed |
| course | string | e.g. MBA |
| mode | string | Full Time \| Online \| Weekend |
| approval | string | AICTE \| UGC \| NAAC A++ |
| exam | string | CAT \| XAT \| GMAT |
| fees_min | int | Min fees in rupees |
| fees_max | int | Max fees in rupees |
| ranking_max | int | Max NIRF rank |
| sort | string | popularity \| rating \| views (default: popularity) |
| featured | bool | Return featured colleges only |
| q | string | Full-text search query |

Response:
```json
{
  "success": true,
  "data": [
    {
      "slug": "bengaluru-institute-of-management-studies",
      "name": "Bengaluru Institute of Management Studies",
      "city": "Bengaluru",
      "state": "Karnataka",
      "ownership": "Private",
      "stream": "Management",
      "ranking": { "authority": "NIRF", "rank": 34 },
      "rating": 4.4,
      "reviewCount": 612,
      "coursesOffered": 6,
      "feesRange": "₹9.5L - 21L",
      "examsAccepted": ["CAT", "XAT", "GMAT"],
      "tags": ["Top Placements", "Featured"],
      "approvals": ["AICTE", "NAAC A++"]
    }
  ],
  "meta": { "total": 141, "page": 1, "limit": 20, "pages": 8 }
}
```

---

### GET /api/v1/colleges/:slug
Auth: Public

Response:
```json
{
  "success": true,
  "data": {
    "slug": "...",
    "name": "...",
    "city": "...",
    "state": "...",
    "ownership": "Private|Government|Deemed",
    "stream": "Management",
    "ranking": { "authority": "NIRF", "rank": 34 },
    "rating": 4.4,
    "reviewCount": 612,
    "coursesOffered": 6,
    "feesRange": "₹9.5L - 21L",
    "examsAccepted": ["CAT", "XAT"],
    "tags": ["Featured"],
    "approvals": ["AICTE"],
    "established": 1998,
    "about": "...",
    "ratingBreakdown": [
      { "label": "Placements", "score": 4.6 },
      { "label": "Faculty", "score": 4.3 },
      { "label": "Infrastructure", "score": 4.5 },
      { "label": "Campus Life", "score": 4.2 }
    ],
    "courses": [
      {
        "name": "MBA",
        "duration": "24 Months",
        "mode": "Full Time",
        "fees": "₹18.4L Total Fees",
        "exams": ["CAT", "XAT"]
      }
    ],
    "placement": {
      "year": 2025,
      "average": "₹14.2 LPA",
      "median": "₹12.8 LPA",
      "highest": "₹42 LPA",
      "topRecruiters": ["Deloitte", "Amazon"]
    },
    "cutoffs": [
      { "exam": "CAT", "category": "General", "score": "92 percentile" }
    ],
    "reviews": [
      {
        "author": "Komal Mehra",
        "course": "MBA",
        "batch": "2022–24",
        "verified": true,
        "date": "3 Sep 2025",
        "rating": 4.6,
        "body": "..."
      }
    ]
  }
}
```

Errors:
- `404 COLLEGE_NOT_FOUND`

---

### GET /api/v1/colleges/:slug/related
Auth: Public

Query: `limit` (default 3)

Response: Same shape as `GET /api/v1/colleges` data array.

---

### GET /api/v1/colleges/slugs
Auth: Public

Purpose: Used by Next.js `generateStaticParams` at build time.

Response:
```json
{ "success": true, "data": ["slug-1", "slug-2"] }
```

---

## 3. Exams

### GET /api/v1/exams
Auth: Public

Query params:
| Param | Type | Description |
|---|---|---|
| page | int | Page number |
| limit | int | Items per page |
| stream | string | Filter by stream |
| level | string | National \| State |
| featured | bool | Featured exams only |
| q | string | Search query |

Response:
```json
{
  "success": true,
  "data": [
    {
      "slug": "cat",
      "name": "Common Admission Test (CAT)",
      "conductingBody": "IIM",
      "level": "National",
      "description": "...",
      "registrationCloses": "20 Sep 2026",
      "examDate": "29 Nov 2026"
    }
  ],
  "meta": { "total": 24, "page": 1, "limit": 20, "pages": 2 }
}
```

---

### GET /api/v1/exams/:slug
Auth: Public

Response:
```json
{
  "success": true,
  "data": {
    "slug": "cat",
    "name": "...",
    "conductingBody": "IIM",
    "level": "National",
    "description": "...",
    "registrationCloses": "20 Sep 2026",
    "examDate": "29 Nov 2026"
  }
}
```

Errors: `404 EXAM_NOT_FOUND`

---

## 4. Locations

### GET /api/v1/locations
Auth: Public

Response:
```json
{
  "success": true,
  "data": [
    { "slug": "bangalore", "name": "Bangalore", "collegeCount": 214 }
  ]
}
```

---

### GET /api/v1/locations/:slug
Auth: Public

Response:
```json
{
  "success": true,
  "data": {
    "slug": "bangalore",
    "name": "Bangalore",
    "state": "Karnataka",
    "collegeCount": 214
  }
}
```

Errors: `404 LOCATION_NOT_FOUND`

---

## 5. Articles

### GET /api/v1/articles
Auth: Public

Query: `page`, `limit` (default 10)

Response:
```json
{
  "success": true,
  "data": [
    {
      "slug": "mba-admission-process-2026",
      "title": "...",
      "excerpt": "...",
      "date": "9 Aug 2026"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 10, "pages": 2 }
}
```

---

### GET /api/v1/articles/:slug
Auth: Public

Response:
```json
{
  "success": true,
  "data": {
    "slug": "...",
    "title": "...",
    "excerpt": "...",
    "body": "...",
    "date": "9 Aug 2026"
  }
}
```

Errors: `404 ARTICLE_NOT_FOUND`

---

## 6. Programs (Recommended)

### GET /api/v1/programs/recommended
Auth: Public

Query: `limit` (default 3)

Response:
```json
{
  "success": true,
  "data": [
    {
      "slug": "ms-data-analytics",
      "name": "MS in Data Analytics",
      "university": "Clark University",
      "universitySlug": "clark-university",
      "online": { "duration": "8 months", "fees": "INR 4,00,000", "feesNote": "(including taxes)" },
      "onCampus": { "duration": "1 year", "fees": "USD 17,000 (indicative)" }
    }
  ]
}
```

---

## 7. Home Aggregated Data

### GET /api/v1/home
Auth: Public

Purpose: Single call to populate entire home page without waterfalling multiple fetches.

Response:
```json
{
  "success": true,
  "data": {
    "featuredColleges": [ ...College[] (limit 6) ],
    "featuredExams": [ ...Exam[] (limit 6) ],
    "locations": [ ...Location[] ],
    "articles": [ ...Article[] (limit 3) ],
    "recommendedPrograms": [ ...RecommendedProgram[] (limit 3) ],
    "careerPanels": [ ...CareerPanel[] ],
    "recommendedUniversities": [ ...University[] (limit 3) ],
    "dataHighlights": [ ...DataHighlight[] ],
    "streams": [ { "name": "Management", "count": 4172 }, ... ]
  }
}
```

---

## 8. Leads (Lead Capture)

### POST /api/v1/leads
Auth: Public

Request:
```json
{
  "name": "string (required, 2-100 chars)",
  "phone": "string (required, 10 digits)",
  "email": "string (optional, valid email)",
  "collegeSlug": "string (optional)",
  "type": "callback | counselling | brochure | enquiry (required)"
}
```

Response:
```json
{ "success": true, "data": { "id": "uuid", "message": "We will call you within 24 hours." } }
```

Validation errors:
- `400 VALIDATION_ERROR` — missing/invalid fields
- `409 LEAD_DUPLICATE` — same phone+collegeSlug+type within 24h

---

## 9. Newsletter

### POST /api/v1/newsletter/subscribe
Auth: Public

Request:
```json
{ "email": "string (required, valid email)" }
```

Response:
```json
{ "success": true, "data": { "message": "Subscribed successfully." } }
```

Validation errors:
- `400 VALIDATION_ERROR`
- `409 ALREADY_SUBSCRIBED`

---

## 10. Search

### GET /api/v1/search
Auth: Public

Query:
| Param | Type | Description |
|---|---|---|
| q | string (required) | Search query |
| type | string (optional) | college \| exam \| course \| location — filters results |
| limit | int (default 10) | Results per type (when type not specified) |

Response:
```json
{
  "success": true,
  "data": {
    "colleges": [ { "slug": "...", "name": "...", "city": "...", "stream": "..." } ],
    "exams": [ { "slug": "...", "name": "..." } ],
    "locations": [ { "slug": "...", "name": "..." } ]
  }
}
```

---

## 11. Authentication

### POST /api/v1/auth/register
Auth: Public

Request:
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "user": { "id": "uuid", "name": "string", "email": "string", "role": "USER" }
  }
}
```

Errors:
- `409 EMAIL_ALREADY_EXISTS`
- `422 VALIDATION_ERROR`

---

### POST /api/v1/auth/login
Auth: Public

Request:
```json
{ "email": "string", "password": "string" }
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "user": { "id": "uuid", "name": "string", "email": "string", "role": "USER|ADMIN" }
  }
}
```

Errors:
- `401 INVALID_CREDENTIALS`

---

### POST /api/v1/auth/refresh
Auth: Bearer token (refresh token in body or cookie)

Response:
```json
{ "success": true, "data": { "accessToken": "string" } }
```

---

## 12. Reviews

### POST /api/v1/colleges/:slug/reviews
Auth: Required (USER role)

Request:
```json
{
  "course": "string",
  "batch": "string",
  "rating": "number (1-5)",
  "body": "string (min 50 chars)",
  "ratingBreakdown": {
    "placements": 4.5,
    "faculty": 4.0,
    "infrastructure": 4.2,
    "campusLife": 4.1
  }
}
```

Response (201):
```json
{ "success": true, "data": { "id": "uuid", "message": "Review submitted for moderation." } }
```

---

## Frontend ↔ Backend Field Name Contract

All field names use **camelCase** in API responses to match TypeScript interfaces.

| Frontend | Backend DB | API Response |
|---|---|---|
| `slug` | `slug` | `slug` |
| `reviewCount` | `review_count` | `reviewCount` |
| `coursesOffered` | `courses_offered` | `coursesOffered` |
| `feesRange` | `fees_range` | `feesRange` |
| `examsAccepted` | `exams_accepted` (JSON) | `examsAccepted` |
| `ratingBreakdown` | `rating_breakdown` (JSON) | `ratingBreakdown` |
| `topRecruiters` | `top_recruiters` (JSON) | `topRecruiters` |
| `registrationCloses` | `registration_closes` | `registrationCloses` |
| `examDate` | `exam_date` | `examDate` |
| `conductingBody` | `conducting_body` | `conductingBody` |
| `universitySlug` | `university_slug` | `universitySlug` |
| `onCampus` | `on_campus_*` | `onCampus` |
| `collegeSlug` | `college_slug` | `collegeSlug` |
