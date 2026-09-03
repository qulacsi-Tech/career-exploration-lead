import { ReactNode } from "react";

/**
 * In-page structure for admin screens.
 *
 * Every edit screen in the proposal's scope is long — a college carries basic
 * details, courses, fees, placements, media and its own SEO fields. Rather than
 * each page inventing its own headings, they compose from these three:
 *
 *   <AdminPageHeader>   title, description, actions
 *     <AdminSection>    a titled card — "Basic details", "SEO"
 *       <AdminSubsection>  a labelled block inside it
 *
 * Keeping it here means a change to the section chrome lands everywhere at
 * once, and every screen reads the same way to whoever is doing data entry.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex flex-col gap-2 border-b border-line-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </header>
      <div className="space-y-6 px-5 py-5">{children}</div>
    </section>
  );
}

export function AdminSubsection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</h3>
      {description && <p className="mt-1 text-xs text-ink-soft">{description}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Placeholder for a module that is scaffolded but not built yet. */
export function AdminPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-bg-alt px-5 py-8 text-center text-sm text-ink-soft">
      {children}
    </div>
  );
}
