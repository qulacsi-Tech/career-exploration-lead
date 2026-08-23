import Link from "next/link";
import { ReactNode } from "react";

/**
 * Small outlined chip link used in the Explore Careers panels and under each
 * Data highlight. Same shape language as `StreamTabs`, one size down.
 */
export function TagLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
    >
      {children}
    </Link>
  );
}
