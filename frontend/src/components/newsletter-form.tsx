"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { subscribeToNewsletter } from "@/lib/newsletter-actions";
import { emailProblem } from "@/lib/field-rules";
import { useCollegeActions } from "@/components/college/college-actions";

/**
 * The footer's "Subscribe" box. Subscribing needs an account: pressing the button asks a visitor who is not
 * signed in to log in or register first (the page stays where it is), and then subscribes the address typed.
 */
export function NewsletterForm() {
  const actions = useCollegeActions();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const subscribe = () =>
    start(async () => {
      const result = await subscribeToNewsletter(email.trim());
      if (result.ok) setEmail("");
      setNote({ ok: result.ok, text: result.message });
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = emailProblem(email);
    if (problem) return setNote({ ok: false, text: problem });
    setNote(null);
    if (actions) void actions.ensureSignedIn("Sign in to subscribe to updates. It takes a minute.", subscribe);
    else subscribe();
  };

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
