import { ReactNode } from "react";
import Link from "next/link";

/**
 * The pink strip that closes off a Top Colleges / Top Exams card: flush to the
 * card edges, meta on the left, one outlined pill action on the right.
 */
export function CardBand({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-band px-4 py-3.5">{children}</div>
  );
}

export function BandAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full border border-band-ink/40 px-4 py-1.5 text-xs font-medium text-band-ink transition hover:bg-band-ink hover:text-band"
    >
      {children}
    </Link>
  );
}
