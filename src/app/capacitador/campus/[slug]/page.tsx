import { requireRole } from "@/lib/auth";
import { Campus } from "@/components/Campus";

// El curso puede ser uno creado por el capacitador (solo existe en el cliente en modo demo): el Campus valida que exista.
export default async function Page({ params }: PageProps<"/capacitador/campus/[slug]">) {
  const u = await requireRole("teacher");
  const { slug } = await params;
  return <Campus slug={slug} role="teacher" userId={u.id} />;
}
