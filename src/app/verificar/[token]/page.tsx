import { SiteFooter, SiteHeader } from "@/components/site";
import { ROLE_NOUN } from "@/lib/profile";
import { adminConfigured, supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Verificación de credencial — Amser Global Tech", robots: { index: false, follow: false } };

// Página pública a la que lleva el QR de la credencial. Muestra solo nombre, rol, foto y vigencia; nunca documentos ni datos de contacto.
export default async function Verificar({ params }: PageProps<"/verificar/[token]">) {
  const { token } = await params;
  let found: { name: string; role: string; profession: string | null; docEnd: string | null; active: boolean; photo: string | null } | null = null;
  if (/^[0-9a-f-]{36}$/i.test(token) && adminConfigured()) {
    const admin = supabaseAdmin();
    const { data: d } = await admin.from("profile_details").select("profile_id, profession, avatar_path").eq("card_token", token).maybeSingle();
    if (d) {
      const { data: p } = await admin.from("profiles").select("full_name, role, doc_id, is_active").eq("id", d.profile_id).maybeSingle();
      if (p) {
        const photo = d.avatar_path ? (await admin.storage.from("profile-files").createSignedUrl(d.avatar_path, 600)).data?.signedUrl ?? null : null;
        found = { name: p.full_name ?? "—", role: ROLE_NOUN[p.role] ?? p.role, profession: d.profession, docEnd: p.doc_id ? `••••••${p.doc_id.slice(-3)}` : null, active: p.is_active, photo };
      }
    }
  }
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-surface-2 px-4 py-14">
        <div className="card w-full max-w-md overflow-hidden text-center">
          {found ? (
            <>
              <div className="px-6 py-4 text-white" style={{ background: found.active ? "linear-gradient(90deg,#22b24c,#0b57c7)" : "#c0392b" }}>
                <p className="text-2xl font-extrabold">{found.active ? "✔ Credencial vigente" : "✖ Credencial no vigente"}</p>
                <p className="text-xs uppercase tracking-widest text-white/80">Amser Global Tech</p>
              </div>
              <div className="p-6">
                <div className="mx-auto mb-4 h-32 w-28 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">
                  {found.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={found.photo} alt={`Foto de ${found.name}`} className="h-full w-full object-cover" />
                  ) : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue to-green font-display text-5xl font-extrabold text-white">{found.name[0]}</div>}
                </div>
                <h1 className="font-display text-xl font-extrabold">{found.name}</h1>
                <p className="mt-1"><span className="badge badge-blue">{found.role}</span></p>
                {found.profession && <p className="mt-2 text-sm text-soft">{found.profession}</p>}
                {found.docEnd && <p className="mt-1 text-xs text-soft">C.I. {found.docEnd}</p>}
                <p className="mt-5 text-xs text-soft">Verifica que la persona que se presenta coincida con la foto y el nombre.</p>
              </div>
            </>
          ) : (
            <div className="p-8"><p className="text-4xl">⚠</p><h1 className="mt-2 font-display text-xl font-extrabold">Credencial no encontrada</h1><p className="mt-2 text-sm text-soft">El código no corresponde a ninguna credencial de Amser Global Tech. Si crees que es un error, contacta a administración.</p></div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
