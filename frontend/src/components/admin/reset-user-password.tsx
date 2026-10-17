"use client";

import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { PasswordInput } from "@/components/ui/password-input";
import { resetUserPassword } from "@/lib/admin-actions";

/**
 * "Reset password" for someone who cannot sign in. There is no email reset yet, so the team sets a
 * temporary password here and passes it on; the person must choose their own at next sign-in. The
 * API decides who may reset whom. Pass `compact` for a table row.
 */
export function ResetUserPassword({ id, name, compact = false }: { id: string; name: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setError(null);
    setDone(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-line font-medium text-ink-soft transition hover:border-brand hover:text-brand ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
        }`}
      >
        Reset password
      </button>

      <AdminModal
        open={open}
        onClose={close}
        title={`Reset password for ${name}`}
        description="Set a temporary password and give it to them yourself. They will be asked to choose their own the next time they sign in."
      >
        {done ? (
          <div className="space-y-4">
            <p role="status" className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand-ink">
              The temporary password is set. Pass it to {name} now: it is not shown again.
            </p>
            <button type="button" onClick={close} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Done
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const password = String(new FormData(e.currentTarget).get("password") ?? "");
              setError(null);
              startTransition(async () => {
                const result = await resetUserPassword(id, password);
                if ("error" in result) return setError(result.error);
                setDone(true);
              });
            }}
          >
            <div>
              <label htmlFor={`reset-${id}`} className="block text-xs font-semibold text-ink">
                Temporary password
              </label>
              <PasswordInput
                id={`reset-${id}`}
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-ink-faint">At least 8 characters, with a letter and a number.</p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {pending ? "Saving…" : "Set temporary password"}
              </button>
            </div>
          </form>
        )}
      </AdminModal>
    </>
  );
}
