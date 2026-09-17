import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms that apply when you use TopCollegePath — accounts, reviews, the accuracy of listings, and the limits of what we provide.",
  alternates: { canonical: "/terms" },
};

/**
 * Terms of use.
 *
 * Like the privacy policy, this describes what the site actually does rather
 * than generic boilerplate — including the two clauses this particular product
 * needs: listing data is indicative and the institution's own published
 * information wins, and reviews belong to the student who wrote them, which is
 * the front-site half of the protection the 15 Sep MoM asks for.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="15 September 2026"
      intro="These terms apply whenever you use TopCollegePath. By browsing the site, submitting an enquiry or creating an account, you accept them."
      sections={[
        {
          heading: "What this site is",
          paragraphs: [
            "TopCollegePath is an information and counselling service. We publish details about colleges, courses and entrance exams, and we connect prospective students with institutions and counsellors.",
            "We are not a university, an examination body, or an admissions authority. We cannot offer, guarantee or influence admission to any institution.",
          ],
        },
        {
          heading: "Accuracy of listings",
          paragraphs: [
            "Fees, cutoffs, rankings, placement figures and deadlines change often and vary by course, category and intake. We take care to keep listings current, but they are indicative.",
            "Before you make a decision that matters — paying a fee, sitting an exam, accepting an offer — verify the details against the institution's own official published information. Where the two differ, theirs governs.",
          ],
        },
        {
          heading: "Your account",
          paragraphs: [
            "You are responsible for what happens under your account and for keeping your password to yourself. Tell us promptly if you believe someone else has access to it.",
            "Give accurate details when you register. We may suspend or close accounts that are used to impersonate someone else, to scrape the site, or to abuse other users.",
          ],
        },
        {
          heading: "Reviews and submitted content",
          paragraphs: [
            "Reviews must be your own honest experience. Do not post anything false, defamatory, or written in exchange for payment, and do not post on behalf of an institution.",
            "A review belongs to the student who wrote it. Colleges listed on this site cannot edit or remove reviews about them. We may remove content that breaks these terms or the law, and we will say why when we do.",
            "By posting, you give us a non-exclusive licence to display and distribute that content as part of the site.",
          ],
        },
        {
          heading: "Enquiries and contact",
          paragraphs: [
            "When you submit an enquiry, you are asking us and the relevant institutions to contact you about admissions. You can withdraw that consent at any time — see the privacy policy.",
          ],
        },
        {
          heading: "Acceptable use",
          paragraphs: ["You agree not to:"],
          bullets: [
            "copy, scrape or republish substantial parts of the site without permission,",
            "interfere with the site's operation or attempt to access areas you are not authorised to use,",
            "submit anything unlawful, misleading, or designed to harm another user, or",
            "use the site to send unsolicited marketing.",
          ],
        },
        {
          heading: "Third-party links",
          paragraphs: [
            "Listings link to institution websites, exam portals and other third-party pages. We do not control those sites and are not responsible for their content or their handling of your data.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "The site is provided as it is. To the extent the law allows, we are not liable for losses arising from decisions made on the basis of information published here, or from the site being unavailable.",
            "Nothing in these terms limits liability that cannot legally be limited.",
          ],
        },
        {
          heading: "Changes and contact",
          paragraphs: [
            "We may update these terms; the date at the top of this page shows when they last changed. Continuing to use the site after a change means you accept the updated terms.",
            "Questions: info@collegetime.example.",
          ],
        },
      ]}
      note="Working draft. This describes current practice but has not yet been reviewed by legal counsel — it should be before the site goes live."
    />
  );
}
