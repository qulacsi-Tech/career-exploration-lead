/**
 * Sample figures for the admin dashboard.
 *
 * Separate from lib/mock-data (which stands in for real records the public site
 * renders) because these are illustrative only — they exist so the dashboard
 * reads like a populated system during review rather than a grid of dashes.
 * The screen labels them as sample so nobody demos them as live numbers.
 *
 * Deliberately not derived from the mock records: there are three colleges in
 * the directory, and "3" on a dashboard tile reads as a broken query rather
 * than an early-stage CMS.
 */

export type DashboardStat = {
  label: string;
  value: string;
  /** Change vs the previous period; sign drives the arrow direction. */
  delta?: { value: string; direction: "up" | "down" };
  href: string;
};

export const dashboardStats: DashboardStat[] = [
  { label: "Colleges", value: "1,284", delta: { value: "12 added", direction: "up" }, href: "/admin/colleges" },
  { label: "Courses", value: "486", delta: { value: "4 added", direction: "up" }, href: "/admin/courses" },
  { label: "Exams", value: "152", delta: { value: "2 added", direction: "up" }, href: "/admin/exams" },
  { label: "New leads", value: "342", delta: { value: "18%", direction: "up" }, href: "/admin/leads" },
];

/** Fourteen days of enquiries, oldest first. */
export const leadsByDay: { date: string; count: number }[] = [
  { date: "22 Aug", count: 18 },
  { date: "23 Aug", count: 24 },
  { date: "24 Aug", count: 15 },
  { date: "25 Aug", count: 31 },
  { date: "26 Aug", count: 27 },
  { date: "27 Aug", count: 22 },
  { date: "28 Aug", count: 12 },
  { date: "29 Aug", count: 29 },
  { date: "30 Aug", count: 34 },
  { date: "31 Aug", count: 41 },
  { date: "1 Sep", count: 38 },
  { date: "2 Sep", count: 26 },
  { date: "3 Sep", count: 33 },
  { date: "4 Sep", count: 45 },
];

export const leadSources: { label: string; count: number }[] = [
  { label: "College enquiry form", count: 486 },
  { label: "Organic search", count: 312 },
  { label: "Brochure download", count: 204 },
  { label: "Counselling request", count: 148 },
  { label: "Callback request", count: 96 },
];

export const recentLeads: {
  name: string;
  interest: string;
  city: string;
  received: string;
  status: "New" | "Contacted" | "Qualified";
}[] = [
  { name: "Priya Sharma", interest: "MBA · Eastwind Institute", city: "Pune", received: "12 min ago", status: "New" },
  { name: "Rahul Verma", interest: "B.Tech · Computer Science", city: "Bengaluru", received: "48 min ago", status: "New" },
  { name: "Ananya Iyer", interest: "MBA · Business Analytics", city: "Chennai", received: "2 hours ago", status: "Contacted" },
  { name: "Karan Mehta", interest: "LLB · Corporate Law", city: "Delhi NCR", received: "3 hours ago", status: "Contacted" },
  { name: "Sneha Reddy", interest: "MBBS", city: "Hyderabad", received: "5 hours ago", status: "Qualified" },
];

export const attentionQueues: {
  label: string;
  count: number;
  description: string;
  href: string;
}[] = [
  {
    label: "Reviews awaiting moderation",
    count: 23,
    description: "Held back from the college pages until approved.",
    href: "/admin/reviews",
  },
  {
    label: "Records missing SEO fields",
    count: 47,
    description: "Published without a meta title or description.",
    href: "/admin/seo",
  },
  {
    label: "Leads not yet contacted",
    count: 61,
    description: "Older than 24 hours with no follow-up logged.",
    href: "/admin/leads",
  },
];
