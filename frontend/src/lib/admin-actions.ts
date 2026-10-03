"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  adminCreateCollege,
  adminCreateExam,
  adminUpdateCollege,
  adminUpdateExam,
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
