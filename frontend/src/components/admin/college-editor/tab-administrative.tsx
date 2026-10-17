"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCollegeAdmin,
  loadCollegeAdmin,
  removeCollegeAdmin,
  resetCollegeAdminPassword,
  setCollegeAdminActive,
} from "@/lib/admin-actions";
import type { CollegeAdminAccount } from "@/lib/api";
import { formatFull } from "@/lib/lead-labels";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

/**
 * Administrative: who looks after this college in the admin panel.
 *
 * One College Admin per college. They sign in at the normal login page, see only
 * this college and its leads, and must replace the temporary password you give
 * them the first time. This tab acts straight away: it is not part of the
 * editor's Save.
 */
export function AdministrativeTab({ slug, institutionType }: { slug: string; institutionType: string }) {
  const [admin, setAdmin] = useState<CollegeAdminAccount | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [pending, startTransition] = useTransition();
  const noun = institutionType === "University" ? "University" : "College";

  useEffect(() => {
    let alive = true;
    loadCollegeAdmin(slug).then((result) => {
      if (!alive) return;
      if ("error" in result) setError(result.error);
      else setAdmin(result.admin);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const apply = (run: () => ReturnType<typeof createCollegeAdmin>, done: string, after?: () => void) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await run();
      if ("error" in result) return setError(result.error);
      setAdmin(result.admin);
      setNotice(done);
      after?.();
    });
  };

  if (admin === undefined && !error) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold text-ink">{noun} admin</h3>
        <p className="mt-1 text-sm text-ink-soft">
          One person can manage this {noun.toLowerCase()} from the admin panel. They see only this {noun.toLowerCase()} and the enquiries sent to it, and
          anything they change goes live only after you approve it.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm text-brand-ink">
          {notice}
        </p>
      )}

      {admin === null && (
        <form
          className="space-y-4 rounded-2xl border border-line bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            apply(() => createCollegeAdmin(slug, new FormData(form)), `The ${noun.toLowerCase()} admin account is created. Share the email and temporary password with them.`, () => form.reset());
          }}
        >
          <p className="text-sm font-semibold text-ink">No admin yet. Create one.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ca-name" className="block text-xs font-semibold text-ink">
                Full name
              </label>
              <input id="ca-name" name="name" required minLength={2} autoComplete="off" className={INPUT} />
            </div>
            <div>
              <label htmlFor="ca-email" className="block text-xs font-semibold text-ink">
                Email
              </label>
              <input id="ca-email" name="email" type="email" required autoComplete="off" className={INPUT} />
            </div>
          </div>
          <div>
            <label htmlFor="ca-password" className="block text-xs font-semibold text-ink">
              Temporary password
            </label>
            <input id="ca-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
            <p className="mt-1 text-[11px] text-ink-faint">
              At least 8 characters, with a letter and a number. They must replace it when they first sign in.
            </p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Creating…" : `Create ${noun.toLowerCase()} admin`}
          </button>
        </form>
      )}

      {admin && (
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{admin.name}</p>
              <p className="text-sm text-ink-soft">{admin.email}</p>
            </div>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                admin.isActive ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line bg-bg text-ink-faint"
              }`}
            >
              {admin.isActive ? "Active" : "Disabled"}
            </span>
          </div>

          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-ink-faint">Created</dt>
              <dd className="text-ink-soft">{formatFull(admin.createdAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-faint">Last sign-in</dt>
              <dd className="text-ink-soft">{admin.lastLoginAt ? formatFull(admin.lastLoginAt) : "Never"}</dd>
            </div>
          </dl>

          {admin.mustChangePassword && (
            <p className="rounded-lg bg-bg-alt px-3 py-2 text-xs text-ink-soft">
              Still on the temporary password. They will be asked to choose their own when they sign in.
            </p>
          )}

          {resetting ? (
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const password = String(new FormData(form).get("password") ?? "");
                apply(() => resetCollegeAdminPassword(slug, password), "A new temporary password is set. Share it with them.", () => setResetting(false));
              }}
            >
              <div>
                <label htmlFor="ca-reset" className="block text-xs font-semibold text-ink">
                  New temporary password
                </label>
                <input id="ca-reset" name="password" type="password" required minLength={8} autoComplete="new-password" className={`${INPUT} w-64`} />
              </div>
              <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {pending ? "Saving…" : "Set password"}
              </button>
              <button type="button" onClick={() => setResetting(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setResetting(true);
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand"
              >
                Reset password
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (admin.isActive && !window.confirm(`Disable ${admin.name}? They will not be able to sign in.`)) return;
                  apply(() => setCollegeAdminActive(slug, !admin.isActive), admin.isActive ? "The account is disabled." : "The account is enabled.");
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
                  admin.isActive ? "border-red-300 text-red-700 hover:bg-red-50" : "border-brand text-brand hover:bg-brand-soft"
                }`}
              >
                {admin.isActive ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Remove ${admin.name}'s account? This cannot be undone. You can then create a new admin for this ${noun.toLowerCase()}.`)) return;
                  apply(() => removeCollegeAdmin(slug), "The account is removed.");
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-red-300 hover:text-red-700 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
