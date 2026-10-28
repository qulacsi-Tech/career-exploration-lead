"use server";

import { applyMenuConfig, EMPTY_NAV, getCollegesMenu, getMenuSource } from "@/components/colleges-menu-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminResetUserPassword,
  adminApproveRequest,
  adminRejectRequest,
  adminReplyThread,
  adminResolveThread,
  type ThreadDetail,
  adminCreateAdministrator,
  adminCreateCollegeAdmin,
  adminGetCollegeAdmin,
  adminRemoveCollegeAdmin,
  adminResetCollegeAdminPassword,
  adminSetCollegeAdminActive,
  type CollegeAdminAccount,
  adminLeadJourney,
  adminReplyToLead,
  adminSetUserActive,
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
  adminPutNavMenuConfig,
  adminGetDefaultPriorities,
  adminPutCategoryPriority,
  type CategoryPrioritySection,
  adminGetCourseColleges,
  adminPutCourseColleges,
  adminPutCourseInfo,
  type CourseInfo,
  type CollegeCourseRow,
  type CourseCollegesData,
  adminSetDefaultPriorities,
  adminSetMenuPriorities,
  adminRankHolder,
  type PriorityRow,
  getColleges,
  type CollegeParams,
  adminPreviewCollection,
  type CollectionPreview,
  type NavMenuConfig,
  type NavMenuName,
  adminGetListingHeader,
  adminPutListingHeader,
  adminResetListingHeader,
  adminListingHeaderScopes,
  adminGetListingSlots,
  adminPutSiteChrome,
  type SiteChrome,
  adminPutAuthPage,
  adminResetAuthPage,
  type AuthPageCopy,
  adminGetNews,
  adminResetListingSlots,
  adminListingSlotScopes,
  adminPutListingSlots,
  type ListingSlot,
  adminGetCollegeRankings,
  adminSetCollegeRanking,
  adminRemoveCollegeRanking,
  type ListingHeader,
  type ListingPage,
  type SlotPage,
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
  adminDeleteCourses,
  adminDeletePrograms,
  adminSetUniversities,
  adminDeleteCollection,
  adminDeleteProgram,
  adminUpdateCollection,
  adminUpdateRanking,
  adminCreateSpecialisation,
  adminUpdateCourse,
  adminPutDelivery,
  adminSetOnlineOfferingEnabled,
  adminUpdateSpecialisation,
  adminDeleteSpecialisations,
  adminCreateStudyAbroadItem,
  adminUpdateLeadStatus,
  LEAD_STATUSES,
  type LeadStatus,
  adminDeleteStudyAbroadItem,
  adminReorderStudyAbroad,
  adminSetFiguresReviewed,
  adminUpdateCollege,
  adminSetCollegeStatus,
  adminDeleteCollege,
  type CollegeStatus,
  adminUpdateExam,
  adminUpdateStudyAbroadItem,
  type StudyAbroadKind,
} from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-session";
import { DEFAULT_HOME_COPY, type HomeCopy } from "@/lib/home-copy";
import { cleanSections } from "@/lib/article-sections";

/**
 * Admin writes, run as Server Actions so the session token stays on the server.
 *
 * A field left empty is not sent, so an edit never blanks a value the form
 * simply did not change. Comma-separated fields become lists. Numbers are sent
 * as typed; the API validates them and returns a message when one is wrong.
 */

export type AdminActionResult = { ok: true } | { error: string };

const COLLEGE_EDIT_FIELDS = [
  "name", "city", "state", "ownership", "stream", "institutionType", "feesRange", "about",
  "rankingRank", "rankingAuthority", "coursesOffered", "established",
  "examsAccepted", "tags", "approvals",
] as const;

const COLLEGE_CREATE_FIELDS = [
  "name", "shortName", "city", "state", "ownership", "institutionType", "feesRange", "about", "established",
] as const;

const EXAM_EDIT_FIELDS = [
  "name", "shortName", "conductingBody", "description", "registrationCloses", "examDate",
  "mode", "frequency", "applicationFee", "officialSite",
  "durationMinutes", "sections", "syllabus",
] as const;

