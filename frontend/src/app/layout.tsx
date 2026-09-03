import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { defaultTheme } from "@/lib/themes";

/*
  Self-hosted rather than pulled from `next/font/google`. The Google loader
  downloads at build time, so a network blip or a CI box without egress swaps
  the whole site's typography for a system fallback — silently, with only a
  warning in the log. These are the same files Google serves (latin subset,
  variable axis), committed so builds are reproducible and work offline.

  Both are variable fonts, hence the weight ranges: one file covers every
  weight, so `font-bold` and friends keep working.
*/
const sora = localFont({
  src: "./fonts/sora-latin-var.woff2",
  variable: "--font-sora",
  weight: "100 800",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "CollegeTime — Find Colleges, Courses & Exams",
  description:
    "Search, compare and shortlist colleges, courses and entrance exams across India.",
};

/*
  Palette bootstrap — parked along with the switcher.

  This read the reviewer's saved palette from localStorage before first paint.
  With the switcher gone it would do harm rather than good: anyone who tried a
  variant during review still has that key stored, and it would keep overriding
  the signed-off palette with no UI left to change it back. The <html> attribute
  below is now the single source of truth.

  To revive the switcher, restore this and the <script> in <head>, and put
  <ThemeSwitcher /> back on the homepage.

const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(themes.map((t) => t.key))}.indexOf(t)>-1){document.documentElement.dataset.theme=t}}catch(e){}})()`;
*/

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme={defaultTheme}
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
