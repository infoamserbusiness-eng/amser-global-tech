import { requireRole } from "@/lib/auth";
import { TrainerEarnings } from "@/components/trainer";

export default async function Page() {
  const u = await requireRole("teacher");
  return <TrainerEarnings userId={u.id} />;
}