const LIST_FIELDS: ReadonlySet<string> = new Set(["examsAccepted", "tags", "approvals", "sections"]);

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

/** What a college's pages and lists show changes with its status, so refresh them all. */
function refreshCollegePages(slug: string) {
  revalidatePath("/admin/colleges");
  revalidatePath("/colleges");
  revalidatePath(`/college/${slug}`, "layout");
  revalidatePath("/rankings", "layout");
  revalidatePath("/", "layout");
}

export async function setCollegeStatus(slug: string, status: CollegeStatus): Promise<AdminActionResult> {
  const result = await attempt("/admin/colleges", (token) => adminSetCollegeStatus(token, slug, status));
  if ("ok" in result) refreshCollegePages(slug);
  return result;
}

export async function deleteCollegeForever(slug: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/colleges", (token) => adminDeleteCollege(token, slug));
  if ("ok" in result) refreshCollegePages(slug);
  return result;
}

/** The result of adding a college: `duplicate` is set when the same name already exists in the city and the editor has not yet said to go ahead. */
export type CreateCollegeResult = AdminActionResult | { error: string; duplicate: true };

function parseCourses(raw: FormDataEntryValue | null): { name: string; specialisation: string }[] {
  try {
    const list = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(list)
      ? list.map((c) => ({ name: String(c?.name ?? "").trim(), specialisation: String(c?.specialisation ?? "").trim() })).filter((c) => c.name)
      : [];
  } catch {
    return [];
  }
}

export async function createCollege(
  _prev: CreateCollegeResult | undefined,
  form: FormData
): Promise<CreateCollegeResult> {
  const result = await attempt("/admin/colleges", (token) =>
    adminCreateCollege(token, {
      ...body(form, COLLEGE_CREATE_FIELDS),
      // One box per ticked category, and the ticked courses as JSON from the form's hidden field.
      streams: form.getAll("streams").map((v) => String(v).trim()).filter(Boolean),
      courses: parseCourses(form.get("courses")),
      slug: text(form, "slug"),
      confirmDuplicate: form.get("confirmDuplicate") === "1",
    })
  );
  if ("error" in result && result.error.startsWith("Possible duplicate")) return { error: result.error, duplicate: true };
  return result;
}

