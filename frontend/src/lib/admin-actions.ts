"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  adminCreateCollege,
  adminCreateExam,
  adminCreateCourse,
  adminCreateRanking,
  adminCreateCollection,
  adminUpdateCollection,
  adminUpdateRanking,
  adminCreateSpecialisation,
  adminUpdateCourse,
  adminUpdateSpecialisation,
  adminCreateStudyAbroadItem,
  adminUpdateLeadStatus,
  LEAD_STATUSES,
  type LeadStatus,
  adminDeleteStudyAbroadItem,
  adminReorderStudyAbroad,
  adminSetFiguresReviewed,
  adminUpdateCollege,
  adminUpdateExam,
  adminUpdateStudyAbroadItem,
  type StudyAbroadKind,
} from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-session";

/**
 * Admin writes, run as Server Actions so the session token stays on the server.
 *
 * A field left empty is not sent, so an edit never blanks a value the form
 * simply did not change. Comma-separated fields become lists. Numbers are sent
 * as typed; the API validates them and returns a message when one is wrong.
 */

export type AdminActionResult = { ok: true } | { error: string };

const COLLEGE_EDIT_FIELDS = [
  "name", "city", "state", "ownership", "stream", "feesRange", "about",
  "rankingRank", "rankingAuthority", "coursesOffered", "established",
  "examsAccepted", "tags", "approvals",
] as const;

const COLLEGE_CREATE_FIELDS = [
  "name", "city", "state", "ownership", "stream", "feesRange", "about", "established",
] as const;

const EXAM_EDIT_FIELDS = [
  "name", "conductingBody", "description", "registrationCloses", "examDate",
  "mode", "frequency", "applicationFee", "officialSite",
] as const;

const LIST_FIELDS: ReadonlySet<string> = new Set(["examsAccepted", "tags", "approvals"]);

function text(form: FormData, key: string): string | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? undefined : value;
}

function body(form: FormData, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = text(form, key);
    if (value === undefined) continue;
    out[key] = LIST_FIELDS.has(key)
      ? value.split(",").map((item) => item.trim()).filter(Boolean)
      : value;
  }
  return out;
}

/**
 * Runs one admin call. A 401 means the session has expired, so the visitor is
 * sent to log in. Other API errors come back as the message the API gave.
 */
async function attempt(
  revalidate: string,
  call: (token: string) => Promise<unknown>
): Promise<AdminActionResult> {
  const token = await requireAdminToken();
  try {
    await call(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not save. Try again." };
  }
  revalidatePath(revalidate);
  return { ok: true };
}

export async function saveCollege(slug: string, form: FormData): Promise<AdminActionResult> {
  return attempt("/admin/colleges", (token) =>
    adminUpdateCollege(token, slug, body(form, COLLEGE_EDIT_FIELDS))
  );
}

export async function createCollege(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  return attempt("/admin/colleges", (token) =>
    adminCreateCollege(token, { ...body(form, COLLEGE_CREATE_FIELDS), slug: text(form, "slug") })
  );
}

export async function saveExam(slug: string, form: FormData): Promise<AdminActionResult> {
  return attempt("/admin/exams", (token) =>
    adminUpdateExam(token, slug, body(form, EXAM_EDIT_FIELDS))
  );
}

export async function createExam(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  return attempt("/admin/exams", (token) =>
    adminCreateExam(token, {
      ...body(form, ["name", "conductingBody", "level", "description", "mode", "examDate"]),
      slug: text(form, "slug"),
    })
  );
}

// ── Study abroad content ─────────────────────────────────────────────────────

const STUDY_ABROAD_FIELDS: Record<StudyAbroadKind, string[]> = {
  destination: ["slug", "country", "tagline", "universities", "tuition", "living", "postStudyWork", "intakes", "popularCourses"],
  step: ["title", "window", "detail"],
  test: ["name", "purpose", "validity", "href"],
  faq: ["question", "answer"],
};

/** The full row body. Every field is sent, so an update replaces the row. */
function studyAbroadBody(kind: StudyAbroadKind, form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of STUDY_ABROAD_FIELDS[kind]) {
    const value = String(form.get(field) ?? "").trim();
    if (field === "popularCourses") {
      out[field] = value.split(",").map((item) => item.trim()).filter(Boolean);
    } else if (field === "href") {
      out[field] = value === "" ? null : value;
    } else {
      out[field] = value;
    }
  }
  return out;
}

const STUDY_ABROAD_KINDS: ReadonlySet<string> = new Set(["destination", "step", "test", "faq"]);

