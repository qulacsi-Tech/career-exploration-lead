import { AdminPageHeader } from "@/components/admin/admin-section";
import { NotificationCenter } from "@/components/notifications/notification-center";

/*
  Everything the team and college admins are told about, kept live over a socket. Some ask for an
  acknowledgement, and are pinned until given one. It is the same list as the bell, in full.
*/
export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Notifications" description="What needs your attention. Some ask you to acknowledge them." />
      <NotificationCenter />
    </div>
  );
}