export async function saveExam(slug: string, form: FormData): Promise<AdminActionResult> {
  const payload = body(form, EXAM_EDIT_FIELDS);
  if (typeof payload.durationMinutes === "string") {
    const parsed = parseInt(payload.durationMinutes, 10);
    payload.durationMinutes = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const result = await attempt("/admin/exams", (token) =>
    adminUpdateExam(token, slug, payload)
  );
  if ("ok" in result) {
    revalidatePath("/exams");
    revalidatePath(`/exams/${slug}`);
  }
  return result;
}

export async function createExam(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const payload = body(form, EXAM_EDIT_FIELDS);
  if (typeof payload.durationMinutes === "string") {
    const parsed = parseInt(payload.durationMinutes, 10);
    payload.durationMinutes = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const result = await attempt("/admin/exams", (token) =>
    adminCreateExam(token, {
      ...payload,
      slug: text(form, "slug"),
      level: text(form, "level") || "National",
    })
  );
  if ("ok" in result) revalidatePath("/exams");
  return result;
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

/** Replies to a lead. The person sees it under My account → Replies. */
export async function replyToLead(id: string, body: string): Promise<AdminActionResult> {
  const text = body.trim();
  if (text.length < 2) return { error: "Write a reply first." };
  return attempt("/admin/leads", (token) => adminReplyToLead(token, id, text));
}

/** Creates an Admin or Super Admin account. The API allows this for a super admin only. */
export async function createAdministrator(form: FormData): Promise<AdminActionResult> {
  const str = (key: string) => String(form.get(key) ?? "").trim();
  const role = str("role") === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
  const password = String(form.get("password") ?? "");

  if (str("name").length < 2) return { error: "Enter their full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str("email"))) return { error: "Enter a valid email address." };
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return { error: "The password needs at least 8 characters, with a letter and a number." };

  return attempt("/admin/users", (token) =>
    adminCreateAdministrator(token, { name: str("name"), email: str("email").toLowerCase(), password, role }),
  );
}

// ── A college's admin account ────────────────────────────────────────────────

type CollegeAdminResult = { admin: CollegeAdminAccount | null } | { error: string };

/** Runs a call that returns the college's admin account, turning API failures into a message. */
async function collegeAdminCall(
  call: (token: string) => Promise<{ admin: CollegeAdminAccount | null }>,
  fallback: string,
): Promise<CollegeAdminResult> {
  const token = await requireAdminToken();
  try {
    return { admin: (await call(token)).admin };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: fallback };
  }
}

const PASSWORD_RULE = "The password needs at least 8 characters, with a letter and a number.";
const passwordOk = (p: string) => p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);

export async function loadCollegeAdmin(slug: string): Promise<CollegeAdminResult> {
  return collegeAdminCall((token) => adminGetCollegeAdmin(token, slug), "Could not load the college admin.");
}

export async function createCollegeAdmin(slug: string, form: FormData): Promise<CollegeAdminResult> {
  const str = (key: string) => String(form.get(key) ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (str("name").length < 2) return { error: "Enter their full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str("email"))) return { error: "Enter a valid email address." };
  if (!passwordOk(password)) return { error: PASSWORD_RULE };
  return collegeAdminCall(
    (token) => adminCreateCollegeAdmin(token, slug, { name: str("name"), email: str("email").toLowerCase(), password }),
    "Could not create the account.",
  );
}

export async function resetCollegeAdminPassword(slug: string, password: string): Promise<CollegeAdminResult> {
  if (!passwordOk(password)) return { error: PASSWORD_RULE };
  return collegeAdminCall((token) => adminResetCollegeAdminPassword(token, slug, password), "Could not reset the password.");
}

export async function setCollegeAdminActive(slug: string, isActive: boolean): Promise<CollegeAdminResult> {
  return collegeAdminCall((token) => adminSetCollegeAdminActive(token, slug, isActive), "Could not change the account.");
}

export async function removeCollegeAdmin(slug: string): Promise<CollegeAdminResult> {
  return collegeAdminCall((token) => adminRemoveCollegeAdmin(token, slug), "Could not remove the account.");
}

/** Sets a temporary password for someone who cannot sign in. They must choose their own at next sign-in. */
export async function resetUserPassword(id: string, password: string): Promise<AdminActionResult> {
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return { error: "The password needs at least 8 characters, with a letter and a number." };
  return attempt("/admin/users", (token) => adminResetUserPassword(token, id, password));
}

/** Turns an account off or back on. */
export async function setUserActive(id: string, isActive: boolean): Promise<AdminActionResult> {
  return attempt("/admin/users", (token) => adminSetUserActive(token, id, isActive));
}

/** What the person behind a lead did on the site. Read on demand, when an admin opens the details. */
export async function loadLeadJourney(id: string): Promise<{ journey: Awaited<ReturnType<typeof adminLeadJourney>> } | { error: string }> {
  const token = await requireAdminToken();
  try {
    return { journey: await adminLeadJourney(token, id) };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    return { error: "Could not load their activity." };
  }
}

// ── Courses and specialisations ──────────────────────────────────────────────

/** The parents ticked on a catalogue form: one name or slug per checked box. */
const ticked = (form: FormData, field: string) => form.getAll(field).map((v) => String(v).trim()).filter(Boolean);

const DELIVERIES = ["offline", "online", "both"] as const;
type DeliveryValue = (typeof DELIVERIES)[number];

/** How a record is taught, from its radio group. Missing or odd: undefined, so the server keeps what it has. */
function deliveryOf(form: FormData): DeliveryValue | undefined {
  const value = String(form.get("delivery") ?? "");
  return (DELIVERIES as readonly string[]).includes(value) ? (value as DeliveryValue) : undefined;
}

/** The per-child choices on an edit form (`child:<slug>`), as slug to delivery. */
function childDeliveries(form: FormData): Record<string, DeliveryValue> {
  const out: Record<string, DeliveryValue> = {};
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("child:") || !(DELIVERIES as readonly string[]).includes(String(value))) continue;
    out[key.slice("child:".length)] = String(value) as DeliveryValue;
  }
  return out;
}

/** Saves the children's delivery after their parent was saved. Nothing to save: nothing is sent. */
async function saveChildren(children: Record<string, DeliveryValue>, kind: "courses" | "specialisations"): Promise<AdminActionResult> {
  if (Object.keys(children).length === 0) return { ok: true } as AdminActionResult;
  return attempt("/admin/catalogue", (token) => adminPutDelivery(token, { [kind]: children }));
}

export async function saveCourse(slug: string, form: FormData): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminUpdateCourse(token, slug, { name: String(form.get("name") ?? "").trim(), streams: ticked(form, "streams"), delivery: deliveryOf(form) })
  );
  if (!("ok" in result)) return result;
  const children = await saveChildren(childDeliveries(form), "specialisations");
  revalidatePath("/courses", "layout");
  return children;
}

