import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { TrainerDashboard } from "@/components/trainer";
import { LiveDashboard } from "@/components/trainer-live-server";

export default async function Page() {
  const u = await requireRole("teacher");
  const name = `${u.title ?? ""} ${u.name}`.trim();
  return DEMO ? <TrainerDashboard userId={u.id} name={name} /> : <LiveDashboard userId={u.id} name={name} />;
}
