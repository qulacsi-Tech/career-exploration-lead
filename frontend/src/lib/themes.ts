/**
 * The red-family palette variants offered in the homepage colour switcher.
 *
 * `key` matches the [data-theme="…"] blocks in app/globals.css — the palette
 * itself lives there, in CSS, so switching is a single attribute write with no
 * re-render. What is duplicated here is only what the UI needs to *draw* a
 * swatch: a name and two representative hexes. Kept deliberately small, since
 * a swatch cannot read a custom property for a theme that is not applied.
 */
export type Theme = {
  key: string;
  name: string;
  /** The accent: buttons, links, the full-bleed brand sections. */
  brand: string;
  /** The light band under the Top Colleges / Top Exams cards. */
  band: string;
};

/** Kept for reference while the switcher is parked; see `defaultTheme` below. */
export const themes: Theme[] = [
  { key: "rose", name: "Rose", brand: "#ce4355", band: "#ffbdbf" },
  { key: "crimson", name: "Deep Crimson", brand: "#b71730", band: "#f79f9d" },
  { key: "maroon", name: "Maroon", brand: "#852f29", band: "#e8ada6" },
  { key: "wine", name: "Wine", brand: "#913163", band: "#e3a1bd" },
  { key: "blush", name: "Blush Pink", brand: "#c04e6f", band: "#ffcbd5" },
  { key: "coral", name: "Coral", brand: "#c94c33", band: "#ffc4b7" },
  { key: "tangerine", name: "Tangerine", brand: "#b65d00", band: "#ffcba9" },
];

/*
  The palette the client signed off on. This was `themes[0].key` (rose) while
  the switcher was live; it is pinned now that the review is settled.

  :root in globals.css still carries the rose values, and [data-theme="tangerine"]
  overrides them — layout.tsx stamps that attribute on <html>. Left that way on
  purpose: the variants cost nothing while unused, and reviving the switcher is
  a matter of uncommenting rather than rebuilding the palette.
*/
export const defaultTheme = "tangerine";

/** Where the pick is remembered, so a refresh mid-demo keeps the colour. */
export const THEME_STORAGE_KEY = "ct-theme";