/** Saves which category comes first in one homepage section. */
export async function saveCategoryPriority(section: CategoryPrioritySection, order: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/homepage", (token) => adminPutCategoryPriority(token, section, order));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves the info typed for a course: what its card shows. An empty field is cleared and not shown. */
export async function saveCourseInfo(slug: string, info: CourseInfo): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) => adminPutCourseInfo(token, slug, info));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** The colleges and what each says about a course, for the Colleges tab of the course editor. */
export async function loadCourseColleges(slug: string): Promise<CourseCollegesData | { error: string }> {
  const token = await requireAdminToken();
  try {
    return await adminGetCourseColleges(token, slug);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    return { error: "Could not load the colleges. Try again." };
  }
}

/** Saves which colleges teach a course and each one's duration, mode, fees and exams. */
export async function saveCourseColleges(slug: string, colleges: { slug: string; rows: CollegeCourseRow[] }[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) => adminPutCourseColleges(token, slug, colleges));
  if ("ok" in result) {
    revalidatePath("/courses", "layout");
    revalidatePath("/colleges", "layout");
    revalidatePath("/admin/colleges");
  }
  return result;
}

/** The names typed on an add form: the chips and whatever is still in the box, once each. */
function typedNames(form: FormData): string[] {
  const seen = new Map<string, string>();
  for (const value of form.getAll("name")) {
    const name = String(value).trim();
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()];
}

/** Adds one record for each name, all under the same parents. Stops at the first refusal and says what was added before it. */
async function createEach(
  names: string[],
  create: (name: string) => Promise<AdminActionResult>,
  noun: string
): Promise<AdminActionResult> {
  if (names.length === 0) return { error: `Enter a ${noun} name.` };
  let added = 0;
  for (const name of names) {
    const result = await create(name);
    if ("error" in result) {
      return { error: added > 0 ? `${added} of ${names.length} added. '${name}': ${result.error}` : result.error };
    }
    added += 1;
  }
  revalidatePath("/courses", "layout");
  return { ok: true };
}

export async function createCourse(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const streams = ticked(form, "streams");
  return createEach(typedNames(form), (name) => attempt("/admin/catalogue", (token) => adminCreateCourse(token, { name, streams, delivery: deliveryOf(form) })), "course");
}

export async function deleteCourses(slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) => adminDeleteCourses(token, slugs));
  if ("ok" in result) revalidatePath("/courses", "layout");
  return result;
}

export async function deletePrograms(slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/programs", (token) => adminDeletePrograms(token, slugs));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

export async function saveSpecialisation(slug: string, form: FormData): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminUpdateSpecialisation(token, slug, { name: String(form.get("name") ?? "").trim(), courseSlugs: ticked(form, "courseSlugs"), delivery: deliveryOf(form) })
  );
  if ("ok" in result) revalidatePath("/courses", "layout");
  return result;
}

export async function deleteSpecialisations(slugs: string[]): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) => adminDeleteSpecialisations(token, slugs));
  if ("ok" in result) revalidatePath("/courses", "layout");
  return result;
}

/**
 * A category is a homepage field underneath (its page address, /<slug>/colleges, is what the college lists
 * hang off). The short description is the field's tagline, shown on the disc; the "show on homepage" box is
 * its tick in the homepage grid. Icon, badge and average CTC are left to the Homepage sections screen.
 */
