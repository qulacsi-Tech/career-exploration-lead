import { colleges } from "@/lib/mock-data";
import { CollegesAdmin } from "@/components/admin/colleges-admin";

/*
  Server component that hands the records to the client table. Reads the same
  mock-data module the public site uses, so the admin and the front end cannot
  show different colleges before the API lands.
*/
export default function AdminCollegesPage() {
  return <CollegesAdmin colleges={colleges} />;
}
