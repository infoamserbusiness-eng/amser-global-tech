import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { StudentPayments } from "@/components/student";
import { LivePayments } from "@/components/learn-live";

export default async function Page({ searchParams }: PageProps<"/estudiante/pagos">) {
  const u = await requireRole("student");
  if (DEMO) return <StudentPayments userId={u.id} />;
  const sp = await searchParams;
  return <LivePayments user={u} msg={typeof sp.msg === "string" ? sp.msg : undefined} />;
}
