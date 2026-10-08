"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  adminCreateCollege,
  adminListPracticeTests,
  adminGetPracticeTest,
  adminCreatePracticeTest,
  adminSavePracticeTest,
  adminDeletePracticeTest,
  type AdminPracticeCard,
  type AdminPracticeTest,
  adminCreateExam,
  adminCreateCourse,
  adminCreateRanking,
  adminCreateCollection,
  adminSaveHomepage,
  adminPutContent,
  adminPutTopExams,
  adminPutHomeCopy,
  adminUploadImage,
  adminPutHomeLocations,
  adminCreateLocation,
  adminCreateHeroItem,
  adminUpdateHeroItem,
  adminDeleteHeroItem,
  adminPutHeroOrder,
  adminGetBandColleges,
  adminCreateBand,
  adminUpdateBandWords,
  adminPutBandColleges,
  type BandColleges,
  type NewBandInput,
  type ProgramInput,
  type CollegeCardInput,
  type HeroItemInput,
  type ExamInput,
  adminPutFieldOrder,
  adminCreateField,
  adminUpdateField,
  adminDeleteField,
  type FieldInput,
  adminUpdateLocation,
  adminDeleteLocation,
  type LocationInput,
  adminCreateProgram,
  adminGetCollegeRecord,
  adminSaveCollegeRecord,
  adminGetCollegePools,
  type CollegeRecord,
  adminSetPinnedNews,
  adminCreateArticle,
  adminUpdateArticle,
  adminDeleteArticle,
  type ArticleInput,
  adminUpdateProgram,
  adminSetRecommendedPrograms,
  adminSetUniversities,
  adminDeleteCollection,
  adminDeleteProgram,
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
import { DEFAULT_HOME_COPY, type HomeCopy } from "@/lib/home-copy";

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
  // The photo is sent even when empty, so removing it clears it. Other empty fields are left out.
  const photo = form.get("image");
  return attempt("/admin/colleges", (token) =>
    adminUpdateCollege(token, slug, { ...body(form, COLLEGE_EDIT_FIELDS), ...(typeof photo === "string" ? { image: photo } : {}) })
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

// ── Homepage bands ───────────────────────────────────────────────────────────

/** Saves the whole homepage band set, in display order. */
export async function saveHomepageBands(
  bands: { slug: string; limit: number; isVisible: boolean }[]
): Promise<AdminActionResult> {
  const result = await attempt("/admin/homepage", (token) => adminSaveHomepage(token, bands));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves a row's heading and the line under it. */
export async function saveBandWords(slug: string, heading: string, subheading: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminUpdateBandWords(token, slug, { heading, subheading }));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Makes a college row from scratch and puts it at the end of the homepage. */
export async function createHomepageBand(input: NewBandInput): Promise<{ ok: true; message: string } | { error: string }> {
  const token = await requireAdminToken();
  try {
    const created = await adminCreateBand(token, input);
    revalidatePath("/admin/sections/homepage");
    revalidatePath("/", "layout");
    return { ok: true, message: created.message };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not add the row. Try again." };
  }
}

/** The band's colleges and the colleges that could be added, read for the Manage colleges dialog. */
export async function loadBandColleges(slug: string): Promise<BandColleges | { error: string }> {
  const token = await requireAdminToken();
  try {
    return await adminGetBandColleges(token, slug);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not load the colleges. Try again." };
  }
}

/** Saves a band's colleges, in the order given. */
export async function saveBandColleges(slug: string, slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminPutBandColleges(token, slug, slugs));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** The college's page address: lowercase words joined by hyphens. */
function collegeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Creates a college from the band dialog. Returns its slug so the dialog can add it to the band. */
export async function createBandCollege(input: CollegeCardInput): Promise<{ slug: string } | { error: string }> {
  const slug = collegeSlug(input.name);
  if (slug.length < 2) return { error: "name: use letters or numbers." };
  const result = await attempt("/admin/sections/homepage", (token) =>
    adminCreateCollege(token, {
      slug,
      name: input.name.trim(),
      city: input.city.trim(),
      state: input.state,
      ownership: input.ownership,
      stream: input.stream,
      feesRange: input.feesRange.trim() || null,
      image: input.image,
    })
  );
  if ("error" in result) return result;
  revalidatePath("/", "layout");
  return { slug };
}

export async function updateBandCollege(slug: string, input: CollegeCardInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) =>
    adminUpdateCollege(token, slug, {
      name: input.name.trim(),
      city: input.city.trim(),
      state: input.state,
      ownership: input.ownership,
      stream: input.stream,
      feesRange: input.feesRange.trim(),
      image: input.image,
    })
  );
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves a whole homepage block: "careers" panels or "highlights" data tiles. */
export async function saveHomeContent(name: "careers" | "highlights", items: unknown[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/content", (token) => adminPutContent(token, name, items));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves the homepage's top exams, in display order. */
export async function saveTopExams(slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/homepage", (token) => adminPutTopExams(token, slugs));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** The exam's page address: lowercase words joined by hyphens. */
function examSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The fields the API takes for an exam, with blank optional text sent as empty. */
function examBody(input: ExamInput) {
  return {
    name: input.name.trim(),
    conductingBody: input.conductingBody.trim(),
    level: input.level,
    description: input.description.trim(),
    mode: input.mode,
    registrationCloses: input.registrationCloses.trim(),
    examDate: input.examDate.trim(),
    applicationFee: input.applicationFee.trim(),
    frequency: input.frequency.trim(),
    officialSite: input.officialSite.trim(),
    durationMinutes: input.durationMinutes,
    sections: input.sections,
    stream: input.stream.trim(),
    eligibility: input.eligibility.trim(),
    syllabus: input.syllabus.trim(),
    // A half-filled question would be refused, so only complete ones are sent.
    faqs: input.faqs
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question && f.answer),
    image: input.image,
  };
}

/** Creates an exam from the Top Exams dialog. Returns its slug so the dialog can add it to the row. */
export async function createExamCard(input: ExamInput): Promise<{ slug: string } | { error: string }> {
  const slug = examSlug(input.name);
  if (slug.length < 2) return { error: "name: use letters or numbers." };
  const result = await attempt("/admin/sections/homepage", (token) =>
    adminCreateExam(token, { slug, ...examBody(input) })
  );
  if ("error" in result) return result;
  revalidatePath("/", "layout");
  return { slug };
}

export async function updateExamCard(slug: string, input: ExamInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminUpdateExam(token, slug, examBody(input)));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Adds a hero slide. It goes last, and starts active unless the form says otherwise. */
export async function createHeroItem(input: HeroItemInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminCreateHeroItem(token, input));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function updateHeroItem(id: string, input: HeroItemInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminUpdateHeroItem(token, id, input));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function deleteHeroItem(id: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminDeleteHeroItem(token, id));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves the order of every hero slide. */
export async function saveHeroOrder(ids: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminPutHeroOrder(token, ids));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves one homepage section's copy: the hero, a section heading or the promo banner. */
export async function saveHomeCopy(
  part: keyof HomeCopy,
  value: Record<string, string>
): Promise<AdminActionResult> {
  if (!(part in DEFAULT_HOME_COPY)) return { error: "Unknown section." };
  const result = await attempt("/admin/home-copy", (token) => adminPutHomeCopy(token, part, value));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves the carousel: which locations show and their order. */
export async function saveHomeLocations(
  locations: { slug: string; show: boolean }[]
): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminPutHomeLocations(token, locations));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves which fields show in the homepage grid and their order. */
export async function saveFieldOrder(fields: { slug: string; show: boolean }[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminPutFieldOrder(token, fields));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Adds a field to the homepage grid. It starts ticked, last in the grid. */
export async function createField(input: FieldInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminCreateField(token, input));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function updateField(slug: string, input: FieldInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminUpdateField(token, slug, input));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function deleteField(slug: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminDeleteField(token, slug));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Adds a location to the directory. It starts ticked, last in the carousel. */
export async function createLocation(input: LocationInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminCreateLocation(token, input));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function updateLocation(slug: string, input: LocationInput): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminUpdateLocation(token, slug, input));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function deleteLocation(slug: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminDeleteLocation(token, slug));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export type UploadResult = { url: string; width: number; height: number } | { error: string };

/**
 * Uploads a homepage image and returns its stored path. Nothing is saved to the
 * page until the section's own Save runs, so an upload alone changes nothing public.
 */
export async function uploadHomeImage(form: FormData): Promise<UploadResult> {
  const kind = form.get("kind");
  const file = form.get("file");
  if (kind !== "hero" && kind !== "banner" && kind !== "location" && kind !== "college" && kind !== "exam" && kind !== "practice" && kind !== "program" && kind !== "article" && kind !== "logo" && kind !== "gallery") {
    return { error: "Unknown image slot." };
  }
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image first." };
  const token = await requireAdminToken();
  try {
    return await adminUploadImage(token, kind, file);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not upload the image. Try again." };
  }
}

// ── Programmes ───────────────────────────────────────────────────────────────

/** Reads a programme form. Empty optional text is null; the API validates the rest. */
function programBody(form: FormData): Record<string, unknown> {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const orNull = (name: string) => (text(name) === "" ? null : text(name));
  return {
    name: text("name"),
    universityName: text("universityName"),
    universitySlug: text("universitySlug"),
    onlineDuration: orNull("onlineDuration"),
    onlineFees: orNull("onlineFees"),
    onlineFeesNote: orNull("onlineFeesNote"),
    onCampusDuration: orNull("onCampusDuration"),
    onCampusFees: orNull("onCampusFees"),
  };
}

export async function saveProgram(slug: string, form: FormData): Promise<AdminActionResult> {
  const result = await attempt("/admin/programs", (token) => adminUpdateProgram(token, slug, programBody(form)));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function createProgram(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const result = await attempt("/admin/programs", (token) =>
    adminCreateProgram(token, { ...programBody(form), slug: String(form.get("slug") ?? "").trim() })
  );
  return result;
}

/** Saves the homepage's recommended programmes, in display order. */
export async function saveRecommendedPrograms(slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/programs", (token) => adminSetRecommendedPrograms(token, slugs));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves the homepage's recommended colleges, in display order. */
export async function saveRecommendedUniversities(slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/homepage", (token) => adminSetUniversities(token, slugs));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/**
 * Deletes a collection. A live collection needs `confirm` set to its slug, and a
 * collection on the homepage is refused by the API.
 */
export async function deleteCollection(slug: string, confirm?: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/collections", (token) => adminDeleteCollection(token, slug, confirm));
  if ("ok" in result) revalidateCollections();
  return result;
}

/** Deletes a programme. A programme in the homepage row is refused by the API. */
export async function deleteProgram(slug: string): Promise<AdminActionResult> {
  return attempt("/admin/programs", (token) => adminDeleteProgram(token, slug));
}


// ── Practice tests ────────────────────────────────────────────────────────

/** Runs a practice call and returns its data, or the message the API gave. */
async function practiceCall<T>(call: (token: string) => Promise<T>, fallback: string): Promise<T | { error: string }> {
  const token = await requireAdminToken();
  try {
    return await call(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: fallback };
  }
}

export async function loadPracticeTests(exam: string): Promise<AdminPracticeCard[] | { error: string }> {
  return practiceCall((token) => adminListPracticeTests(token, exam), "Could not load the practice tests. Try again.");
}

export async function loadPracticeTest(slug: string) {
  return practiceCall((token) => adminGetPracticeTest(token, slug), "Could not load the test. Try again.");
}

export async function createPracticeTest(examSlug: string, title: string): Promise<{ slug: string; message: string } | { error: string }> {
  const result = await practiceCall((token) => adminCreatePracticeTest(token, { examSlug, title: title.trim() }), "Could not create the test. Try again.");
  if (!("error" in result)) revalidatePath(`/exams/${examSlug}`);
  return result;
}

export async function savePracticeTest(slug: string, examSlug: string, body: AdminPracticeTest): Promise<{ message: string } | { error: string }> {
  const result = await practiceCall((token) => adminSavePracticeTest(token, slug, body), "Could not save the test. Try again.");
  if (!("error" in result)) {
    revalidatePath(`/exams/${examSlug}`);
    revalidatePath(`/exams/${examSlug}/practice`);
  }
  return result;
}

export async function deletePracticeTest(slug: string, examSlug: string): Promise<{ message: string } | { error: string }> {
  const result = await practiceCall((token) => adminDeletePracticeTest(token, slug), "Could not delete the test. Try again.");
  if (!("error" in result)) {
    revalidatePath(`/exams/${examSlug}`);
    revalidatePath(`/exams/${examSlug}/practice`);
  }
  return result;
}

// ── Programmes, from the Recommended tab ──────────────────────────────────

function programRecord(input: ProgramInput) {
  // Empty optional text is sent as null, as the programme form does.
  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    name: input.name.trim(),
    universityName: input.universityName.trim(),
    universitySlug: input.universitySlug.trim(),
    onlineDuration: orNull(input.onlineDuration),
    onlineFees: orNull(input.onlineFees),
    onlineFeesNote: orNull(input.onlineFeesNote),
    onCampusDuration: orNull(input.onCampusDuration),
    onCampusFees: orNull(input.onCampusFees),
    isActive: input.isActive,
    image: input.image,
  };
}

/** Creates a programme (slug null) or saves one. Returns the programme's slug. */
export async function saveProgramRecord(slug: string | null, input: ProgramInput): Promise<{ slug: string } | { error: string }> {
  const address = slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (address.length < 2) return { error: "name: use letters or numbers." };
  const result = await attempt("/admin/sections/homepage", (token) =>
    slug ? adminUpdateProgram(token, slug, programRecord(input)) : adminCreateProgram(token, { slug: address, ...programRecord(input) })
  );
  if ("error" in result) return result;
  revalidatePath("/", "layout");
  return { slug: address };
}

/** Switches a programme on or off without touching its other details. */
export async function setProgramActive(slug: string, input: ProgramInput, active: boolean): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminUpdateProgram(token, slug, programRecord({ ...input, isActive: active })));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Deletes a programme. One in the homepage row is taken out of the row first, which the API insists on. */
export async function removeProgram(slug: string, rowSlugs: string[]): Promise<AdminActionResult> {
  if (rowSlugs.includes(slug)) {
    const out = await attempt("/admin/sections/homepage", (token) => adminSetRecommendedPrograms(token, rowSlugs.filter((s) => s !== slug)));
    if ("error" in out) return out;
  }
  const result = await attempt("/admin/sections/homepage", (token) => adminDeleteProgram(token, slug));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

// ── Homepage news ─────────────────────────────────────────────────────────

const articleSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function articleBody(input: ArticleInput) {
  return {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    body: input.body.trim(),
    author: input.author.trim() || "Editorial Desk",
    category: input.category.trim() || null,
    readMinutes: input.readMinutes,
    publishedAt: input.publishedAt,
    isPublished: input.isPublished,
    relatedCollegeSlugs: input.relatedCollegeSlugs,
    image: input.image,
  };
}

/** Creates an article (slug null) or saves one. Returns its slug. */
export async function saveArticle(slug: string | null, input: ArticleInput): Promise<{ slug: string } | { error: string }> {
  const address = slug ?? articleSlug(input.title);
  if (address.length < 2) return { error: "title: use letters or numbers." };
  const result = await attempt("/admin/sections/homepage", (token) =>
    slug ? adminUpdateArticle(token, slug, articleBody(input)) : adminCreateArticle(token, { slug: address, ...articleBody(input) })
  );
  if ("error" in result) return result;
  revalidatePath("/", "layout");
  return { slug: address };
}

/** Saves which articles the homepage news shows (empty: the most recent). */
export async function savePinnedNews(slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminSetPinnedNews(token, slugs));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Switches an article's published state without touching its other details. */
export async function setArticlePublished(slug: string, published: boolean): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminUpdateArticle(token, slug, { isPublished: published }));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Deletes an article. One pinned to the homepage is unpinned first. */
export async function removeArticle(slug: string, pinned: string[]): Promise<AdminActionResult> {
  if (pinned.includes(slug)) {
    const out = await attempt("/admin/sections/homepage", (token) => adminSetPinnedNews(token, pinned.filter((s) => s !== slug)));
    if ("error" in out) return out;
  }
  const result = await attempt("/admin/sections/homepage", (token) => adminDeleteArticle(token, slug));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

// ── The college record ────────────────────────────────────────────────────

export async function loadCollegeRecord(slug: string) {
  const token = await requireAdminToken();
  try {
    return await adminGetCollegeRecord(token, slug);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not load the college. Try again." };
  }
}

export async function loadCollegePools() {
  const token = await requireAdminToken();
  try {
    return await adminGetCollegePools(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not load the lists. Try again." };
  }
}

/** Saves everything the college page shows, in one go, and refreshes its pages. */
export async function saveCollegeRecord(slug: string, record: CollegeRecord): Promise<{ message: string } | { error: string }> {
  const token = await requireAdminToken();
  try {
    const saved = await adminSaveCollegeRecord(token, slug, record);
    revalidatePath(`/college/${slug}`, "layout");
    revalidatePath("/colleges");
    revalidatePath("/", "layout");
    return saved;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not save the college. Try again." };
  }
}
