"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSessionUser, signOut, type SessionUser } from "@/lib/auth-actions";
import { USER_HINT_COOKIE } from "@/lib/user-session-cookie";
import { isAdminRole } from "@/lib/roles";

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function hasSessionHint() {
  return document.cookie.split("; ").some((c) => c === `${USER_HINT_COOKIE}=1`);
}

/**
 * The account button in the site header.
 *
 * The header is shared by every public page, which are prerendered. Reading the
 * session cookie on the server there would make all of them render per request,
 * so the header ships the signed-out button and this component swaps it for the
 * account menu once it knows who is signed in. A readable hint cookie lets a
 * visitor with no session skip the lookup entirely.
 */
export function HeaderAccount() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasSessionHint()) return;
    let cancelled = false;
    getSessionUser()
      .then((found) => !cancelled && setUser(found))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="ml-auto flex shrink-0 flex-col items-center rounded-xl bg-brand px-3 py-2 text-center text-white transition hover:bg-brand-dark sm:px-4 lg:ml-0"
      >
        <span className="hidden text-[11px] font-bold leading-tight sm:block">Shaping your future!</span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-white/90 sm:mt-0.5">
          Login / Register
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
            <ArrowIcon className="h-2.5 w-2.5" />
          </span>
        </span>
      </Link>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] || "Account";

  return (
    <div ref={menuRef} className="relative ml-auto shrink-0 lg:ml-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-semibold text-ink transition hover:border-brand"
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-bold text-white">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a Google profile photo, not worth the image optimizer
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            firstName.charAt(0).toUpperCase()
          )}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:block">Hi, {firstName}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 text-sm shadow-lg"
        >
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-ink hover:bg-bg-alt">
            My account
          </Link>
          {isAdminRole(user.role) && (
            <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-ink hover:bg-bg-alt">
              Admin panel
            </Link>
          )}
          <form action={signOut} className="border-t border-line">
            <button role="menuitem" type="submit" className="block w-full px-4 py-2.5 text-left text-ink hover:bg-bg-alt">
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
