"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { StateCityFields } from "@/components/admin/state-city-fields";
import { saveProfile } from "@/lib/auth-actions";
import type { IndiaGeo, Profile } from "@/lib/api";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

type Option = { slug: string; name: string };

/**
 * The editable part of the student's record. Email is shown on the page, not editable here.
 *
 * State, city, stream and exam are all dropdowns fed by the same data the admin
 * panel and the rest of the site use, so a student can only pick what exists.
 */
export function ProfileForm({
  profile,
  geo,
  streams,
  exams,
}: {
  profile: Profile;
  geo: IndiaGeo;
  streams: Option[];
  exams: Option[];
}) {
  const [state, formAction, pending] = useActionState(saveProfile, undefined);

  // A value saved earlier that is no longer in the list still shows, so saving does not silently drop it.
  const withSaved = (options: Option[], saved: string | null) =>
    saved && !options.some((o) => o.slug === saved) ? [...options, { slug: saved, name: saved }] : options;

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-name" className="block text-xs font-semibold text-ink">
            Full name
          </label>
          <input id="acc-name" name="name" required minLength={2} defaultValue={profile.name} autoComplete="name" className={INPUT} />
        </div>

        <div>
          <label htmlFor="acc-phone" className="block text-xs font-semibold text-ink">
            Mobile number
          </label>
          <input
            id="acc-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={profile.phone ?? ""}
            autoComplete="tel"
            placeholder="+91 98765 43210"
            className={INPUT}
          />
        </div>

        <StateCityFields geo={geo} defaultState={profile.state ?? ""} defaultCity={profile.city ?? ""} required={false} />

        <div>
          <label htmlFor="acc-stream" className="block text-xs font-semibold text-ink">
            Stream you are interested in
          </label>
          <select id="acc-stream" name="preferredStream" defaultValue={profile.preferredStream ?? ""} className={INPUT}>
            <option value="">Select a stream</option>
            {withSaved(streams, profile.preferredStream).map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="acc-exam" className="block text-xs font-semibold text-ink">
            Exam you are preparing for
          </label>
          <select id="acc-exam" name="targetExam" defaultValue={profile.targetExam ?? ""} className={INPUT}>
            <option value="">Select an exam</option>
            {withSaved(exams, profile.targetExam).map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          name="marketingConsent"
          defaultChecked={profile.marketingConsent}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand"
        />
        <span>Send me admission updates, exam alerts and counselling offers.</span>
      </label>

      {state?.error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="mt-4 flex items-center gap-1.5 text-sm font-medium text-brand-ink">
          <CheckCircle2 className="h-4 w-4" />
          Your details are saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
