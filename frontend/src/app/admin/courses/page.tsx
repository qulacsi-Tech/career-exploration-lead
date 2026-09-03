import { courses } from "@/lib/mock-data";
import { CoursesAdmin } from "@/components/admin/courses-admin";

export default function AdminCoursesPage() {
  return <CoursesAdmin courses={courses} />;
}
