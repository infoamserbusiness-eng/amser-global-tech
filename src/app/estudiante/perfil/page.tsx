import { redirect } from "next/navigation";
import { ProfileModule } from "@/components/profile-module";
import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";

export default async function Page({ searchParams }: PageProps<"/estudiante/perfil">) {
  const u = await requireRole("student");
  if (DEMO) redirect("/estudiante");
  const sp = await searchParams;
  return <ProfileModule userId={u.id} role="student" msg={typeof sp.msg === "string" ? sp.msg : undefined} err={typeof sp.err === "string" ? sp.err : undefined} />;
}
