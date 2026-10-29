"use client";

import { useState } from "react";
import { MODE_LABEL, courseBySlug, fmtDate, type Lead } from "@/lib/data";
import { enableLead, enableTrainer, logCall, logTrainerCall, rejectLead, rejectTrainerApp, resetDemoAccount, useDemo } from "@/lib/store";
import { Empty, PageTitle } from "./ui";

const LABEL: Record<Lead["status"], [string, string]> = {
  nuevo: ["Por llamar", "badge badge-warn"],
  contactado: ["Llamada realizada", "badge badge-blue"],
  matriculado: ["Plataforma habilitada", "badge badge-green"],
  descartado: ["Rechazado", "badge badge-red"],
};

function CallBox({ id }: { id: string }) {
  const [note, setNote] = useState("");
  return (
    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); logCall(id, note); }}>
      <label className="label" htmlFor={`n-${id}`}>Resultado de la llamada de admisión</label>
      <textarea id={`n-${id}`} className="textarea" rows={2} required placeholder="Ej.: aclaró dudas sobre horarios, interesado en plan 50% + 50%…" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn btn-primary btn-sm">Registrar llamada</button>
    </form>
  );
}

// Bandeja de admisión (modo demo). El registro llega, el admin llama, y solo después habilita la plataforma del participante.
export function AdminAdmissions() {
  const s = useDemo();
  const [filter, setFilter] = useState<"todos" | Lead["status"]>("todos");
  const list = s.leads.filter((l) => filter === "todos" || l.status === filter);
  return (
    <>
      <PageTitle title="Admisiones" sub="Registros de participantes: llama, valida la admisión y habilita su plataforma." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["todos", "nuevo", "contactado", "matriculado", "descartado"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`tab ${filter === f ? "on" : "border border-line bg-white"}`}>{f === "todos" ? "Todos" : LABEL[f][0]} {f !== "todos" && <span className="opacity-60">({s.leads.filter((l) => l.status === f).length})</span>}</button>
        ))}
      </div>
      {list.length === 0 && <Empty>No hay registros en esta etapa.</Empty>}
      <div className="space-y-3">
        {list.map((l) => (
          <article key={l.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><b className="text-base">{l.name}</b><p className="text-xs text-soft">{l.docId ?? "—"} · {l.city ?? "—"} · registrado {fmtDate(l.at)}</p></div>
              <span className={LABEL[l.status][1]}>{LABEL[l.status][0]}</span>
            </div>
            <p className="mt-2 text-sm">📞 <a className="hover:text-blue" href={`tel:${l.phone}`}>{l.phone}</a> · ✉ <a className="hover:text-blue" href={`mailto:${l.email}`}>{l.email}</a></p>
            <p className="mt-1 text-sm text-soft">Interesado en: <b className="text-text">{courseBySlug(l.courseSlug)?.title}</b></p>
            {l.message && <p className="mt-2 rounded-lg bg-surface-2 p-3 text-sm">💬 {l.message}</p>}
            {l.status === "nuevo" && <CallBox id={l.id} />}
            {l.status === "contactado" && (
              <div className="mt-3 space-y-3">
                <p className="rounded-lg bg-surface-2 p-3 text-sm"><b>Llamada ({l.calledAt && fmtDate(l.calledAt)}):</b> {l.callNote}</p>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-green btn-sm" onClick={() => enableLead(l.id)}>✔ Admitir y enviar acceso por correo</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => rejectLead(l.id)}>Rechazar</button>
                </div>
              </div>
            )}
            {l.status === "matriculado" && l.userId && <AccountPanel userId={l.userId} fallbackPassword={l.tempPassword} />}
          </article>
        ))}
      </div>
    </>
  );
}

