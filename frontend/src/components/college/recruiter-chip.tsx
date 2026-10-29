import { mediaUrl } from "@/lib/media";
import type { RecruiterBrief } from "@/lib/api";

/**
 * One recruiting company, drawn the way the Top Recruiters strip draws it: with a logo, the logo (and the name
 * beside it when the company is set to show it); with none, the name. The college page and the editor's preview
 * both use it, so what is previewed is what is shown.
 */
export function RecruiterChip({ name, logo = "", showName = true }: Partial<RecruiterBrief> & { name: string }) {
  if (!logo) return <>{name}</>;
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* Plain img: an upload comes from the API's origin, which is not in the optimiser's allow-list. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(logo)} alt={showName ? "" : name} className="h-7 w-auto max-w-[7.5rem] object-contain" />
      {showName && <span>{name}</span>}
    </span>
  );
}
