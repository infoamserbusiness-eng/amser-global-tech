import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { CertificateView } from "@/components/participant";
import { LiveCertificate } from "@/components/learn-live";

export default async function Page({ params }: PageProps<"/estudiante/certificados/[slug]">) {
  const u = await requireRole("student");
  const { slug } = await params;
  return DEMO ? <CertificateView slug={slug} userId={u.id} /> : <LiveCertificate slug={slug} user={u} />;
}
