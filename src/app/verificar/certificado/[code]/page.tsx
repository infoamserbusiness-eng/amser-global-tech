import { SiteFooter, SiteHeader } from "@/components/site";
import { fmtDate } from "@/lib/data";
import { adminConfigured, supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Verificación de certificado — Amser Global Tech", robots: { index: false, follow: false } };

// Página pública a la que lleva el QR del certificado: confirma que el certificado existe y está emitido.
export default async function Page({ params }: PageProps<"/verificar/certificado/[code]">) {
  const { code } = await params;
  let found: { name: string; course: string; score: number; at: string } | null = null;
  if (/^[A-Z0-9-]{8,40}$/.test(code) && adminConfigured()) {
    const db = supabaseAdmin();
    const { data: c } = await db.from("certificates").select("enrollment_id, score, issued_at, status").eq("code", code).eq("status", "emitido").maybeSingle();
    if (c) {
      const { data: e } = await db.from("enrollments").select("course_id, participant_id").eq("id", c.enrollment_id).single();
      const { data: course } = await db.from("courses").select("title").eq("id", e!.course_id).single();
      const { data: p } = await db.from("profiles").select("full_name").eq("id", e!.participant_id).single();
      found = { name: p?.full_name ?? "—", course: course?.title ?? "—", score: c.score, at: c.issued_at };
    }
  }
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-surface-2 px-4 py-14">
        <div className="card w-full max-w-md overflow-hidden text-center">
          {found ? (
            <>
              <div className="px-6 py-4 text-white" style={{ background: "linear-gradient(90deg,#22b24c,#0b57c7)" }}><p className="text-2xl font-extrabold">✔ Certificado válido</p><p className="text-xs uppercase tracking-widest text-white/80">Amser Global Tech</p></div>
              <div className="space-y-2 p-6"><p className="text-sm text-soft">Se certifica que</p><h1 className="font-display text-xl font-extrabold">{found.name}</h1><p className="text-sm text-soft">aprobó el curso</p><p className="font-display text-lg font-bold text-blue">{found.course}</p><p className="text-sm text-soft">con una calificación de <b className="text-text">{found.score}%</b></p><p className="text-xs text-soft">Emitido el {fmtDate(found.at)} · Código {code}</p></div>
            </>
          ) : <div className="p-8"><p className="text-4xl">⚠</p><h1 className="mt-2 font-display text-xl font-extrabold">Certificado no encontrado</h1><p className="mt-2 text-sm text-soft">El código no corresponde a un certificado emitido por Amser Global Tech.</p></div>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
