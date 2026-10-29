import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { StudentGrades } from "@/components/student";
import { LiveGrades } from "@/components/learn-live";

export default async function Page() {
  const u = await requireRole("student");
  return DEMO ? <StudentGrades userId={u.id} /> : <LiveGrades user={u} />;
}
