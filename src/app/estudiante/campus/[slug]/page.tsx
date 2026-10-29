import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { Campus } from "@/components/Campus";
import { LiveCampus } from "@/components/learn-live";

export default async function Page({ params }: PageProps<"/estudiante/campus/[slug]">) {
  const u = await requireRole("student");
  const { slug } = await params;
  return DEMO ? <Campus slug={slug} role="student" userId={u.id} /> : <LiveCampus slug={slug} user={u} />;
}
