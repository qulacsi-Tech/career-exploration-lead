import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { homeStreams, locations } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Get Free Counselling",
  description:
    "Tell us what you are looking for and an admission counsellor will call you back with a shortlist.",
  // A lead form has nothing to rank for and should not compete with the
  // content pages that feed it.
  robots: { index: false, follow: true },
};

/**
 * The enquiry form every CTA on the site points at.
 *
 * It existed as a dangling link on the college pages, listings and article
 * sidebars — the one route the whole funnel converges on, 404ing. It posts
 * nowhere yet, like every other form here, but the shape of what gets captured
 * is a decision worth making now: it is the lead record the CRM integration in
 * Phase 2 has to match.
 */
const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

export default function EnquiryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Get counselling" }]} />

      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
        Get Free Counselling
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Tell us what you are looking for and an admission counsellor will call you
        back — usually within a working day — with a shortlist of colleges that fit
        your score, budget and preferred city.
      </p>

      <form className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-name" className="block text-xs font-semibold text-ink">
              Full name
            </label>
            <input id="lead-name" name="name" required placeholder="Priya Sharma" className={FIELD_CLASS} />
          </div>

          <div>
            <label htmlFor="lead-phone" className="block text-xs font-semibold text-ink">
              Mobile number
            </label>
            <input
              id="lead-phone"
              name="phone"
              type="tel"
              required
              inputMode="tel"
              placeholder="+91 98765 43210"
              className={FIELD_CLASS}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-email" className="block text-xs font-semibold text-ink">
              Email
            </label>
            <input
              id="lead-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="lead-stream" className="block text-xs font-semibold text-ink">
              Interested in
            </label>
            <select id="lead-stream" name="stream" className={FIELD_CLASS} defaultValue="">
              <option value="" disabled>
                Select a stream
              </option>
              {homeStreams.map((stream) => (
                <option key={stream.slug} value={stream.slug}>
                  {stream.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lead-city" className="block text-xs font-semibold text-ink">
              Preferred city
            </label>
            <select id="lead-city" name="city" className={FIELD_CLASS} defaultValue="">
              <option value="">No preference</option>
              {locations.map((location) => (
                <option key={location.slug} value={location.slug}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-message" className="block text-xs font-semibold text-ink">
              Anything else? <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <textarea
              id="lead-message"
              name="message"
              rows={3}
              placeholder="Expected CAT percentile, budget, or a college you already have in mind."
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand"
          />
          <span>
            I agree to be contacted about admissions by phone, email and WhatsApp.
          </span>
        </label>

        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark sm:w-auto sm:px-8"
        >
          Request a Callback
        </button>

        <p className="mt-3 text-[11px] text-ink-faint">
          Nothing is submitted yet — the leads endpoint does not exist in this build.
        </p>
      </form>
    </div>
  );
}
