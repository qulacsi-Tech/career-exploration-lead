import Link from "next/link";

/**
 * `emphasis` makes the trail stand out: larger, bold, the links in the brand colour and the page you
 * are on in the darkest ink. Used where the breadcrumb is part of how a page is read (articles).
 */
export function Breadcrumbs({
  items,
  emphasis = false,
}: {
  items: { label: string; href?: string }[];
  emphasis?: boolean;
}) {
  return (
    <nav aria-label="Breadcrumb" className={emphasis ? "text-base font-semibold text-ink" : "text-sm text-ink-faint"}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className={emphasis ? "font-bold text-brand underline-offset-4 hover:text-brand-dark hover:underline" : "hover:text-brand"}>
                {item.label}
              </Link>
            ) : (
              <span className={emphasis ? "font-bold text-ink" : "text-ink-soft"} aria-current="page">
                {item.label}
              </span>
            )}
            {i < items.length - 1 && (
              <span aria-hidden="true" className={emphasis ? "font-bold text-brand" : undefined}>
                {emphasis ? "›" : "/"}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
