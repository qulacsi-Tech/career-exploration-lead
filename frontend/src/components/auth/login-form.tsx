"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Login form.
 *
 * Submitting navigates to /admin. There is no auth yet — the backend has no
 * user model or session — so this is the demo path through the panel, not a
 * sign-in. It is done in a submit handler rather than by pointing the form at
 * /admin, because a GET form would put the password in the URL, where it lands
 * in history and server logs.
 *
 * When auth arrives: post the credentials, and route on the response instead.
 */
export function LoginForm() {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-xl font-bold text-ink">Log in</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Save colleges, track applications and pick up where you left off.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/admin");
        }}
      >
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-ink">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            name="remember"
            className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
          />
          Keep me signed in
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Log in
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand hover:text-brand"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
