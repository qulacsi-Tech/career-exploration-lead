import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PasswordCard } from "@/components/account/password-card";
import { ProfileForm } from "@/components/account/profile-form";
import { getExams, getHomeData, getIndiaGeo } from "@/lib/api";
import { getCurrentUser } from "@/lib/user-session";

export const metadata: Metadata = {
  title: "My account — TopCollegePath",
  robots: { index: false, follow: false },
};

/**
 * The Profile tab. These details prefill the enquiry form, so a counsellor
 * request takes seconds instead of a full form.
 *
 * `?welcome=new` is set by the sign-in that created the account, `?welcome=back`
 * by one that found an existing one.
 */
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  // The lists come from the same data as the admin panel and the enquiry form.
  // The form still works with an empty list if one request fails.
  const [{ welcome }, user, geo, streams, exams] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getIndiaGeo().catch(() => ({})),
    getHomeData().then((h) => h.streams.map((s) => ({ slug: s.slug, name: s.name }))).catch(() => []),
    getExams({ limit: 100 }).then((r) => r.data.map((e) => ({ slug: e.slug, name: e.name }))).catch(() => []),
  ]);
  // The layout has already sent a visitor with no session to the login page.
  if (!user) return null;

  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <>
      {(welcome === "new" || welcome === "back") && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-4 text-sm text-brand-ink">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {welcome === "new" ? (
              <>
                <span className="font-semibold">Welcome, {firstName}! Your account is created.</span> Add your phone, city
                and stream below so enquiries take seconds.
              </>
            ) : (
              <>
                <span className="font-semibold">Welcome back, {firstName}.</span> Your enquiries and replies are in the tabs
                above.
              </>
            )}
          </p>
        </div>
      )}

      <ProfileForm profile={user} geo={geo} streams={streams} exams={exams} />
      <PasswordCard email={user.email} hasPassword={user.hasPassword} />
    </>
  );
}
