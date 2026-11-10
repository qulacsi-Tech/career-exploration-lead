"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { loadNewsletterStatus, subscribeToNewsletter, unsubscribeFromNewsletter } from "@/lib/newsletter-actions";
import { emailProblem } from "@/lib/field-rules";

/** The address this browser subscribed with, so the footer can show "You are subscribed" on later visits. */
const STORAGE_KEY = "newsletter-email";

function remembered(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function remember(email: string | null) {
  try {
    if (email) window.localStorage.setItem(STORAGE_KEY, email);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the form then simply does not remember the address.
  }
}

/**
 * The footer's "Subscribe" box. Anyone can subscribe with an email address, signed in or not. The address is saved
 * for the weekly updates, and an account is made for it if there is none. Once subscribed, the box says so and
 * offers Unsubscribe instead of the form.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [subscribedAs, setSubscribedAs] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  // Leaving takes two steps: 0 = closed, 1 = "are you sure", 2 = the final confirmation.
  const [leaving, setLeaving] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading what this browser remembered, once
    setSubscribedAs(remembered());
    // A signed-in visitor's own account decides, on any browser; the remembered address is only for visitors who are not.
    loadNewsletterStatus().then((status) => {
      if (!current || !status) return;
      if (status.subscribed) {
        remember(status.email);
        setSubscribedAs(status.email);
      } else {
        remember(null);
        setSubscribedAs("");
        setEmail((typed) => typed || status.email);
      }
    });
    return () => {
      current = false;
    };
  }, []);

  const subscribe = async () => {
    setPending(true);
    try {
      const address = email.trim().toLowerCase();
      const result = await subscribeToNewsletter(address);
      if (result.ok) {
        remember(address);
        setSubscribedAs(address);
        setEmail("");
        setNote(null);
      } else {
        setNote({ ok: false, text: result.message });
      }
    } catch {
      setNote({ ok: false, text: "We could not subscribe you just now. Please try again." });
    } finally {
      setPending(false); // always stop the spinner, whatever happened
    }
  };

  const unsubscribe = async () => {
    setPending(true);
    try {
      const result = await unsubscribeFromNewsletter(subscribedAs);
      if (result.ok) {
        remember(null);
        setSubscribedAs("");
        setLeaving(0);
        setNote({ ok: true, text: "You have been unsubscribed. You can subscribe again any time." });
      } else {
        setLeaving(0);
        setNote({ ok: false, text: result.message });
      }
    } catch {
      setNote({ ok: false, text: "We could not unsubscribe you just now. Please try again." });
    } finally {
      setPending(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = emailProblem(email);
    if (problem) return setNote({ ok: false, text: problem });
    if (pending) return;
    setNote(null);
    void subscribe();
  };

  useEffect(() => {
    if (!leaving) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && setLeaving(0);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leaving, pending]);

  if (subscribedAs) {
    return (
      <div className="w-full max-w-sm" role="status">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> You are subscribed
        </p>
        <p className="mt-1 break-all text-xs text-white/60">Weekly updates go to {subscribedAs}.</p>
        {/* Deliberately small and quiet: leaving is possible, but never one click away. */}
        <button type="button" onClick={() => setLeaving(1)} className="mt-3 text-[11px] text-white/35 transition hover:text-white/60">
          Manage subscription
        </button>
        {note && !note.ok && <p role="alert" className="mt-2 text-xs text-red-300">{note.text}</p>}

        {leaving > 0 && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4" onClick={() => !pending && setLeaving(0)}>
            <div role="dialog" aria-modal="true" aria-labelledby="unsub-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 text-ink shadow-2xl">
              {leaving === 1 ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Step 1 of 2</p>
                  <h2 id="unsub-title" className="mt-1 text-lg font-bold">Stop getting admission updates?</h2>
                  <p className="mt-2 text-sm text-ink-soft">
                    You will no longer receive exam dates, cutoffs and application windows in your inbox, and you could miss a deadline that matters to you.
                  </p>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <button type="button" onClick={() => setLeaving(2)} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-faint hover:text-ink-soft">
                      Continue
                    </button>
                    <button type="button" autoFocus onClick={() => setLeaving(0)} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                      Keep my subscription
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Step 2 of 2</p>
                  <h2 id="unsub-title" className="mt-1 text-lg font-bold">Unsubscribe {subscribedAs}?</h2>
                  <p className="mt-2 text-sm text-ink-soft">
                    This takes effect straight away. You can subscribe again whenever you like, but updates sent in between will not reach you.
                  </p>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <button type="button" onClick={unsubscribe} disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      Yes, unsubscribe me
                    </button>
                    <button type="button" autoFocus onClick={() => setLeaving(0)} disabled={pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                      No, keep it
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} noValidate className="flex w-full gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setNote(null); }}
          maxLength={254}
          autoComplete="email"
          aria-label="Your email address"
          aria-invalid={note?.ok === false}
          placeholder="Enter your email"
          className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
        />
        <button type="submit" disabled={pending} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Subscribe
        </button>
      </form>
      {note && <p role={note.ok ? "status" : "alert"} className={`mt-2 text-xs ${note.ok ? "text-emerald-300" : "text-red-300"}`}>{note.text}</p>}
    </div>
  );
}