export async function createCategory(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminCreateField(token, {
      name: String(form.get("name") ?? "").trim(),
      icon: "book-open",
      tagline: String(form.get("tagline") ?? "").trim(),
      badge: "",
      avgCtc: "",
      show: form.has("show"),
      delivery: deliveryOf(form),
    })
  );
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}

/** Saves the description and the homepage tick. The name stays, and so do the icon, badge and CTC set elsewhere. */
export async function saveCategory(
  current: { slug: string; name: string; icon: string; badge: string; avgCtc: string },
  form: FormData
): Promise<AdminActionResult> {
  const result = await attempt("/admin/catalogue", (token) =>
    adminUpdateField(token, current.slug, {
      name: current.name,
      icon: current.icon,
      tagline: String(form.get("tagline") ?? "").trim(),
      badge: current.badge,
      avgCtc: current.avgCtc,
      show: form.has("show"),
      delivery: deliveryOf(form),
    })
  );
  if (!("ok" in result)) return result;
  const children = await saveChildren(childDeliveries(form), "courses");
  revalidatePath("/", "layout");
  revalidatePath("/courses", "layout");
  return children;
}

export async function deleteCategories(slugs: string[]): Promise<AdminActionResult> {
  for (const slug of slugs) {
    const result = await attempt("/admin/catalogue", (token) => adminDeleteField(token, slug));
    if (!("ok" in result)) return result;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createSpecialisation(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  const courseSlugs = ticked(form, "courseSlugs");
  return createEach(
    typedNames(form),
    (name) => attempt("/admin/catalogue", (token) => adminCreateSpecialisation(token, { name, courseSlugs, delivery: deliveryOf(form) })),
    "specialisation"
  );
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
      shortName: String(form.get("shortName") ?? "").trim(),
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

/**
 * The collection form keeps all of its state in one hidden `payload` field (filters, picked colleges,
 * header, SEO and placements), so a tab that is not on screen is still saved. The API checks it.
 */
function collectionBody(form: FormData): { value: Record<string, unknown> } | { error: string } {
  try {
    const value = JSON.parse(String(form.get("payload") ?? ""));
    if (value && typeof value === "object" && !Array.isArray(value)) return { value };
  } catch {
    // fall through
  }
  return { error: "The collection could not be read. Reload the page and try again." };
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
    adminCreateCollection(token, body.value)
  );
  if ("ok" in result) revalidateCollections();
  return result;
}

/** How many published colleges a membership would hold right now, for the live count in the collection form. */
export async function previewCollection(body: Record<string, unknown>): Promise<CollectionPreview | { error: string }> {
  const token = await requireAdminToken();
  try {
    return await adminPreviewCollection(token, body);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not count the colleges." };
  }
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
    shortName: input.shortName.trim(),
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
    statusLabel: input.statusLabel.trim(),
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

/** Every college with its default priority, in the order the lists show them now. */
export async function loadDefaultPriorities(): Promise<{ colleges: PriorityRow[] } | { error: string }> {
  const token = await requireAdminToken();
  try {
    return { colleges: await adminGetDefaultPriorities(token) };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    return { error: "Could not load the colleges. Try again." };
  }
}

function revalidateListings() {
  revalidatePath("/colleges", "layout");
  revalidatePath("/", "layout");
}

/** Saves the default priority of each college named: a whole number, or null to clear it. */
export async function saveDefaultPriorities(priorities: Record<string, number | null>): Promise<AdminActionResult> {
  const result = await attempt("/admin/colleges", (token) => adminSetDefaultPriorities(token, priorities));
  if ("ok" in result) revalidateListings();
  return result;
}

/** Saves the priorities of the institutes in one header-menu link's list. `menu` is "<category id>:<link key>". */
export async function saveMenuPriorities(menu: string, priority: Record<string, number>): Promise<AdminActionResult> {
  const result = await attempt("/admin/colleges", (token) => adminSetMenuPriorities(token, menu, priority));
  if ("ok" in result) revalidateListings();
  return result;
}

/** Who already holds a rank in a ranking list, for the warning shown while a rank is typed. */
export async function checkRankHolder(list: string, rank: number, exclude: string): Promise<{ holder: { slug: string; name: string } | null; list: string } | { error: string }> {
  const token = await requireAdminToken();
  try {
    return await adminRankHolder(token, list, rank, exclude);
  } catch {
    return { error: "Could not check the rank." };
  }
}

/** The institutes a menu link opens by default, for the eye dialog where some can be left out. Read from the same listing the visitor gets. */
export async function loadLinkInstitutes(href: string): Promise<{ colleges: { slug: string; name: string; city: string }[]; truncated: boolean } | { error: string }> {
  await requireAdminToken();
  try {
    const query = new URLSearchParams(href.split("?")[1] ?? "");
    const get = (k: string) => query.get(k) ?? undefined;
    const base: CollegeParams = {
      stream: get("stream"), course: get("course"), specialisation: get("specialisation"), city: get("city"),
      ownership: get("ownership"), level: get("level"), credential: get("credential"), mode: get("mode"),
      exam: get("exam"), approval: get("approval"), ranking_list: get("ranking_list"), collection: get("collection"),
    };
    const colleges: { slug: string; name: string; city: string }[] = [];
    let pages = 1;
    for (let page = 1; page <= Math.min(pages, 5); page++) {
      const result = await getColleges({ ...base, page, limit: 100 });
      pages = result.meta.pages;
      colleges.push(...result.data.map((c) => ({ slug: c.slug, name: c.name, city: c.city })));
    }
    return { colleges, truncated: pages > 5 };
  } catch {
    return { error: "Could not load the institutes. Try again." };
  }
}

/** Saves what the admin decided about the header's colleges menu: shown or hidden, order, names and SEO. */
export async function saveNavMenu(config: NavMenuConfig, menu: NavMenuName = "colleges"): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/navigation", (token) => adminPutNavMenuConfig(token, config, menu));
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
  if (kind !== "hero" && kind !== "banner" && kind !== "location" && kind !== "college" && kind !== "exam" && kind !== "practice" && kind !== "program" && kind !== "article" && kind !== "article_figure" && kind !== "logo" && kind !== "site_logo" && kind !== "gallery") {
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

/**
 * Adds one programme for each institution ticked on the add form: the chosen course (and specialisation)
 * at that institution, with the figures shown for it. Stops at the first refusal and says what was added
 * before it, so those are not entered twice.
 */
export async function createPrograms(
  _prev: AdminActionResult | undefined,
  form: FormData
): Promise<AdminActionResult> {
  type Item = { slug: string; name: string; onlineDuration: string; onlineFees: string; onCampusDuration: string; onCampusFees: string };
  let payload: { course?: string; specialisation?: string; items?: Item[] };
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return { error: "Could not read the form. Try again." };
  }
  const course = String(payload.course ?? "").trim();
  const specialisation = String(payload.specialisation ?? "").trim();
  const items = payload.items ?? [];
  if (!course) return { error: "Choose a course." };
  if (items.length === 0) return { error: "Tick at least one institution." };

  const title = specialisation ? `${course} ${specialisation}` : course;
  const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const orNull = (v: string) => (String(v ?? "").trim() === "" ? null : String(v).trim());

  let added = 0;
  for (const item of items) {
    const result = await attempt("/admin/programs", (token) =>
      adminCreateProgram(token, {
        name: title,
        slug: `${slugBase}-${item.slug}`.slice(0, 200),
        universityName: item.name,
        universitySlug: item.slug,
        onlineDuration: orNull(item.onlineDuration),
        onlineFees: orNull(item.onlineFees),
        onlineFeesNote: null,
        onCampusDuration: orNull(item.onCampusDuration),
        onCampusFees: orNull(item.onCampusFees),
      })
    );
    if ("error" in result) {
      return { error: `${added > 0 ? `${added} of ${items.length} added. ` : ""}${item.name}: ${result.error}` };
    }
    added += 1;
  }
  revalidatePath("/", "layout");
  return { ok: true };
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
export async function saveProgramRecord(slug: string | null, input: ProgramInput, newAddress?: string): Promise<{ slug: string } | { error: string }> {
  const address = slug ?? newAddress ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  const sections = cleanSections(input.sections);
  return {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    // The sections are the page; the old plain text is only kept for an article with none.
    body: sections.length ? "" : input.body.trim(),
    sections,
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

/** The header of a listing page, or of one selection from the colleges menu (`scope`, e.g. "course=MBA"), for its admin dialog. */
export async function loadListingHeader(page: ListingPage, scope?: string) {
  const token = await requireAdminToken();
  try {
    return await adminGetListingHeader(token, page, scope);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not load the page header. Try again." };
  }
}

export async function saveListingHeader(page: ListingPage, value: ListingHeader, scope?: string): Promise<AdminActionResult> {
  const result = await attempt(`/admin/${page}`, (token) => adminPutListingHeader(token, page, value, scope));
  if ("ok" in result) revalidatePath(`/${page}`);
  return result;
}

/** Give a selection back the page's own header. */
export async function resetListingHeader(page: ListingPage, scope: string): Promise<AdminActionResult> {
  const result = await attempt(`/admin/${page}`, (token) => adminResetListingHeader(token, page, scope));
  if ("ok" in result) revalidatePath(`/${page}`);
  return result;
}

/** What the header dialog offers to edit: every selection in the colleges menu, and which already have their own header. */
export async function loadHeaderTargets(page: ListingPage) {
  const token = await requireAdminToken();
  // Only the colleges page has menu selections to write items for.
  if (page !== "colleges") return { groups: [], custom: [] as string[] };
  try {
    const [groups, custom] = await Promise.all([getMenuSource(EMPTY_NAV, false).then((source) => applyMenuConfig(source, EMPTY_NAV, Infinity)), adminListingHeaderScopes(token, page)]);
    return { groups, custom };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    return { error: "Could not load the menu selections. Try again." };
  }
}

/** What the slots dialog can edit: every selection in the colleges menu, and which already have a set of their own. */
export async function loadSlotTargets(page: SlotPage) {
  const token = await requireAdminToken();
  try {
    const [groups, custom] = await Promise.all([getMenuSource(EMPTY_NAV, false).then((source) => applyMenuConfig(source, EMPTY_NAV, Infinity)), adminListingSlotScopes(token, page)]);
    return { groups, custom };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    return { error: "Could not load the menu selections. Try again." };
  }
}

/** The banners, filter strips and ads between the colleges for the page or one selection, for the manager dialog (with the menu's options, for the preview chips). */
export async function loadListingSlots(page: SlotPage, scope?: string) {
  const token = await requireAdminToken();
  try {
    const [{ slots, custom }, groups] = await Promise.all([adminGetListingSlots(token, page, scope), page === "colleges" ? getCollegesMenu(8) : Promise.resolve([])]);
    // The story page's items are assigned to stories, so the dialog needs the list to choose from.
    const stories = page === "article" ? (await adminGetNews(token)).articles.map((a) => ({ slug: a.slug, title: a.title })) : [];
    return { slots, custom, groups, stories };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not load the banners and ads. Try again." };
  }
}

/** The public address a page's banners and ads show on. */
const slotPath = (page: SlotPage) => (page === "colleges" ? "/colleges" : "/articles");

export async function saveListingSlots(page: SlotPage, slots: ListingSlot[], scope?: string): Promise<AdminActionResult> {
  const result = await attempt(`/admin/${page}`, (token) => adminPutListingSlots(token, page, slots, scope));
  if ("ok" in result) {
    revalidatePath(slotPath(page), "layout");
    // The story pages are built ahead of time, one per story, so they are named too.
    if (page === "article") revalidatePath("/articles/[slug]", "page");
  }
  return result;
}

/** Give a selection back the page's own banners, filters and ads. */
export async function resetListingSlots(page: SlotPage, scope: string): Promise<AdminActionResult> {
  const result = await attempt(`/admin/${page}`, (token) => adminResetListingSlots(token, page, scope));
  if ("ok" in result) revalidatePath(slotPath(page), "layout");
  return result;
}

// ── A college's rankings, edited from its editor. Each change is saved at once. ──

function refreshRankings(collegeSlug: string) {
  revalidatePath("/rankings", "layout");
  revalidatePath("/colleges");
  revalidatePath(`/college/${collegeSlug}`, "layout");
  revalidatePath("/", "layout");
}

export async function loadCollegeRankings(collegeSlug: string) {
  const token = await requireAdminToken();
  try {
    return await adminGetCollegeRankings(token, collegeSlug);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Could not load the rankings. Try again." };
  }
}

export async function setCollegeRanking(listSlug: string, collegeSlug: string, rank: number, score: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/colleges", (token) =>
    adminSetCollegeRanking(token, listSlug, collegeSlug, { rank, score: score.trim() || null }),
  );
  if ("ok" in result) refreshRankings(collegeSlug);
  return result;
}

export async function removeCollegeRanking(listSlug: string, collegeSlug: string): Promise<AdminActionResult> {
  const result = await attempt("/admin/colleges", (token) => adminRemoveCollegeRanking(token, listSlug, collegeSlug));
  if ("ok" in result) refreshRankings(collegeSlug);
  return result;
}

// ── Reviewing college admins' changes, and answering their messages ──────────

/** Approving writes the edit to the live college, so the public pages are refreshed straight away. */
export async function approveChangeRequest(
  id: string,
  acknowledgeStale = false,
): Promise<{ ok: true; collegeSlug: string } | { error: string; stale?: boolean }> {
  const token = await requireAdminToken();
  try {
    const result = await adminApproveRequest(token, id, acknowledgeStale);
    revalidatePath(`/college/${result.collegeSlug}`, "layout");
    revalidatePath("/colleges");
    revalidatePath("/", "layout");
    revalidatePath("/admin/approvals");
    return { ok: true, collegeSlug: result.collegeSlug };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message, stale: err.status === 409 && /changed after/i.test(err.message) };
    return { error: "Could not approve. Try again." };
  }
}

export async function rejectChangeRequest(id: string, note: string): Promise<AdminActionResult> {
  if (note.trim().length < 3) return { error: "Say why, so the college admin knows what to fix." };
  return attempt("/admin/approvals", (token) => adminRejectRequest(token, id, note.trim()));
}

type ThreadResult = { thread: ThreadDetail } | { error: string };

async function threadCall(call: (token: string) => Promise<ThreadDetail>, fallback: string): Promise<ThreadResult> {
  const token = await requireAdminToken();
  try {
    const thread = await call(token);
    revalidatePath("/admin/messages");
    return { thread };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    return { error: fallback };
  }
}

export async function replyToThread(id: string, body: string): Promise<ThreadResult> {
  if (body.trim().length < 2) return { error: "Write your reply first." };
  return threadCall((t) => adminReplyThread(t, id, body.trim()), "Could not send the reply.");
}

export async function resolveThreadAction(id: string): Promise<ThreadResult> {
  return threadCall((t) => adminResolveThread(t, id), "Could not mark it handled.");
}

/** Shows or hides one online programme on the site. The college keeps its entry either way. */
export async function setOnlineOfferingEnabled(id: string, enabled: boolean): Promise<AdminActionResult> {
  const result = await attempt("/admin/programs", (token) => adminSetOnlineOfferingEnabled(token, id, enabled));
  if ("ok" in result) {
    revalidatePath("/colleges", "layout");
    revalidatePath("/college", "layout");
  }
  return result;
}

// ── Log in and sign up pages ──

export async function saveAuthPage(page: "login" | "signup", value: AuthPageCopy): Promise<AdminActionResult> {
  const result = await attempt("/admin/auth-pages", (token) => adminPutAuthPage(token, page, value));
  if ("ok" in result) revalidatePath(page === "login" ? "/login" : "/register");
  return result;
}

export async function resetAuthPage(page: "login" | "signup"): Promise<AdminActionResult> {
  const result = await attempt("/admin/auth-pages", (token) => adminResetAuthPage(token, page));
  if ("ok" in result) revalidatePath(page === "login" ? "/login" : "/register");
  return result;
}

// ── Header and footer arrangement ──

export async function saveSiteChrome(value: SiteChrome): Promise<AdminActionResult> {
  const result = await attempt("/admin/sections/navigation", (token) => adminPutSiteChrome(token, value));
  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}
