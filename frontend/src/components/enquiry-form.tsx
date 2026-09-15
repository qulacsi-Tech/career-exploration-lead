"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";

type Option = { slug: string; name: string };
type FieldErrors = Partial<Record<"name" | "phone" | "email" | "stream" | "consent", string>>;

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none";

/** Border and ring depend on whether the field is currently in error. */
function fieldClass(invalid?: string) {
  return `${FIELD_CLASS} ${
    invalid ? "border-red-500 focus:border-red-500" : "border-line focus:border-brand"
  }`;
}

/**
 * The counselling enquiry form.
 *
 * Previously a static `<form>` that posted nowhere and admitted so in small
 * print. It now posts JSON to `/api/enquiry` and reports what happened.
 *
 * ## Validation runs here *and* on the server
 *
 * Here, because a field-level message next to the input is the only useful
 * error; there, because these checks are a convenience the client can skip.
 * Neither is redundant.
 *
 * ## What happens on failure
 *
 * The form keeps everything typed. A failed submission that clears the form is
 * worse than no form at all — it asks the visitor to do the work twice and
 * loses the lead the second time they decline. Field errors focus the first
 * offending input; transport failures show a retry banner and leave the values
 * alone.
 */
export function EnquiryForm({ streams, cities }: { streams: Option[]; cities: Option[] }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const validate = (data: Record<string, FormDataEntryValue | null>): FieldErrors => {
    const next: FieldErrors = {};
    const str = (key: string) => String(data[key] ?? "").trim();

    if (str("name").length < 2) next.name = "Enter your full name.";

    const phone = str("phone").replace(/[\s-()]/g, "");
    if (!phone) next.phone = "Enter a mobile number we can call you on.";
    else if (!/^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/.test(phone))
      next.phone = "That does not look like a valid number.";

    const email = str("email");
    if (!email) next.email = "Enter an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      next.email = "That does not look like a valid email.";

    if (!str("stream")) next.stream = "Pick the stream you are interested in.";
    if (data.consent === null) next.consent = "We need your consent before a counsellor can call.";

    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());

    const found = validate(raw);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Send focus to the first problem rather than leaving the visitor to
      // hunt for the red text.
      const firstKey = Object.keys(found)[0];
      form.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...raw, consent: raw.consent !== null, source: "enquiry-page" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload.errors) {
          setErrors(payload.errors as FieldErrors);
          setStatus("idle");
          return;
        }
        throw new Error(payload.message ?? "Request failed");
      }

      setReference(payload.reference ?? null);
      setStatus("done");
      // Move focus to the confirmation: the form it replaces is gone, and a
      // screen reader would otherwise be left on a button that no longer exists.
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      console.error("Enquiry submission failed", error);
      setFormError(
        error instanceof Error && error.message !== "Request failed"
          ? error.message
          : "We could not submit that just now. Please check your connection and try again."
      );
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="mt-8 rounded-2xl border border-brand/30 bg-brand-soft p-8 focus:outline-none"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
          <CheckCircle2 className="h-5 w-5" />
        </span>

        <h2 className="mt-4 font-display text-xl font-bold text-brand-ink">
          Request received — we will call you back
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink/90">
          A counsellor usually calls within one working day, on the number you gave us. Keep an eye
          on your email as well: the shortlist goes there.
        </p>

        {reference && (
          <p className="mt-4 text-xs text-brand-ink/80">
            Your reference: <span className="font-mono font-semibold">{reference}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/colleges"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Browse colleges while you wait
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="rounded-full border border-brand/30 px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-white"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const busy = status === "submitting";

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 rounded-2xl border border-line bg-surface p-6">
      {formError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="lead-name" name="name" label="Full name" error={errors.name}>
          <input
            id="lead-name"
            name="name"
            placeholder="Priya Sharma"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "lead-name-error" : undefined}
            className={fieldClass(errors.name)}
          />
        </Field>

        <Field id="lead-phone" name="phone" label="Mobile number" error={errors.phone}>
          <input
            id="lead-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "lead-phone-error" : undefined}
            className={fieldClass(errors.phone)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="lead-email" name="email" label="Email" error={errors.email}>
            <input
              id="lead-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "lead-email-error" : undefined}
              className={fieldClass(errors.email)}
            />
          </Field>
        </div>

        <Field id="lead-stream" name="stream" label="Interested in" error={errors.stream}>
          <select
            id="lead-stream"
            name="stream"
            defaultValue=""
            aria-invalid={!!errors.stream}
            aria-describedby={errors.stream ? "lead-stream-error" : undefined}
            className={fieldClass(errors.stream)}
          >
            <option value="" disabled>
              Select a stream
            </option>
            {streams.map((stream) => (
              <option key={stream.slug} value={stream.slug}>
                {stream.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id="lead-city" name="city" label="Preferred city">
          <select id="lead-city" name="city" defaultValue="" className={fieldClass()}>
            <option value="">No preference</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <label htmlFor="lead-message" className="block text-xs font-semibold text-ink">
            Anything else? <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <textarea
            id="lead-message"
            name="message"
            rows={3}
            maxLength={1000}
            placeholder="Expected CAT percentile, budget, or a college you already have in mind."
            className={fieldClass()}
          />
        </div>
      </div>

      {/* Honeypot: off-screen and hidden from assistive tech, so only a bot
          fills it. Not `display:none` — some bots skip those. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="lead-company">Company</label>
        <input id="lead-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-4">
        <label className="flex items-start gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            name="consent"
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? "lead-consent-error" : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand"
          />
          <span>I agree to be contacted about admissions by phone, email and WhatsApp.</span>
        </label>
        {errors.consent && (
          <p id="lead-consent-error" className="mt-1 text-xs text-red-700">
            {errors.consent}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Sending…" : "Request a Callback"}
      </button>

      <p className="mt-3 text-[11px] text-ink-faint">
        We use these details only to arrange counselling. No spam, and you can ask us to delete them
        at any time.
      </p>
    </form>
  );
}

/** Label, control and error message, wired together by id. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