/** Creates a row when `id` is null, otherwise replaces the row with that id. */
export async function saveStudyAbroadItem(
  kind: StudyAbroadKind,
  id: string | null,
  form: FormData
): Promise<AdminActionResult> {
  if (!STUDY_ABROAD_KINDS.has(kind)) return { error: "Unknown content type." };
  const result = await attempt("/admin/study-abroad", (token) =>
    id === null
      ? adminCreateStudyAbroadItem(token, kind, studyAbroadBody(kind, form))
      : adminUpdateStudyAbroadItem(token, kind, id, studyAbroadBody(kind, form))
  );
  if ("ok" in result) revalidatePath("/study-abroad");
  return result;
}

export async function deleteStudyAbroadItem(kind: StudyAbroadKind, id: string): Promise<AdminActionResult> {
  if (!STUDY_ABROAD_KINDS.has(kind)) return { error: "Unknown content type." };
  const result = await attempt("/admin/study-abroad", (token) =>
    adminDeleteStudyAbroadItem(token, kind, id)
  );
  if ("ok" in result) revalidatePath("/study-abroad");
  return result;
}

export async function saveFiguresReviewed(form: FormData): Promise<AdminActionResult> {
  const value = String(form.get("value") ?? "").trim();
  const result = await attempt("/admin/study-abroad", (token) => adminSetFiguresReviewed(token, value));
  if ("ok" in result) revalidatePath("/study-abroad");
  return result;
}

/** Sets the order of one kind. `ids` lists every row of that kind, in the new order. */
export async function reorderStudyAbroadItems(kind: StudyAbroadKind, ids: string[]): Promise<AdminActionResult> {
  if (!STUDY_ABROAD_KINDS.has(kind)) return { error: "Unknown content type." };
  const result = await attempt("/admin/study-abroad", (token) => adminReorderStudyAbroad(token, kind, ids));
  if ("ok" in result) revalidatePath("/study-abroad");
  return result;
}

// ── Leads ────────────────────────────────────────────────────────────────────

/** Sets a lead's status. Only the four known statuses are accepted. */
export async function updateLeadStatus(id: string, status: string): Promise<AdminActionResult> {
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) return { error: "Unknown status." };
  const result = await attempt("/admin/leads", (token) =>
    adminUpdateLeadStatus(token, id, status as LeadStatus)
  );
  if ("ok" in result) revalidatePath("/admin");
  return result;
}

// ── Courses and specialisations ──────────────────────────────────────────────

const COURSE_FIELDS = [
  "name", "fullName", "level", "stream", "duration", "averageFees", "about",
  "eligibility", "modes", "examsAccepted",
] as const;
const COURSE_NULLABLE = new Set(["averageFees", "about", "eligibility"]);
const COURSE_LISTS = new Set(["modes", "examsAccepted"]);

const SPEC_FIELDS = ["name", "courseSlug", "duration", "averageFees", "about"] as const;
const SPEC_NULLABLE = new Set(["duration", "averageFees", "about"]);

/**
 * Reads the named fields that are on the form. Only the active editor tab is
 * mounted, so a field absent from the form is not part of this save and is left
 * out of the request rather than cleared. Empty optional text becomes null;
 * lists split on commas.
 */
function fieldsBody(form: FormData, fields: readonly string[], nullable: Set<string>, lists: Set<string>) {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (!form.has(field)) continue;
    const value = String(form.get(field) ?? "").trim();
    if (lists.has(field)) {
      out[field] = value.split(",").map((item) => item.trim()).filter(Boolean);
    } else if (value === "" && nullable.has(field)) {
      out[field] = null;
    } else {
      out[field] = value;
    }
  }
  return out;
}

export async function saveCourse(slug: string, form: FormData): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminUpdateCourse(token, slug, fieldsBody(form, COURSE_FIELDS, COURSE_NULLABLE, COURSE_LISTS))
  );
  if ("ok" in result) revalidatePath("/courses", "layout");
  return result;
}

export async function createCourse(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminCreateCourse(token, {
      ...fieldsBody(form, COURSE_FIELDS, COURSE_NULLABLE, COURSE_LISTS),
      slug: String(form.get("slug") ?? "").trim(),
      fullName: String(form.get("fullName") ?? "").trim(),
    })
  );
  if ("ok" in result) revalidatePath("/courses", "layout");
  return result;
}

export async function saveSpecialisation(slug: string, form: FormData): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminUpdateSpecialisation(token, slug, fieldsBody(form, SPEC_FIELDS, SPEC_NULLABLE, new Set()))
  );
  if ("ok" in result) revalidatePath("/courses", "layout");
  return result;
}

export async function createSpecialisation(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminCreateSpecialisation(token, {
      ...fieldsBody(form, SPEC_FIELDS, SPEC_NULLABLE, new Set()),
      slug: String(form.get("slug") ?? "").trim(),
    })
  );
  if ("ok" in result) revalidatePath("/courses", "layout");
  return result;
}

