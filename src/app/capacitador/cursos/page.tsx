import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { TrainerCourses } from "@/components/trainer";
import { LiveCourses } from "@/components/trainer-live-server";

export default async function Page() {
  const u = await requireRole("teacher");
  return DEMO ? <TrainerCourses userId={u.id} /> : <LiveCourses userId={u.id} />;
}
