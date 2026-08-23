import Link from "next/link";
import { CareerPanel } from "@/lib/mock-data";
import { TagLink } from "@/components/ui/tag-link";

/**
 * One bordered column in Explore Careers. Takes a list because the middle
 * column of the prototype stacks two panels ("Important Exams" + "Top Cities")
 * inside a single card.
 */
export function CareerPanelCard({ panels }: { panels: CareerPanel[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      {panels.map((panel, i) => (
        <section key={panel.title} className={i > 0 ? "mt-8" : undefined}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">{panel.title}</h3>
            <Link href={panel.viewAllHref} className="text-xs font-semibold text-brand hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {panel.links.map((link) => (
              <TagLink key={link.label} href={link.href}>
                {link.label}
              </TagLink>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
