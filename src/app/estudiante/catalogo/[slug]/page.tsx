import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { CatalogDetail } from "@/components/participant";
import { LiveCatalogDetail } from "@/components/learn-live";

export default async function Page({ params, searchParams }: PageProps<"/estudiante/catalogo/[slug]">) {
  const u = await requireRole("student");
  const { slug } = await params;
  if (DEMO) return <CatalogDetail slug={slug} userId={u.id} />;
  const sp = await searchParams;
  return <LiveCatalogDetail slug={slug} user={u} err={typeof sp.err === "string" ? sp.err : undefined} />;
}
