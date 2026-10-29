import { requireRole } from "@/lib/auth";
import { TrainerClasses } from "@/components/trainer";

export default async function Page() {
  const u = await requireRole("teacher");
  return <TrainerClasses userId={u.id} />;
}
