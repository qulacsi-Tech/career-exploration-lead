import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What TopCollegePath collects when you enquire or create an account, how it is used, and who it is shared with.",
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy policy.
 *
 * The footer has linked here since it was written, so the page needed to exist.
 * The content is a working draft that describes what the site actually does
 * today — an enquiry form that passes details to colleges, and accounts that
 * are not live yet — rather than boilerplate copied from another site, which is
 * how policies end up describing practices a company does not follow.
 *
 * It must still go past whoever signs off legal text before launch; the note at
 * the foot says so, and should be removed at the same time it is approved.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="17 October 2026"
      intro="This policy explains what we collect when you use TopCollegePath, why we collect it, and what choices you have. It covers this website only."
      sections={[
        {
          heading: "What we collect",
          paragraphs: ["We collect two kinds of information: what you give us, and what your visit generates."],
          bullets: [
            "Details you submit — name, email, phone number, preferred stream and city, and anything you type into an enquiry or counselling form.",
            "Account details, if you create an account: your name, email, an optional phone number, and a password we store only as a cryptographic hash. If you sign in with Google we receive your name, email address and profile photo from Google, and nothing else. We never see your Google password.",
            "Profile details you choose to add: your state, city, the stream you are interested in and the exam you are preparing for.",
            "Usage data, only if you accept analytics: the pages you view, what you search for, the buttons you click, how far you scroll, how long you stay, colleges you add to compare, and the steps you take in an enquiry form (never what you type into it). We also note your device type, browser, operating system and where you arrived from.",
          ],
        },
        {
          heading: "How we use it",
          paragraphs: [
            "Enquiry details are used to arrange counselling: a counsellor contacts you about courses, colleges and admission timelines that match what you asked for.",
            "Usage data is used to keep the site working and to decide what to improve — which comparisons people run, which listings are hard to find. It is anonymous, identified only by a random number in a cookie, until you sign in or send an enquiry. From then on we link what you did before to your account, so our counsellors can see which colleges you have been looking at and help you better, and so you can see your own activity under My account.",
            "If you have an account, the enquiries you send and the replies we write back are shown to you under My account.",
          ],
        },
        {
          heading: "Who we share it with",
          paragraphs: [
            "When you submit an enquiry about a specific college or course, we pass your contact details and stated preferences to the relevant institution or its admissions representative so they can respond. This is the purpose of the form, and submitting it is your consent to that.",
            "We also use service providers — hosting, email delivery, analytics — who process data on our instructions and are not permitted to use it for their own purposes. We do not sell your personal information.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "We use cookies to keep you signed in, which the site needs in order to work. With your permission we also set one anonymous visitor cookie, valid for a year, to understand how the site is used. When you first visit we ask whether to allow this. If you choose “No thanks”, no visitor cookie is set and nothing about your browsing is recorded. Your comparison shortlist is held in your browser's session storage and is cleared when you close the tab — it never reaches our servers.",
            "You can block or delete cookies in your browser at any time. Clearing the site's cookies also clears your analytics choice, so we will ask again. Parts of the site that depend on cookies, such as staying signed in, will stop working if you block them.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Enquiry records are kept for as long as needed to provide counselling and to meet our record-keeping obligations, and are then deleted. Account data is kept until you delete the account. Browsing activity is kept for up to 13 months and is then deleted or reduced to anonymous totals.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: ["You can ask us to:"],
          bullets: [
            "send you a copy of the personal data we hold about you,",
            "correct anything inaccurate,",
            "delete your data, subject to any records we are required to retain, and",
            "stop contacting you — you can opt out of calls, email and WhatsApp at any time.",
          ],
        },
        {
          heading: "Children",
          paragraphs: [
            "The site is intended for prospective students aged 16 and over. If you believe a child has given us personal data, contact us and we will remove it.",
          ],
        },
        {
          heading: "Changes and contact",
          paragraphs: [
            "If this policy changes materially we will update the date at the top of this page and, where the change affects how we use data you have already given us, tell you directly.",
            "Questions or requests: info@collegetime.example.",
          ],
        },
      ]}
      note="Working draft. This describes current practice but has not yet been reviewed by legal counsel — it should be before the site goes live."
    />
  );
}
