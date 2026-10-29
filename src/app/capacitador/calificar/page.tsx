import { requireRole } from "@/lib/auth";
import { TeacherGrading } from "@/components/teacher";

export default async function Page() {
  const u = await requireRole("teacher");
  return <TeacherGrading userId={u.id} />;
}
