"use client";

import { useSyncExternalStore } from "react";
import { Mail } from "lucide-react";

const emptySubscribe = () => () => {};

/** "Share this": four small coloured buttons that share the page being viewed. */
export function ShareLinks({ title }: { title: string }) {
  const url = useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== "undefined" ? window.location.href : ""),
    () => ""
  );

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const items = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, bg: "bg-[#3b5998]", mark: "f" },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, bg: "bg-[#1da1f2]", mark: "t" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, bg: "bg-[#0a66c2]", mark: "in" },
    { label: "Email", href: `mailto:?subject=${t}&body=${u}`, bg: "bg-ink", mark: "" },
  ];

  return (
    <div className="flex items-center gap-2 text-sm text-ink">
      <span>Share this :</span>
      {items.map((s) => (
        <a
          key={s.label}
          href={s.href}
          suppressHydrationWarning
          target={s.label === "Email" ? undefined : "_blank"}
          rel="noopener noreferrer"
          aria-label={`Share on ${s.label}`}
          className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white transition hover:opacity-80 ${s.bg}`}
        >
          {s.mark || <Mail className="h-3.5 w-3.5" />}
        </a>
      ))}
    </div>
  );
}
