"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getConsent, setConsent } from "@/lib/analytics";

/**
 * Asks once whether the site may record what visitors look at and click.
 *
 * Shown on the public site until the visitor chooses; the choice is a cookie, so
 * it is not asked again. Declining is as easy as accepting and changes nothing
 * about what the site can do. Hidden on the first render and decided after mount,
 * so the server and browser agree on the HTML.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // The cookie only exists in the browser, so this cannot be read during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(getConsent() === null);
  }, []);

  // Staff using the admin panel are not visitors, and nothing there is tracked.
  if (!visible || pathname.startsWith("/admin")) return null;

  const choose = (choice: "granted" | "denied") => {
    setConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-surface p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:p-5"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-ink-soft">
          We use cookies to understand how you use TopCollegePath, so we can improve your experience and guide you to
          the right colleges. Read how in our{" "}
          <Link href="/privacy" className="font-semibold text-brand hover:underline">
            privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
