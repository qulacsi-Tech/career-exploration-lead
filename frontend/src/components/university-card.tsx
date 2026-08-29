import Link from "next/link";
import Image from "next/image";

export function UniversityCard({
  university,
}: {
  university: { slug: string; name: string; city: string; state: string };
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand/40 hover:shadow-sm">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-bg-alt">
        <Image
          src={`/images/universities/${university.slug}.svg`}
          alt={`${university.name} campus`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-5 text-center">
        <Link
          href={`/college/${university.slug}`}
          className="font-display text-base font-semibold text-ink hover:text-brand"
        >
          {university.name}
        </Link>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-sm text-ink-soft">
          <PinIcon className="h-4 w-4 shrink-0 text-brand" />
          {university.city}, {university.state}
        </p>
        <Link
          href={`/college/${university.slug}`}
          className="mt-5 block rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
        >
          Know More
        </Link>
      </div>
    </article>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10 18s6-5.2 6-9.8A6 6 0 0 0 4 8.2C4 12.8 10 18 10 18Zm0-7.8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
