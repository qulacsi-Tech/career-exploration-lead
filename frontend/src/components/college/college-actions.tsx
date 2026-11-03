"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth-actions";
import { AdminNoticeModal, AuthModal, LeadModal, ProfileModal, QueryModal, ReviewModal, profileIncomplete } from "@/components/college/college-action-modals";
import { SESSION_CHANGED_EVENT } from "@/lib/user-session-cookie";
import { canUsePanel } from "@/lib/roles";

/**
 * "Write a review", "Ask a question" and "Ask a counsellor" on a college's pages.
 *
 * One provider sits on the college layout and every button below it asks the provider to start an action.
 * The provider checks the session: a signed-in student gets the dialog they asked for; anyone else gets
 * the sign-in / create-account dialog first, and is returned to the dialog they asked for once they are
 * in. Nothing can be sent without an account, and the visitor never leaves the page.
 */

export type ActionKind = "review" | "query" | "counsellor" | "callback" | "apply" | "brochure";

/** Extra context for an action: the programme an application or brochure request is about. */
export type ActionOptions = { programme?: string };

type Stage =
  | { step: "auth"; then?: ActionKind; options?: ActionOptions; /** For a one-off action such as "helpful": what to say, and what to do once signed in. */ reason?: string; resume?: () => void }
  | { step: "profile"; then: ActionKind; options?: ActionOptions; user: SessionUser }
  | { step: "form"; kind: ActionKind; options?: ActionOptions; user: SessionUser }
  /** Signed in as an admin: reviews, questions, applications and the rest are for student accounts. */
  | { step: "admin" }
  | null;

type CollegeActionsApi = {
  slug: string;
  start: (kind: ActionKind, options?: ActionOptions) => void;
  busy: boolean;
  /** Runs `resume` at once for a signed-in student; otherwise asks them to sign in or register first, then runs it. */
  ensureSignedIn: (reason: string, resume: () => void) => Promise<void>;
};

const Ctx = createContext<CollegeActionsApi | null>(null);

/** The actions of the college page this sits on, or null elsewhere. */
export function useCollegeActions() {
  return useContext(Ctx);
}

const REASON: Record<ActionKind, string> = {
  review: "Sign in to write a review. It takes a minute.",
  query: "Sign in to ask your question. It takes a minute.",
  counsellor: "Sign in so a counsellor can reach you. It takes a minute.",
  callback: "Sign in so a counsellor can call you back. It takes a minute.",
  apply: "Sign in to apply. It takes a minute.",
  brochure: "Sign in to download the brochure. It takes a minute.",
};

export function CollegeActions({ slug, name, courses, programmes = [], brochureUrl = "", children }: { slug: string; name: string; courses: string[]; /** Every course and specialisation, as "MBA · Finance", for the apply form. */ programmes?: string[]; brochureUrl?: string; children: ReactNode }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(
    async (kind: ActionKind, options?: ActionOptions) => {
      setBusy(true);
      try {
        const user = await getSessionUser();
        setStage(!user ? { step: "auth", then: kind, options } : canUsePanel(user.role) ? { step: "admin" } : profileIncomplete(user) ? { step: "profile", then: kind, options, user } : { step: "form", kind, options, user });
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const ensureSignedIn = useCallback(async (reason: string, resume: () => void) => {
    const user = await getSessionUser();
    if (!user) setStage({ step: "auth", reason, resume });
    else if (canUsePanel(user.role)) setStage({ step: "admin" });
    else resume();
  }, []);

  /** The moment sign-in works: the page behind the dialog shows who is signed in, with no wait. */
  const onAuthed = useCallback(() => {
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
    router.refresh();
  }, [router]);

  /** The welcome message has been read: ask for what the account is missing, or carry on to what they asked for. */
  const afterAuth = useCallback(async () => {
    if (stage?.step !== "auth") return;
    const user = await getSessionUser();
    // An admin who signs in here is told these actions are for student accounts.
    if (user && canUsePanel(user.role)) return setStage({ step: "admin" });
    // A one-off action (such as marking an answer helpful) just carries on; it needs no profile details.
    if (stage.resume) {
      const resume = stage.resume;
      setStage(null);
      resume();
      return;
    }
    const then = stage.then ?? "query";
    const options = stage.options;
    setStage(!user ? null : profileIncomplete(user) ? { step: "profile", then, options, user } : { step: "form", kind: then, options, user });
  }, [stage]);

  /** The details are saved: refresh what the header and account page know, then carry on. */
  const afterProfile = useCallback(async () => {
    if (stage?.step !== "profile") return;
    const then = stage.then;
    const options = stage.options;
    const user = await getSessionUser();
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
    setStage(user ? { step: "form", kind: then, options, user } : null);
  }, [stage]);

  const close = useCallback(() => setStage(null), []);
  const value = useMemo(() => ({ slug, start, busy, ensureSignedIn }), [slug, start, busy, ensureSignedIn]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {stage?.step === "auth" && <AuthModal reason={stage.reason ?? REASON[stage.then ?? "query"]} onAuthed={onAuthed} onDone={afterAuth} onClose={close} />}
      {stage?.step === "admin" && <AdminNoticeModal onClose={close} />}
      {stage?.step === "profile" && <ProfileModal user={stage.user} onDone={afterProfile} onClose={close} />}
      {stage?.step === "form" && stage.kind === "review" && <ReviewModal slug={slug} collegeName={name} courses={courses} user={stage.user} onClose={close} />}
      {stage?.step === "form" && (stage.kind === "query" || stage.kind === "counsellor") && <QueryModal kind={stage.kind} slug={slug} collegeName={name} user={stage.user} onClose={close} />}
      {stage?.step === "form" && (stage.kind === "callback" || stage.kind === "apply" || stage.kind === "brochure") && (
        <LeadModal kind={stage.kind} slug={slug} collegeName={name} programmes={programmes} brochureUrl={brochureUrl} programme={stage.options?.programme} user={stage.user} onClose={close} />
      )}
    </Ctx.Provider>
  );
}

/**
 * A button that starts one of the actions. Outside a college page (no provider) it is a plain link to the
 * enquiry form, so it never does nothing.
 */
export function ActionButton({ kind, options, fallbackHref = "/enquiry", className, children }: { kind: ActionKind; options?: ActionOptions; fallbackHref?: string; className?: string; children: ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return (
      <Link href={fallbackHref} data-track="cta_enquiry" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => void ctx.start(kind, options)} disabled={ctx.busy} aria-busy={ctx.busy || undefined} className={`${className ?? ""} disabled:opacity-70`}>
      {children}
    </button>
  );
}
