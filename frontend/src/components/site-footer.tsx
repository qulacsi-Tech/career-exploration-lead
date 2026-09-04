import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";

const footerColumns = [
  {
    title: "MBA",
    links: ["Top MBA Colleges", "MBA Colleges in Bangalore", "MBA Colleges in Pune", "MBA Fees", "CAT Exam"],
  },
  {
    title: "Engineering",
    links: ["Top Engineering Colleges", "B.Tech Colleges", "JEE Main", "JEE Advanced", "Engineering Predictor"],
  },
  {
    title: "Exams",
    links: ["CAT", "XAT", "CMAT", "Karnataka PGCET", "Exam Calendar"],
  },
  {
    title: "Company",
    links: ["About Us", "Contact Us", "Privacy Policy", "Terms of Use"],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-bold">Stay ahead of admission deadlines</p>
            <p className="mt-1 text-sm text-white/60">
              Exam dates, cutoffs and application windows — in your inbox, weekly.
            </p>
          </div>
          <form className="flex w-full max-w-sm gap-2">
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Subscribe
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          {/*
            Sized up from h-12 after the client reported it was hard to read:
            at 48px the tagline set at 5.5px, which is below what anyone can
            actually read. h-20 puts the wordmark at 21.7px and the tagline at
            9.1px, and the footer has the width for the 293px plate.

            `idPrefix` keeps this instance's gradient ids distinct from the
            header's — both lockups render on every page.
          */}
          <Link href="/" className="shrink-0" aria-label="TopCollegePath — home">
            <SiteLogo idPrefix="ctlogo-footer" className="h-20 w-auto" />
          </Link>
          <div className="flex flex-col gap-1 sm:items-end">
            <p>&copy; {new Date().getFullYear()} CollegeTime. All rights reserved.</p>
            <p>info@collegetime.example &middot; +91 80 4000 0000</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
