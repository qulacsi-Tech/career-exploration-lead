"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

/**
 * A live countdown to when the next attempt may start: "1d 04h 12m 09s". When it reaches zero the page is read
 * again (`refreshWhenDone`), so the Start button or the paper appears without a manual reload.
 */
export function RetakeCountdown({ until, refreshWhenDone = false, tone = "light" }: { until: string; refreshWhenDone?: boolean; tone?: "light" | "dark" }) {
  const router = useRouter();
  const target = Date.parse(until);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? null : target - now;
  useEffect(() => {
    if (refreshWhenDone && left !== null && left <= 0) router.refresh();
  }, [left, refreshWhenDone, router]);

  if (left === null) return <span className="font-mono">…</span>;
  if (left <= 0) return <span className="font-semibold">now</span>;
  const { d, h, m, s } = parts(left);
  const pad = (n: number) => String(n).padStart(2, "0");
  const box = tone === "dark" ? "bg-white/15 text-white" : "bg-brand-soft text-brand-ink";
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold" aria-live="off">
      {d > 0 && <span className={`rounded-md px-1.5 py-0.5 ${box}`}>{d}d</span>}
      <span className={`rounded-md px-1.5 py-0.5 ${box}`}>{pad(h)}h</span>
      <span className={`rounded-md px-1.5 py-0.5 ${box}`}>{pad(m)}m</span>
      <span className={`rounded-md px-1.5 py-0.5 ${box}`}>{pad(s)}s</span>
    </span>
  );
}

/**
 * "Take it again" once the gap has passed, or "You can re-attempt in …" with a countdown before then. Decides on the
 * client, from the visitor's clock, and switches over by itself when the wait ends.
 */
export function TakeAgainOrWait({ nextAt, href }: { nextAt: string | null; href: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const waiting = nextAt !== null && now !== null && Date.parse(nextAt) > now;
  if (waiting) {
    return (
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-800">
        You can re-attempt in <RetakeCountdown until={nextAt} />
      </p>
    );
  }
  return (
    <Link href={href} className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">
      Take it again
    </Link>
  );
}
