import { specialisations, courses } from "@/lib/mock-data";
import { SpecialisationsAdmin } from "@/components/admin/specialisations-admin";

export default function AdminSpecialisationsPage() {
  return <SpecialisationsAdmin specialisations={specialisations} courses={courses} />;
}
