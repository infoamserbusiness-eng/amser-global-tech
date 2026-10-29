import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { StudentCourses } from "@/components/student";
import { LiveMyCourses } from "@/components/learn-live";

export default async function Page() {
  const u = await requireRole("student");
  return DEMO ? <StudentCourses userId={u.id} /> : <LiveMyCourses user={u} />;
}
