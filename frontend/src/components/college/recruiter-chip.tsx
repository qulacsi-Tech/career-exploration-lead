import { mediaUrl } from "@/lib/media";
import type { RecruiterBrief } from "@/lib/api";

/**
 * One recruiting company, drawn the way the Top Recruiters strip draws it. With a logo it shows what the
 * company is set to: the logo alone (the default), the name alone, or both. With no logo it shows the name.
 * The college page and the editor's preview both use it, so what is previewed is what is shown.
 */
export function RecruiterChip({ name, logo = "", display = "logo" }: Partial<RecruiterBrief> & { name: string }) {
  if (!logo || display === "name") return <>{name}</>;
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* Plain img: an upload comes from the API's origin, which is not in the optimiser's allow-list. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl(logo)}
        alt={display === "both" ? "" : name}
        className={`w-auto shrink-0 object-contain ${display === "both" ? "h-9 max-w-[8rem]" : "h-11 max-w-[11rem]"}`}
      />
      {display === "both" && <span>{name}</span>}
    </span>
  );
}
