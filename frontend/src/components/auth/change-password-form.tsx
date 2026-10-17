"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/college-actions";
import { PasswordInput } from "@/components/ui/password-input";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";

/** Replaces the temporary password. On success the action sends the person on to the admin panel. */
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-1 text-sm text-ink-soft">
        You signed in with a temporary password. Choose your own to continue.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="current" className="block text-xs font-semibold text-ink">
            Temporary password
          </label>
          <PasswordInput id="current" name="current" required autoComplete="current-password" className={INPUT} />
        </div>
        <div>
          <label htmlFor="next" className="block text-xs font-semibold text-ink">
            New password
          </label>
          <PasswordInput id="next" name="next" required minLength={8} autoComplete="new-password" className={INPUT} />
          <p className="mt-1 text-[11px] text-ink-faint">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="block text-xs font-semibold text-ink">
            Confirm new password
          </label>
          <PasswordInput id="confirm" name="confirm" required autoComplete="new-password" className={INPUT} />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
