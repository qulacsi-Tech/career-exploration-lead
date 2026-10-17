"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserActive } from "@/lib/admin-actions";

/**
 * Turns an account off or back on. A disabled account cannot sign in. Pass
 * `compact` for a table row. The caller decides whether to show it at all
 * (who may manage whom); the API enforces the same rule.
 */
export function UserActiveToggle({
  id,
  isActive,
  name,
  compact = false,
}: {
  id: string;
  isActive: boolean;
  name: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={`flex flex-col gap-1 ${compact ? "items-start" : "items-end"}`}>
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
        className={`rounded-lg border font-medium transition disabled:opacity-60 ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
        } ${isActive ? "border-red-300 text-red-700 hover:bg-red-50" : "border-brand text-brand hover:bg-brand-soft"}`}
      >
        {pending ? "Saving…" : isActive ? "Disable" : "Enable"}
        {!compact && " account"}
      </button>
      {error && (
        <p role="alert" className="max-w-[16rem] text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
