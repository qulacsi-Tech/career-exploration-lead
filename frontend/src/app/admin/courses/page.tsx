import { redirect } from "next/navigation";

/** Courses now live on the Catalogue page, beside Categories and Specialisations. */
export default function AdminCoursesPage() {
  redirect("/admin/catalogue?tab=courses");
}
