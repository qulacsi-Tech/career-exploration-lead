"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signInWithGoogle } from "@/lib/auth-actions";

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode?: "popup";
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme?: string; size?: string; text?: string; shape?: string; width?: number; logo_alignment?: string },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

/** Development only: what Google says about the visitor, read from the ID token's payload. */
function logGoogleClaims(credential: string | undefined) {
  if (process.env.NODE_ENV === "production" || !credential) return;
  try {
    const base64 = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    console.group("[Google sign-in] data received from Google");
    console.table({
      sub: claims.sub,
      email: claims.email,
      email_verified: claims.email_verified,
      name: claims.name,
      given_name: claims.given_name,
      family_name: claims.family_name,
      picture: claims.picture,
      issued_at: new Date(Number(claims.iat) * 1000).toLocaleString(),
      expires_at: new Date(Number(claims.exp) * 1000).toLocaleString(),
    });
    console.log("all claims:", claims);
    console.groupEnd();
  } catch {
    console.warn("[Google sign-in] could not read the token payload");
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Loads Google's script once, however many buttons are on the page. */
let scriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load Google sign-in."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * "Continue with Google".
 *
 * Google draws the button itself (its terms require that), and hands this page
 * an ID token when the visitor picks an account. The token goes to a Server
 * Action, which has the API verify it and sets the session cookie. Nothing the
 * browser says about who the visitor is is trusted: the API checks the token.
 *
 * Until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set it shows a dev-only note (nothing in
 * production), so there is never a button that does nothing.
 */
export function GoogleSignInButton({ next, text = "continue_with" }: { next?: string; text?: "continue_with" | "signup_with" | "signin_with" }) {
  const holder = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => {
            setError(null);
            logGoogleClaims(credential);
            startTransition(async () => {
              const result = await signInWithGoogle(credential ?? "", next);
              // On success the action redirects, so a result here is always a failure.
              if (result?.error) {
                if (process.env.NODE_ENV !== "production") console.warn("[Google sign-in] our server said:", result.error);
                setError(result.error);
              }
            });
          },
        });
        window.google.accounts.id.renderButton(holder.current, {
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "center",
          width: Math.min(holder.current.offsetWidth || 320, 400),
        });
      })
      .catch(() => !cancelled && setError("Google sign-in is unavailable right now. Use your email and password instead."));

    return () => {
      cancelled = true;
    };
  }, [next, text]);

  if (!CLIENT_ID) {
    // Production hides the button rather than show one that does nothing. In
    // development say why it is missing, so it does not look like a bug.
    if (process.env.NODE_ENV === "production") return null;
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-2 text-center text-xs text-ink-faint">
        “Continue with Google” appears here once <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> is set in{" "}
        <code>frontend/.env.local</code>. Only you see this note, in development.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className={`mt-4 flex min-h-[44px] justify-center ${pending ? "pointer-events-none opacity-60" : ""}`}>
        <div ref={holder} className="w-full" />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
