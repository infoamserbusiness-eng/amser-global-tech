import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { NewCourseForm } from "@/components/trainer";
import { LiveNewCourse } from "@/components/trainer-live";

export default async function Page() {
  const u = await requireRole("teacher");
  return DEMO ? <NewCourseForm userId={u.id} /> : <LiveNewCourse />;
}
