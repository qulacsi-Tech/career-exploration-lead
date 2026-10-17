"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOutIdle } from "@/lib/auth-actions";
import { USER_HINT_COOKIE } from "@/lib/user-session-cookie";

/** Quiet for this long and the warning appears. */
const IDLE_BEFORE_WARNING_MS = 3 * 60 * 1000;
/** How long the visitor has to answer the warning before they are signed out. */
const WARNING_MS = 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;
/** Shared between tabs, so working in one tab keeps the others from timing out. */
const ACTIVITY_KEY = "tcp_last_active";
/** Written by the tab that signs out, so every other tab follows. */
const LOGOUT_KEY = "tcp_idle_logout";

function signedIn() {
  return document.cookie.split("; ").includes(`${USER_HINT_COOKIE}=1`);
}

function readLastActive(): number {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

/** Signs out here and tells every other open tab to follow. */
function logoutEverywhere() {
  try {
    localStorage.setItem(LOGOUT_KEY, String(Date.now()));
  } catch {
    /* the other tabs will notice the cleared cookie and stop on their own */
  }
  void signOutIdle();
}

/**
 * Signs a signed-in visitor out after a stretch of inactivity.
 *
 * After three minutes of no mouse, keyboard, scroll or touch, a dialog says they
 * are about to be signed out and counts down a minute. "Stay signed in" starts
 * the clock again; doing nothing signs them out and sends them to the login page
 * with a note about why. Activity in any open tab counts for all of them, and a
 * sign-out in one tab signs out the rest.
 *
 * This guards a shared or unattended computer. It is enforced in the browser, so
 * it is not a substitute for the token's own expiry on the server.
 */
export function IdleLogout() {
  const pathname = usePathname();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const warningShown = useRef(false);

  useEffect(() => {
    let lastWrite = 0;

    const markActive = () => {
      // While the warning is up only the buttons count: a nudge of the mouse must not dismiss it.
      if (warningShown.current) return;
      const now = Date.now();
      if (now - lastWrite < 1000) return;
      lastWrite = now;
      try {
        localStorage.setItem(ACTIVITY_KEY, String(now));
      } catch {
        /* storage blocked: this tab still tracks itself below */
      }
    };

    const leave = () => {
      warningShown.current = false;
      setSecondsLeft(null);
      logoutEverywhere();
    };

    const tick = () => {
      if (!signedIn()) {
        if (warningShown.current) {
          warningShown.current = false;
          setSecondsLeft(null);
        }
        return;
      }
      const idleFor = Date.now() - readLastActive();
      if (idleFor >= IDLE_BEFORE_WARNING_MS + WARNING_MS) {
        leave();
      } else if (idleFor >= IDLE_BEFORE_WARNING_MS) {
        warningShown.current = true;
        setSecondsLeft(Math.ceil((IDLE_BEFORE_WARNING_MS + WARNING_MS - idleFor) / 1000));
      } else if (warningShown.current) {
        // Another tab answered the warning.
        warningShown.current = false;
        setSecondsLeft(null);
      }
    };

    const onStorage = (event: StorageEvent) => {
      // A full load on purpose: the other tab already cleared the cookies, and this page must render signed out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (event.key === LOGOUT_KEY && event.newValue && signedIn()) window.location.assign("/login?idle=1");
    };

    // Signing in starts the clock; so does coming back to the tab.
    markActive();
    const onVisible = () => document.visibilityState === "visible" && tick();

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, markActive, { passive: true });
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    // Timers in a background tab are slowed down, so each tick compares clock times rather than counting ticks.
    const interval = window.setInterval(tick, 1000);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, markActive);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  // A fresh page load after signing in must not inherit the old idle time.
  useEffect(() => {
    if (signedIn() && Date.now() - readLastActive() > IDLE_BEFORE_WARNING_MS) {
      try {
        localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      } catch {
        /* see above */
      }
    }
  }, [pathname]);

  if (secondsLeft === null) return null;

  const stay = () => {
    warningShown.current = false;
    setSecondsLeft(null);
    try {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* see above */
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-body"
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl"
      >
        <h2 id="idle-title" className="font-display text-lg font-bold text-ink">
          Are you still there?
        </h2>
        <p id="idle-body" className="mt-2 text-sm leading-relaxed text-ink-soft">
          You have been inactive for a while. For your security we will sign you out in{" "}
          <span className="font-semibold tabular-nums text-ink">{secondsLeft}</span> {secondsLeft === 1 ? "second" : "seconds"}.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            autoFocus
            type="button"
            onClick={stay}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={logoutEverywhere}
            className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
          >
            Log out now
          </button>
        </div>
      </div>
    </div>
  );
}