// ── Rankings ─────────────────────────────────────────────────────────────────

/**
 * Reads a ranking form. The ordered entries travel as one JSON field, written by
 * the entries editor, so a save always carries the complete list.
 */
function rankingBody(form: FormData): { value: Record<string, unknown> } | { error: string } {
  let entries: unknown;
  try {
    entries = JSON.parse(String(form.get("entries") ?? "[]"));
  } catch {
    return { error: "The college list could not be read. Reload the page and try again." };
  }
  if (!Array.isArray(entries)) return { error: "The college list must be a list." };

  const stream = String(form.get("stream") ?? "").trim();
  const yearText = String(form.get("year") ?? "").trim();
  return {
    value: {
      name: String(form.get("name") ?? "").trim(),
      authority: String(form.get("authority") ?? "").trim(),
      // Non-numeric text is passed through so the API reports it by field name.
      year: /^\d+$/.test(yearText) ? Number(yearText) : yearText,
      stream: stream === "" ? null : stream,
      entries,
    },
  };
}

function revalidateRankings() {
  // Collections and college pages order by these lists, so their caches go too.
  revalidatePath("/colleges", "layout");
  revalidatePath("/", "layout");
}

export async function saveRanking(slug: string, form: FormData): Promise<AdminActionResult> {
  const body = rankingBody(form);
  if ("error" in body) return body;
  const result = await attempt("/admin/rankings", (token) => adminUpdateRanking(token, slug, body.value));
  if ("ok" in result) revalidateRankings();
  return result;
}

export async function createRanking(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const body = rankingBody(form);
  if ("error" in body) return body;
  const result = await attempt("/admin/rankings", (token) =>
    adminCreateRanking(token, { ...body.value, slug: String(form.get("slug") ?? "").trim() })
  );
  if ("ok" in result) revalidateRankings();
  return result;
}

// ── Collections ──────────────────────────────────────────────────────────────

/** An optional number field. Non-numeric text is passed through so the API names the field. */
function numberOrText(value: string): number | string {
  return /^\d+$/.test(value) ? Number(value) : value;
}

function collectionBody(form: FormData): { value: Record<string, unknown> } | { error: string } {
  let colleges: unknown;
  let faqs: unknown;
  try {
    colleges = JSON.parse(String(form.get("colleges") ?? "[]"));
    faqs = JSON.parse(String(form.get("faqs") ?? "[]"));
  } catch {
    return { error: "The college or FAQ list could not be read. Reload the page and try again." };
  }
  if (!Array.isArray(colleges) || !Array.isArray(faqs)) {
    return { error: "The college and FAQ lists must be lists." };
  }

  const text = (name: string) => String(form.get(name) ?? "").trim();
  const orNull = (name: string) => (text(name) === "" ? null : text(name));

  const homepageOn = form.has("homepageOn");
  const footerOn = form.has("footerOn");

  return {
    value: {
      title: text("title"),
      heading: text("heading"),
      subheading: text("subheading"),
      scope: {
        programSlug: orNull("programSlug"),
        locationSlug: orNull("locationSlug"),
        examSlug: orNull("examSlug"),
        courseSlug: orNull("courseSlug"),
      },
      rankingListSlug: orNull("rankingListSlug"),
      collegeSlugs: colleges,
      homepage: homepageOn
        ? {
            order: numberOrText(text("homepageOrder")),
            limit: numberOrText(text("homepageLimit")),
            isVisible: form.has("homepageVisible"),
          }
        : null,
      footer: footerOn
        ? { column: text("footerColumn"), order: numberOrText(text("footerOrder")) }
        : null,
      seo: {
        metaTitle: text("metaTitle"),
        metaDescription: text("metaDescription"),
        canonical: orNull("canonical"),
        intro: String(form.get("intro") ?? "").trim(),
        faqs,
      },
      isPublished: form.has("isPublished"),
    },
  };
}

function revalidateCollections() {
  revalidatePath("/colleges", "layout");
  revalidatePath("/", "layout");
}

export async function saveCollection(slug: string, form: FormData): Promise<AdminActionResult> {
  const body = collectionBody(form);
  if ("error" in body) return body;
  const result = await attempt("/admin/collections", (token) => adminUpdateCollection(token, slug, body.value));
  if ("ok" in result) revalidateCollections();
  return result;
}

export async function createCollection(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const body = collectionBody(form);
  if ("error" in body) return body;
  const result = await attempt("/admin/collections", (token) =>
    adminCreateCollection(token, { ...body.value, slug: String(form.get("slug") ?? "").trim() })
  );
  if ("ok" in result) revalidateCollections();
  return result;
}
