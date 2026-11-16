"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { startCommunity } from "@/lib/community-actions";
import type { CommunityViewer } from "@/lib/community-api";

/** Shown while an exam has no community yet: the first signed-in student starts it. */
export function StartCommunity({ examSlug, examName, viewer, loginHref }: { examSlug: string; examName: string; viewer: CommunityViewer; loginHref: string }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError("");
      const result = await startCommunity(examSlug, description);
      if (result.ok) {
        router.refresh();
        return;
      }
      if (result.needsSignIn) {
        router.push(loginHref);
        return;
      }
      // Someone else started it a moment ago: show it.
      if (/already has a community/i.test(result.message)) router.refresh();
      setError(result.message);
    });

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 text-center sm:p-10">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-soft text-gold">
        <Sparkles className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">No {examName} community yet</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
        Be the first: start it, and every {examName} aspirant can join you to ask questions, share tips and celebrate results.
      </p>

      {viewer.adminAccount ? (
        <p className="mt-6 text-sm text-ink-soft">Admin accounts cannot start a community. Use a student account.</p>
      ) : viewer.blocked ? (
        <p className="mt-6 text-sm text-ink-soft">Your account cannot start a community.</p>
      ) : !viewer.signedIn ? (
        <Link href={loginHref} className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark">
          Sign in to start the community
        </Link>
      ) : (
        <form
          className="mx-auto mt-6 max-w-lg text-left"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="community-about" className="text-sm font-semibold text-ink">
            What is it for? <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <textarea
            id="community-about"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder={`A place for ${examName} aspirants to help each other.`}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-3 w-full rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Starting…" : `Start the ${examName} community`}
          </button>
        </form>
      )}
    </section>
  );
}
