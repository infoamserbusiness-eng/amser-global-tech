import { redirect } from "next/navigation";
import { NotificationsLive } from "@/components/notifications-live";
import { DEMO } from "@/lib/mode";

export default function Page() {
  if (DEMO) redirect("/estudiante");
  return <NotificationsLive path="/estudiante/avisos" />;
}
