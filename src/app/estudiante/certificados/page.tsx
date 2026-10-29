import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { CertificateList } from "@/components/participant";
import { LiveCertificates } from "@/components/learn-live";

export default async function Page() {
  const u = await requireRole("student");
  return DEMO ? <CertificateList userId={u.id} /> : <LiveCertificates user={u} />;
}
