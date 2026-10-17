"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { collegeWithdraw } from "@/lib/college-actions";

/** Takes back a request that has not been decided yet. */
export function WithdrawButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Withdraw this request? The team will no longer be asked to review it.")) return;
          setError(null);
          startTransition(async () => {
            const result = await collegeWithdraw(id);
            if ("error" in result) return setError(result.error);
            router.refresh();
          });
        }}
        className="font-semibold text-ink-soft hover:text-red-700 hover:underline disabled:opacity-60"
      >
        {pending ? "Withdrawing…" : "Withdraw"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
