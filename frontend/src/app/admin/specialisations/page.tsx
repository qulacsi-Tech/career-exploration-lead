import { redirect } from "next/navigation";

/** Specialisations now live on the Catalogue page, beside Categories and Courses. */
export default function AdminSpecialisationsPage() {
  redirect("/admin/catalogue?tab=specialisations");
}
