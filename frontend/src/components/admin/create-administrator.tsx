"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { PasswordInput } from "@/components/ui/password-input";
import { createAdministrator } from "@/lib/admin-actions";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

/** "Add administrator" and its dialog. Shown to super admins only; the API refuses anyone else. */
export function CreateAdministrator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Add administrator
      </button>

      <AdminModal
        open={open}
        onClose={close}
        title="Add administrator"
        description="They sign in at the normal login page with this email and password. Ask them to change the password afterwards."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setError(null);
            startTransition(async () => {
              const result = await createAdministrator(new FormData(form));
              if ("error" in result) {
                setError(result.error);
                return;
              }
              close();
              router.refresh();
            });
          }}
        >
          <div>
            <label htmlFor="adm-name" className="block text-xs font-semibold text-ink">
              Full name
            </label>
            <input id="adm-name" name="name" required minLength={2} autoComplete="off" className={INPUT} />
          </div>

          <div>
            <label htmlFor="adm-email" className="block text-xs font-semibold text-ink">
              Email
            </label>
            <input id="adm-email" name="email" type="email" required autoComplete="off" className={INPUT} />
          </div>

          <div>
            <label htmlFor="adm-password" className="block text-xs font-semibold text-ink">
              Temporary password
            </label>
            <PasswordInput
              id="adm-password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={INPUT}
            />
            <p className="mt-1 text-[11px] text-ink-faint">At least 8 characters, with a letter and a number.</p>
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold text-ink">Role</legend>
            <label className="mt-2 flex items-start gap-2 text-sm text-ink">
              <input type="radio" name="role" value="ADMIN" defaultChecked className="mt-1" />
              <span>
                <span className="font-semibold">Admin</span>
                <span className="block text-xs text-ink-soft">Manages content and leads, and can enable or disable student accounts.</span>
              </span>
            </label>
            <label className="mt-2 flex items-start gap-2 text-sm text-ink">
              <input type="radio" name="role" value="SUPER_ADMIN" className="mt-1" />
              <span>
                <span className="font-semibold">Super admin</span>
                <span className="block text-xs text-ink-soft">Everything an admin can do, plus creating and disabling administrator accounts.</span>
              </span>
            </label>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
