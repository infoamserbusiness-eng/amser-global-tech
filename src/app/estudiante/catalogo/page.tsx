import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { Catalog } from "@/components/participant";
import { LiveCatalog } from "@/components/learn-live";

export default async function Page() {
  const u = await requireRole("student");
  return DEMO ? <Catalog userId={u.id} /> : <LiveCatalog user={u} />;
}
