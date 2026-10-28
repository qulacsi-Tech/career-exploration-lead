import { SiteLogo } from "@/components/site-logo";
import { mediaUrl } from "@/lib/media";
import type { LogoConfig } from "@/lib/api";

/**
 * A logo spot: the picture and/or text the admin set under Navigation > Header & Footer, or the built-in mark
 * when neither was. `className` sizes the picture (a height, with the width following); text sits beside it.
 * `surface` is the ground it is on, so the text and the built-in mark pick a readable colour.
 */
export function BrandLogo({
  logo,
  className,
  surface = "light",
  idPrefix,
}: {
  logo?: LogoConfig;
  className?: string;
  surface?: "light" | "dark";
  idPrefix?: string;
}) {
  const { image = "", text = "", alt = "" } = logo ?? {};
  if (!image && !text) return <SiteLogo className={className} surface={surface} idPrefix={idPrefix} />;

  return (
    <span className="inline-flex items-center gap-3 text-left">
      {image && (
        // Plain img: an upload comes from the API's origin, which is not in the optimiser's allow-list.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(image)} alt={text ? alt : alt || "TopCollegePath"} className={`${className ?? ""} object-contain object-left`} />
      )}
      {text && <span className={`font-display text-2xl font-extrabold leading-none ${surface === "dark" ? "text-white" : "text-ink"}`}>{text}</span>}
    </span>
  );
}
