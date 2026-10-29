"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDocument, documentUrl, removeDocument, saveAvatar } from "@/lib/profile-actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/data";

const safe = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);

// Foto del perfil: se sube al almacenamiento privado y aparece en el perfil y en la credencial.
export function AvatarUploader({ userId, hasPhoto }: { userId: string; hasPhoto: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Elegir foto de perfil" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setErr("");
        if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) return setErr("Usa una imagen JPG, PNG o WebP.");
        if (f.size > 5 * 1024 * 1024) return setErr("La foto no debe superar 5 MB.");
        setBusy(true);
        const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/avatar/${crypto.randomUUID()}.${ext}`;
        const up = await supabaseBrowser().storage.from("profile-files").upload(path, f, { contentType: f.type });
        if (up.error) { setBusy(false); return setErr("No se pudo subir la foto. Inténtalo de nuevo."); }
        const r = await saveAvatar(path);
        setBusy(false);
        if (!r.ok) return setErr(r.error ?? "Error al guardar la foto.");
        router.refresh();
      }} />
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Subiendo…" : hasPhoto ? "📷 Cambiar foto" : "📷 Subir foto"}</button>
      <p className="mt-1 text-xs text-soft">JPG, PNG o WebP · máx. 5 MB · rostro de frente, fondo claro.</p>
      {err && <p role="alert" className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}

type Doc = { id: string; kind: string; name: string; storage_path: string; status: string; note: string | null; uploaded_at: string; size_bytes: number | null };
const BADGE: Record<string, [string, string]> = { pendiente: ["En revisión", "badge badge-warn"], verificado: ["Verificado", "badge badge-green"], observado: ["Observado", "badge badge-red"] };

// Documentos: cédula, RUC, títulos, certificados, hoja de vida, certificado bancario…
export function DocumentsPanel({ userId, kinds, docs }: { userId: string; kinds: [string, string, boolean, string][]; docs: Doc[] }) {
  const router = useRouter();
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  const upload = async (kind: string, f: File) => {
    setMsg("");
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(f.type)) return setMsg("Solo se aceptan PDF o imágenes (JPG, PNG, WebP).");
    if (f.size > 15 * 1024 * 1024) return setMsg("El archivo supera 15 MB.");
    setBusyKind(kind);
    const path = `${userId}/docs/${kind}/${crypto.randomUUID()}-${safe(f.name)}`;
    const up = await supabaseBrowser().storage.from("profile-files").upload(path, f, { contentType: f.type });
    if (up.error) { setBusyKind(null); return setMsg("No se pudo subir el archivo. Inténtalo de nuevo."); }
    const r = await addDocument({ kind, name: f.name, path, size: f.size });
    setBusyKind(null);
    if (!r.ok) setMsg(r.error ?? "Error al registrar el documento.");
    router.refresh();
  };
  return (
    <div className="space-y-3">
      {msg && <p role="alert" className="rounded-lg bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">{msg}</p>}
      {kinds.map(([kind, label, required, help]) => {
        const mine = docs.filter((d) => d.kind === kind);
        const ok = mine.length > 0;
        return (
          <div key={kind} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><b className="text-sm">{label}</b> {required && <span className="badge badge-blue">Obligatorio</span>} {ok ? <span className="text-xs text-ok">✔ cargado</span> : required ? <span className="text-xs text-warn">pendiente</span> : null}
                {help && <p className="text-xs text-soft">{help}</p>}</div>
              <label className="btn btn-ghost btn-sm cursor-pointer">{busyKind === kind ? "Subiendo…" : "+ Adjuntar"}
                <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" disabled={busyKind !== null} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(kind, f); }} /></label>
            </div>
            {mine.length > 0 && (
              <ul className="mt-3 divide-y divide-line text-sm">
                {mine.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0"><span className="block truncate font-medium">📎 {d.name}</span><span className="text-xs text-soft">{fmtDate(d.uploaded_at)}{d.size_bytes ? ` · ${(d.size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}{d.note ? ` · ${d.note}` : ""}</span></span>
                    <span className="flex items-center gap-2">
                      <span className={(BADGE[d.status] ?? BADGE.pendiente)[1]}>{(BADGE[d.status] ?? BADGE.pendiente)[0]}</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { const r = await documentUrl(d.storage_path); if (r.url) window.open(r.url, "_blank", "noopener"); else setMsg(r.error ?? "Error"); }}>Ver</button>
                      {d.status !== "verificado" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (confirm("¿Eliminar este documento?")) start(async () => { const r = await removeDocument(d.id); if (!r.ok) setMsg(r.error ?? "Error"); router.refresh(); }); }}>Eliminar</button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <p className="text-xs text-soft">Formatos: PDF o imagen, hasta 15 MB. Tus documentos son privados: solo tú y la administración pueden verlos.</p>
    </div>
  );
}

export function PrintButton() {
  return <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>🖨 Imprimir / guardar credencial</button>;
}
