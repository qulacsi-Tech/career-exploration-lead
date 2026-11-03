"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { getSessionUser } from "@/lib/auth-actions";
import { SESSION_CHANGED_EVENT } from "@/lib/user-session-cookie";
import { canUsePanel } from "@/lib/roles";
import { useCollegeActions } from "@/components/college/college-actions";

type State = "checking" | "in" | "out" | "admin";

/**
 * Keeps the enquiry form for people who have signed in. A visitor who has not gets the log in / create account
 * window straight away (and a button to bring it back); once they are in, the form appears, filled in with
 * their details. An admin is told the form is for student accounts.
 */
export function EnquiryGate({ children }: { children: ReactNode }) {
  const actions = useCollegeActions();
  const [state, setState] = useState<State>("checking");
  const asked = useRef(false);

  const check = useCallback(async () => {
    const user = await getSessionUser();
    setState(!user ? "out" : canUsePanel(user.role) ? "admin" : "in");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read who is signed in when the page opens
    void check();
    window.addEventListener(SESSION_CHANGED_EVENT, check);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, check);
  }, [check]);

  const signIn = useCallback(() => {
    void actions?.ensureSignedIn("Sign in to send your enquiry. It takes a minute.", () => setState("in"));
  }, [actions]);

  // Once it is known they are signed out, the window opens by itself, once.
  useEffect(() => {
    if (state === "out" && !asked.current) {
      asked.current = true;
      signIn();
    }
  }, [state, signIn]);

  if (state === "in") return <>{children}</>;

  if (state === "checking") {
    return <div className="mt-8 flex items-center justify-center gap-2 py-12 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</div>;
  }

  if (state === "admin") {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-bg-alt p-6 text-sm text-ink-soft">
        You are signed in as an admin. The enquiry form is for student accounts. <Link href="/admin" className="font-semibold text-brand hover:underline">Open the admin panel</Link>.
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><LogIn className="h-7 w-7" aria-hidden="true" /></span>
      <p className="mt-4 font-display text-xl font-bold text-ink">Sign in to send your enquiry</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">Log in or create an account, and your details are filled in for you. A counsellor then calls you back.</p>
      <button type="button" onClick={signIn} className="mt-5 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark">
        Log in or create an account
      </button>
    </div>
  );
}
