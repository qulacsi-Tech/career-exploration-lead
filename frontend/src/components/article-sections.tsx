import { Fragment, type ReactNode } from "react";
import { Check, Info, Lightbulb, TriangleAlert } from "lucide-react";
import { IMAGE_ALIGN_CLASS, IMAGE_SHAPES, IMAGE_SIZES, sectionAnchor, type ArticleBlock, type ArticleSection } from "@/lib/article-sections";
import { mediaUrl } from "@/lib/media";

/**
 * An article's sections, drawn: each section is a card with an accent heading,
 * and each block has its own treatment (a striped table, numbered step circles,
 * a facts grid, a tinted note). Plain server component.
 */

const NOTE: Record<"info" | "tip" | "warning", { box: string; icon: typeof Info; iconClass: string }> = {
  info: { box: "border-sky-200 bg-sky-50", icon: Info, iconClass: "text-sky-600" },
  tip: { box: "border-emerald-200 bg-emerald-50", icon: Lightbulb, iconClass: "text-emerald-600" },
  warning: { box: "border-amber-200 bg-amber-50", icon: TriangleAlert, iconClass: "text-amber-600" },
};

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
          {block.text.split(/\n\s*\n/).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      );

    case "list":
      return block.style === "numbered" ? (
        <ol className="space-y-2.5 text-[15px] leading-relaxed text-ink-soft">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2.5 text-[15px] leading-relaxed text-ink-soft">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              {block.style === "check" ? (
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[420px] overflow-hidden rounded-xl border border-line text-left text-sm">
            <thead>
              <tr className="bg-brand-soft text-brand-ink">
                {block.headers.map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className={r % 2 ? "bg-bg-alt" : "bg-surface"}>
                  {row.map((cell, c) => (
                    <td key={c} className={`px-4 py-3 ${c === 0 ? "font-medium text-ink" : "text-ink-soft"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "steps":
      return (
        <ol className="relative space-y-5 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-0.5 before:bg-line">
          {block.items.map((item, i) => (
            <li key={i} className="relative flex gap-4">
              <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white shadow-sm">
                {i + 1}
              </span>
              <div className="min-w-0 pt-1">
                <p className="font-display font-semibold text-ink">{item.title}</p>
                {item.text && <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{item.text}</p>}
              </div>
            </li>
          ))}
        </ol>
      );

    case "facts":
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-xl bg-brand-soft px-4 py-3">
              <dt className="text-xs font-medium text-brand">{item.label}</dt>
              <dd className="mt-1 font-display text-lg font-bold text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      );

    case "note": {
      const tone = NOTE[block.tone];
      const Icon = tone.icon;
      return (
        <div className={`flex gap-3 rounded-xl border p-4 ${tone.box}`}>
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClass}`} />
          <div className="min-w-0 text-[15px] leading-relaxed text-ink-soft">
            {block.title && <p className="font-semibold text-ink">{block.title}</p>}
            <p className="whitespace-pre-line">{block.text}</p>
          </div>
        </div>
      );
    }

    case "image": {
      const size = IMAGE_SIZES.find((x) => x.value === block.size) ?? IMAGE_SIZES[2];
      const shape = IMAGE_SHAPES.find((x) => x.value === block.shape) ?? IMAGE_SHAPES[1];
      return (
        <figure className={`w-full ${size.box} ${IMAGE_ALIGN_CLASS[block.align]}`}>
          {/* Plain img: an uploaded picture comes from the API's origin, and its height is not known. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(block.src)} alt={block.alt} loading="lazy" className={`w-full border border-line object-cover ${shape.frame}`} />
          {block.caption && <figcaption className="mt-2 text-center text-sm text-ink-faint">{block.caption}</figcaption>}
        </figure>
      );
    }

    case "quote":
      return (
        <blockquote className="border-l-4 border-brand bg-bg-alt px-5 py-4">
          <p className="font-display text-lg italic leading-relaxed text-ink">&ldquo;{block.text}&rdquo;</p>
          {block.by && <footer className="mt-2 text-sm font-medium text-brand">&mdash; {block.by}</footer>}
        </blockquote>
      );
  }
}

export function ArticleSections({
  sections,
  after,
}: {
  sections: ArticleSection[];
  /** What goes after the n-th section (1-based): the banners and ads set in the admin. */
  after?: (n: number) => ReactNode;
}) {
  return (
    <div className="mt-8 max-w-3xl space-y-6">
      {sections.map((section, i) => (
        <Fragment key={i}>
        <section
          id={sectionAnchor(section.heading, i)}
          className="scroll-mt-28 rounded-2xl border border-line bg-surface p-5 sm:p-7"
        >
          {section.heading && (
            <h2 className="relative pl-4 font-display text-xl font-bold text-ink before:absolute before:bottom-1 before:left-0 before:top-1 before:w-1.5 before:rounded-full before:bg-brand">
              {section.heading}
            </h2>
          )}
          <div className={`space-y-5 ${section.heading ? "mt-5" : ""}`}>
            {section.blocks.map((block, j) => (
              <Block key={j} block={block} />
            ))}
          </div>
        </section>
        {after?.(i + 1)}
        </Fragment>
      ))}
    </div>
  );
}
