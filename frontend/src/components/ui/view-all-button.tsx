import Link from "next/link";

export function ViewAllButton({ href, children = "View All" }: { href: string; children?: string }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-full border border-line px-7 py-2 text-sm text-ink-soft transition hover:border-brand hover:text-brand"
    >
      {children}
    </Link>
  );
}
