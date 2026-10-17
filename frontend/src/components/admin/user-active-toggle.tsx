"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserActive } from "@/lib/admin-actions";

/** Turns an account off or back on. A disabled account cannot sign in or send leads as that user. */
export function UserActiveToggle({ id, isActive, name }: { id: string; isActive: boolean; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (isActive && !window.confirm(`Disable ${name}? They will not be able to sign in.`)) return;
          setError(null);
          startTransition(async () => {
            const result = await setUserActive(id, !isActive);
            if ("error" in result) setError(result.error);
            else router.refresh();
          });
        }}
        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
          isActive ? "border-red-300 text-red-700 hover:bg-red-50" : "border-brand text-brand hover:bg-brand-soft"
        }`}
      >
        {pending ? "Saving…" : isActive ? "Disable account" : "Enable account"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
