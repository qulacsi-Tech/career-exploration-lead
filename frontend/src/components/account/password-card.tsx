"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { changeOwnPassword, setOwnPassword } from "@/lib/auth-actions";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";

/**
 * The account's password.
 *
 * Someone who signed up with Google has none, so the card offers to add one: with it they can also
 * sign in with their email and password, and Google keeps working. Everyone else can change theirs.
 */
export function PasswordCard({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState(hasPassword ? changeOwnPassword : setOwnPassword, undefined);

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold text-ink">{hasPassword ? "Change password" : "Add a password"}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {hasPassword ? (
          "Choose a new password for signing in with your email."
        ) : (
          <>
            You signed up with Google. Add a password to sign in with <span className="font-semibold text-ink">{email}</span> and that password as
            well. Signing in with Google keeps working.
          </>
        )}
      </p>

      {/* A new key after a save empties the fields. */}
      <form key={state?.saved ?? "form"} action={formAction} className="mt-5 grid max-w-md gap-4">
        {hasPassword && (
          <div>
            <label htmlFor="pw-current" className="block text-xs font-semibold text-ink">
              Current password
            </label>
            <PasswordInput id="pw-current" name="current" required autoComplete="current-password" className={INPUT} />
          </div>
        )}
        <div>
          <label htmlFor="pw-next" className="block text-xs font-semibold text-ink">
            {hasPassword ? "New password" : "Password"}
          </label>
          <PasswordInput id="pw-next" name="next" required minLength={8} autoComplete="new-password" className={INPUT} />
          <p className="mt-1 text-[11px] text-ink-faint">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label htmlFor="pw-confirm" className="block text-xs font-semibold text-ink">
            Confirm {hasPassword ? "new " : ""}password
          </label>
          <PasswordInput id="pw-confirm" name="confirm" required autoComplete="new-password" className={INPUT} />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.saved && (
          <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-brand-ink">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Your password is saved. You can sign in with it.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
        >
          {pending ? "Saving…" : hasPassword ? "Change password" : "Add password"}
        </button>
      </form>
    </section>
  );
}
