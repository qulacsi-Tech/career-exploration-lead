import { DataHighlight as DataHighlightType } from "@/lib/mock-data";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { TagLink } from "@/components/ui/tag-link";

/** One cell of the Data grid: thumbnail, title, blurb and shortcut chips. */
export function DataHighlight({ highlight }: { highlight: DataHighlightType }) {
  return (
    <div className="flex flex-col items-center px-2 py-10 text-center sm:px-8">
      <ImagePlaceholder label={highlight.title} rounded="rounded-lg" className="h-20 w-24" />
      <h3 className="mt-4 font-display text-xl font-semibold text-ink">{highlight.title}</h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
        {highlight.description}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {highlight.links.map((link) => (
          <TagLink key={link.label} href={link.href}>
            {link.label}
          </TagLink>
        ))}
      </div>
    </div>
  );
}
