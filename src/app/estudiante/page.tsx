import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { ParticipantDashboard } from "@/components/participant";
import { LiveDashboard } from "@/components/learn-live";

export default async function Page() {
  const u = await requireRole("student");
  return DEMO ? <ParticipantDashboard userId={u.id} name={u.name} /> : <LiveDashboard user={u} />;
}
