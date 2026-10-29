import { saveDetails } from "@/lib/profile-actions";
import { DOC_KINDS, ROLE_NOUN, loadProfile } from "@/lib/profile";
import { CredentialCard } from "./credential-card";
import { AvatarUploader, DocumentsPanel, PrintButton } from "./profile-client";
import { Empty, PageTitle, Progress } from "./ui";

// «Mi perfil»: credencial electrónica con QR, foto, datos personales y documentos. Lo usan capacitadores y participantes.
export async function ProfileModule({ userId, role, msg, err }: { userId: string; role: "teacher" | "student"; msg?: string; err?: string }) {
  const data = await loadProfile(userId, true);
  if (!data || !data.details) return <Empty>No se pudo cargar tu perfil. Recarga la página.</Empty>;
  const { profile, details: d, docs, avatarUrl } = data;
  const kinds = DOC_KINDS[role];

  const fields = [d.phone, d.birth_date, d.nationality, d.city, d.address, d.profession, d.bio, d.avatar_path];
  const requiredDocs = kinds.filter((k) => k[2]);
  const done = fields.filter(Boolean).length + requiredDocs.filter(([k]) => docs.some((x) => x.kind === k)).length;
  const total = fields.length + requiredDocs.length;
  const pct = Math.round((done / total) * 100);

  return (
    <>
      <div className="no-print"><PageTitle title="Mi perfil" sub="Tu credencial, tu foto, tus datos personales y tus documentos." /></div>
      {msg && <p role="status" className="no-print mb-4 rounded-lg bg-[rgba(34,178,76,.12)] p-3 text-sm text-ok">✔ {msg}</p>}
      {err && <p role="alert" className="no-print mb-4 rounded-lg bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">⚠ {err}</p>}

      <div className="no-print card card-pad mb-6">
        <div className="mb-1 flex justify-between text-sm"><b>Perfil completo al {pct}%</b><span className="text-soft">{done} de {total} elementos</span></div>
        <Progress value={pct} />
        {pct < 100 && <p className="mt-2 text-xs text-soft">Completa tus datos, sube tu foto y los documentos obligatorios para tener tu perfil al 100%.</p>}
      </div>

      <section className="mb-8">
        <h2 className="no-print mb-3 font-bold">Credencial electrónica</h2>
        <CredentialCard name={profile.full_name ?? "—"} roleLabel={ROLE_NOUN[profile.role]} docId={profile.doc_id} profession={d.profession} avatarUrl={avatarUrl} token={d.card_token} active={profile.is_active} />
        <div className="no-print mt-3 flex flex-wrap items-center justify-center gap-3 text-center">
          <PrintButton />
          <span className="text-xs text-soft">El QR lleva a una página pública que confirma que tu credencial está vigente (sin mostrar tus documentos).</span>
        </div>
      </section>

      <div className="no-print grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <section className="card card-pad">
            <h2 className="mb-3 font-bold">Foto de perfil</h2>
            <div className="mb-3 h-32 w-28 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Tu foto de perfil" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue to-green font-display text-5xl font-extrabold text-white">{(profile.full_name ?? "?")[0]}</div>
              )}
            </div>
            <AvatarUploader userId={userId} hasPhoto={!!avatarUrl} />
          </section>

          <form action={saveDetails} className="card card-pad space-y-3">
            <h2 className="font-bold">Datos personales</h2>
            <div><label className="label">Nombre completo</label><input className="input bg-surface-2" value={profile.full_name ?? ""} readOnly aria-readonly /></div>
            <div><label className="label">Cédula (tu usuario)</label><input className="input bg-surface-2" value={profile.doc_id ?? ""} readOnly aria-readonly /></div>
            <p className="-mt-1 text-xs text-soft">Si tu nombre o cédula tienen un error, pide a administración que los corrija.</p>
            <div><label className="label" htmlFor="pf-prof">Profesión / título</label><input id="pf-prof" name="profession" className="input" maxLength={120} defaultValue={d.profession ?? ""} placeholder="Ej.: Ingeniero Ambiental" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="pf-phone">Teléfono / WhatsApp</label><input id="pf-phone" name="phone" className="input" maxLength={30} defaultValue={d.phone ?? ""} autoComplete="tel" /></div>
              <div><label className="label" htmlFor="pf-birth">Fecha de nacimiento</label><input id="pf-birth" name="birth" type="date" className="input" defaultValue={d.birth_date ?? ""} /></div>
              <div><label className="label" htmlFor="pf-nat">Nacionalidad</label><input id="pf-nat" name="nationality" className="input" maxLength={60} defaultValue={d.nationality ?? ""} /></div>
              <div><label className="label" htmlFor="pf-city">Ciudad</label><input id="pf-city" name="city" className="input" maxLength={80} defaultValue={d.city ?? ""} /></div>
            </div>
            <div><label className="label" htmlFor="pf-addr">Dirección</label><input id="pf-addr" name="address" className="input" maxLength={200} defaultValue={d.address ?? ""} autoComplete="street-address" /></div>
            <div><label className="label" htmlFor="pf-bio">{role === "teacher" ? "Resumen profesional" : "Sobre mí"}</label><textarea id="pf-bio" name="bio" className="textarea" rows={4} maxLength={1200} defaultValue={d.bio ?? ""} placeholder={role === "teacher" ? "Tu experiencia y áreas de especialidad (se muestra a los participantes)." : "Cuéntanos un poco sobre ti."} /></div>
            <button className="btn btn-primary">Guardar datos</button>
          </form>
        </div>

        <section className="card card-pad">
          <h2 className="mb-1 font-bold">Documentos</h2>
          <p className="mb-4 text-sm text-soft">Adjunta tus documentos para que administración los verifique. Los obligatorios están marcados.</p>
          <DocumentsPanel userId={userId} kinds={kinds} docs={docs} />
        </section>
      </div>
    </>
  );
}