// Postulaciones de capacitadores (modo demo): mismo flujo — llamada de verificación obligatoria antes de habilitar el portal.
export function AdminTrainerApps() {
  const s = useDemo();
  const [note, setNote] = useState<Record<string, string>>({});
  return (
    <>
      <PageTitle title="Capacitadores" sub="Postulaciones de capacitadores: llama para verificar la identidad y habilita su portal." />
      {s.trainerApps.length === 0 && <Empty>Aún no hay postulaciones.</Empty>}
      <div className="space-y-3">
        {s.trainerApps.map((t) => (
          <article key={t.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><b className="text-base">{t.name}</b><p className="text-xs text-soft">{t.docId} · {t.city ?? "—"} · postuló {fmtDate(t.at)}</p></div>
              <span className={LABEL[t.status][1]}>{LABEL[t.status][0]}</span>
            </div>
            <p className="mt-2 text-sm">📞 <a className="hover:text-blue" href={`tel:${t.phone}`}>{t.phone}</a> · ✉ <a className="hover:text-blue" href={`mailto:${t.email}`}>{t.email}</a>{t.link && <> · <a className="text-blue hover:underline" href={t.link} target="_blank" rel="noreferrer">Perfil / CV</a></>}</p>
            <p className="mt-1 text-sm text-soft"><b className="text-text">{t.specialty}</b> · {t.years} años de experiencia · {MODE_LABEL[t.mode]}</p>
            <p className="mt-1 text-sm text-soft">Propone: {t.topic}</p>
            {t.message && <p className="mt-2 rounded-lg bg-surface-2 p-3 text-sm">💬 {t.message}</p>}
            {t.status === "nuevo" && (
              <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); logTrainerCall(t.id, note[t.id] ?? ""); }}>
                <label className="label" htmlFor={`tn-${t.id}`}>Resultado de la llamada de verificación</label>
                <textarea id={`tn-${t.id}`} className="textarea" rows={2} required placeholder="Ej.: verificó identidad y experiencia, interesado en vender cursos pregrabados…" value={note[t.id] ?? ""} onChange={(e) => setNote({ ...note, [t.id]: e.target.value })} />
                <button className="btn btn-primary btn-sm">Registrar llamada</button>
              </form>
            )}
            {t.status === "contactado" && (
              <div className="mt-3 space-y-3">
                <p className="rounded-lg bg-surface-2 p-3 text-sm"><b>Llamada ({t.calledAt && fmtDate(t.calledAt)}):</b> {t.callNote}</p>
                <div className="flex flex-wrap gap-2"><button className="btn btn-green btn-sm" onClick={() => enableTrainer(t.id)}>✔ Verificar y enviar acceso por correo</button><button className="btn btn-ghost btn-sm" onClick={() => rejectTrainerApp(t.id)}>Rechazar</button></div>
              </div>
            )}
            {t.status === "matriculado" && t.userId && <AccountPanel userId={t.userId} fallbackPassword={t.tempPassword} />}
          </article>
        ))}
      </div>
    </>
  );
}

// Estado de la cuenta del participante admitido: nunca se muestra la contraseña (solo el hash vive en el sistema).
function AccountPanel({ userId, fallbackPassword }: { userId: string; fallbackPassword?: string }) {
  const s = useDemo();
  const a = s.accounts[userId];
  const mail = s.outbox.find((m) => m.userId === userId);
  const log = s.accountLog.filter((x) => x.userId === userId);
  const [manual, setManual] = useState("");
  if (!a) {
    return <div className="mt-3 rounded-lg border border-dashed border-line p-3 text-sm"><b>Acceso creado</b> (cuenta anterior){fallbackPassword && <p className="mt-1 text-xs text-soft">Clave temporal asignada en su momento: <code>{fallbackPassword}</code></p>}</div>;
  }
  const expired = a.mustChange && a.expiresAt && new Date(a.expiresAt) < new Date();
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b>Acceso al portal</b>
        {a.mustChange ? (expired ? <span className="badge badge-red">Clave temporal vencida</span> : <span className="badge badge-warn">Pendiente de primer ingreso</span>) : <span className="badge badge-green">Clave cambiada · {a.changedAt && fmtDate(a.changedAt)}</span>}
      </div>
      <p className="text-soft">Usuario: <code>{a.docId}</code> (cédula). {a.mustChange ? <>Contraseña temporal vigente hasta el {a.expiresAt && fmtDate(a.expiresAt)}; debe cambiarla al ingresar.</> : <>El participante definió su propia contraseña; por seguridad no se puede ver, solo restablecer.</>}</p>
      <div className="flex flex-wrap items-end gap-2">
        <button className="btn btn-ghost btn-sm" onClick={() => resetDemoAccount(userId)}>↺ Restablecer a la cédula y reenviar correo</button>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); resetDemoAccount(userId, manual); setManual(""); }}>
          <input className="input !w-48" type="text" minLength={8} required placeholder="Clave temporal manual (8+)" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Clave temporal manual" />
          <button className="btn btn-ghost btn-sm">Asignar y enviar</button>
        </form>
      </div>
      {mail && (
        <details className="rounded-lg bg-surface-2 p-3">
          <summary className="cursor-pointer font-semibold">✉ Último correo enviado a {mail.to} · {fmtDate(mail.at)}</summary>
          <p className="mt-2 text-xs font-semibold">Asunto: {mail.subject}</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-soft">{mail.body}</pre>
        </details>
      )}
      <details>
        <summary className="cursor-pointer font-semibold">Historial de la cuenta ({log.length})</summary>
        <ul className="mt-2 space-y-1 text-xs text-soft">{log.map((x) => <li key={x.id}>{fmtDate(x.at)} · {x.note} <span className="opacity-70">— {x.by}</span></li>)}</ul>
      </details>
    </div>
  );
}
