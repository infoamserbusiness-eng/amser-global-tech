"use client";

import Link from "next/link";
import { useState } from "react";
import { COURSES } from "@/lib/data";
import { DEMO } from "@/lib/mode";
import { addLead } from "@/lib/store";
import { submitRegistro } from "./actions";

export function RegistroForm({ curso, options }: { curso: string; options?: { slug: string; title: string }[] }) {
  // Producción: los cursos publicados (más «información general»). Demo: los cursos de ejemplo.
  const list = options ? [...options, { slug: "general", title: "Quiero información general" }] : COURSES.map((c) => ({ slug: c.slug, title: c.title }));
  const [f, setF] = useState({ name: "", docId: "", email: "", phone: "", city: "", message: "", courseSlug: list.some((c) => c.slug === curso) ? curso : list[0].slug });
  const [website, setWebsite] = useState(""); // honeypot anti-bots
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (DEMO) {
      addLead(f);
      setOk(true);
      return;
    }
    setBusy(true);
    const r = await submitRegistro({ ...f, website });
    setBusy(false);
    if (r.ok) setOk(true);
    else setErr(r.error ?? "Error al enviar.");
  };

  if (ok) {
    return (
      <div role="status" className="card card-pad border-l-4" style={{ borderLeftColor: "var(--green)" }}>
        <h2 className="font-display text-xl font-bold">¡Registro recibido!</h2>
        <p className="mt-2 text-sm text-soft">Gracias, {f.name.split(" ")[0]}. Tu solicitud llegó a admisiones. Te llamaremos al <b>{f.phone}</b> para resolver tus dudas sobre el curso y confirmar tu admisión. Cuando se complete, habilitaremos tu plataforma de participante y te enviaremos tus credenciales a <b>{f.email}</b>.</p>
        <Link href="/cursos" className="btn btn-ghost mt-4">Seguir viendo cursos</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card card-pad space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="r-name">Nombre completo</label><input id="r-name" className="input" required value={f.name} onChange={set("name")} autoComplete="name" /></div>
        <div><label className="label" htmlFor="r-doc">Cédula / documento</label><input id="r-doc" className="input" required minLength={5} maxLength={30} value={f.docId} onChange={set("docId")} /></div>
        <div><label className="label" htmlFor="r-city">Ciudad</label><input id="r-city" className="input" value={f.city} onChange={set("city")} autoComplete="address-level2" /></div>
        <div><label className="label" htmlFor="r-email">Correo</label><input id="r-email" type="email" className="input" required value={f.email} onChange={set("email")} autoComplete="email" /></div>
        <div><label className="label" htmlFor="r-phone">Teléfono / WhatsApp</label><input id="r-phone" className="input" required value={f.phone} onChange={set("phone")} autoComplete="tel" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="r-course">Curso de interés</label>
          <select id="r-course" className="select" value={f.courseSlug} onChange={set("courseSlug")}>{list.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="r-msg">¿Algo que quieras consultarnos? (opcional)</label><textarea id="r-msg" className="textarea" rows={3} maxLength={500} value={f.message} onChange={set("message")} /></div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <p className="text-xs text-soft">Al registrarte aceptas que Amser Global Tech te contacte por teléfono o correo para el proceso de admisión.</p>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <button className="btn btn-primary w-full sm:w-auto" disabled={busy}>{busy ? "Enviando…" : "Registrarme como participante"}</button>
    </form>
  );
}
