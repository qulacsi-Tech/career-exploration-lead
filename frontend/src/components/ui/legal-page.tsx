import { Breadcrumbs } from "@/components/breadcrumbs";

export type LegalSection = { heading: string; paragraphs: string[]; bullets?: string[] };

/**
 * Shared shell for the policy pages.
 *
 * Both are long-form text with the same needs — a dated header, numbered
 * sections, readable measure — and keeping them in one component stops the
 * second one drifting from the first the moment either is edited.
 *
 * `updated` is rendered prominently on purpose: a policy with no date gives a
 * reader no way to tell whether it still describes what actually happens.
 */
export function LegalPage({
  title,
  intro,
  updated,
  sections,
  note,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  note?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />

      <header className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Last updated {updated}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{intro}</p>
      </header>

      <div className="mt-10 space-y-9">
        {sections.map((section, index) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg font-bold text-ink">
              <span className="mr-2 text-brand">{index + 1}.</span>
              {section.heading}
            </h2>

            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}

            {section.bullets && (
              <ul className="mt-3 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {note && (
        <p className="mt-12 rounded-xl border border-line bg-bg-alt p-4 text-xs leading-relaxed text-ink-soft">
          {note}
        </p>
      )}
    </div>
  );
}
