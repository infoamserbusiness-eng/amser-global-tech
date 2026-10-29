import { redirect } from "next/navigation";
import { ProfileModule } from "@/components/profile-module";
import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";

export default async function Page({ searchParams }: PageProps<"/capacitador/perfil">) {
  const u = await requireRole("teacher");
  if (DEMO) redirect("/capacitador");
  const sp = await searchParams;
  return <ProfileModule userId={u.id} role="teacher" msg={typeof sp.msg === "string" ? sp.msg : undefined} err={typeof sp.err === "string" ? sp.err : undefined} />;
}
