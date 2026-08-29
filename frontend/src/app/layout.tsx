import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { THEME_STORAGE_KEY, defaultTheme, themes } from "@/lib/themes";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollegeTime — Find Colleges, Courses & Exams",
  description:
    "Search, compare and shortlist colleges, courses and entrance exams across India.",
};

/*
  Applies the reviewer's saved palette before first paint.

  It has to be a blocking inline script: the palette lives on <html> and the
  server has no way to know which variant was picked, so doing this in an
  effect would paint the default first and flash a different colour mid-demo.
  The theme keys are inlined from the same list the switcher renders, so an
  edited or stale localStorage value can only ever resolve to a real palette.
*/
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(themes.map((t) => t.key))}.indexOf(t)>-1){document.documentElement.dataset.theme=t}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme={defaultTheme}
      // The script above rewrites data-theme before React hydrates.
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
