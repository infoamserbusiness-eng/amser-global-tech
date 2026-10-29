"use client";

import { useState } from "react";
import { DEMO } from "@/lib/mode";
import { addTrainerApp } from "@/lib/store";
import { MODE_LABEL, type TrainerApp } from "@/lib/data";
import { submitTrainer } from "./actions";

export function TrainerForm() {
  const [f, setF] = useState({ name: "", docId: "", email: "", phone: "", city: "", specialty: "", years: 3, mode: "ambos" as TrainerApp["mode"], topic: "", link: "", message: "" });
  const [website, setWebsite] = useState(""); // honeypot anti-bots
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: k === "years" ? Number(e.target.value) : e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (DEMO) {
      addTrainerApp({ ...f, link: f.link || undefined, message: f.message || undefined, city: f.city || undefined });
      setOk(true);
      return;
    }
    setBusy(true);
    const r = await submitTrainer({ ...f, website });
    setBusy(false);
    if (r.ok) setOk(true);
    else setErr(r.error ?? "Error al enviar.");
  };

  if (ok) {
    return (
      <div role="status" className="card card-pad border-l-4" style={{ borderLeftColor: "var(--green)" }}>
        <h2 className="font-display text-xl font-bold">¡Solicitud recibida!</h2>
        <p className="mt-2 text-sm text-soft">Gracias, {f.name.split(" ")[0]}. Nuestro equipo te llamará al <b>{f.phone}</b> para conocerte y verificar tus datos. Si todo está en orden, habilitaremos tu portal de capacitador y te enviaremos tus credenciales a <b>{f.email}</b>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card card-pad space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="t-name">Nombre completo</label><input id="t-name" className="input" required value={f.name} onChange={set("name")} autoComplete="name" /></div>
        <div><label className="label" htmlFor="t-doc">Cédula / documento</label><input id="t-doc" className="input" required minLength={5} maxLength={30} value={f.docId} onChange={set("docId")} /></div>
        <div><label className="label" htmlFor="t-city">Ciudad</label><input id="t-city" className="input" value={f.city} onChange={set("city")} /></div>
        <div><label className="label" htmlFor="t-email">Correo</label><input id="t-email" type="email" className="input" required value={f.email} onChange={set("email")} autoComplete="email" /></div>
        <div><label className="label" htmlFor="t-phone">Teléfono / WhatsApp</label><input id="t-phone" className="input" required value={f.phone} onChange={set("phone")} autoComplete="tel" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="t-spec">Profesión y especialidad</label><input id="t-spec" className="input" required placeholder="Ej.: Ingeniero en sistemas, especialista en ciberseguridad" value={f.specialty} onChange={set("specialty")} /></div>
        <div><label className="label" htmlFor="t-years">Años de experiencia</label><input id="t-years" type="number" min={0} max={60} className="input" required value={f.years} onChange={set("years")} /></div>
        <div><label className="label" htmlFor="t-mode">¿Cómo quieres colaborar?</label>
          <select id="t-mode" className="select" value={f.mode} onChange={set("mode")}>{(Object.keys(MODE_LABEL) as TrainerApp["mode"][]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="t-topic">¿Qué curso o temas te gustaría ofrecer?</label><textarea id="t-topic" className="textarea" rows={2} required minLength={3} maxLength={300} value={f.topic} onChange={set("topic")} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="t-link">Enlace a tu hoja de vida o LinkedIn (opcional)</label><input id="t-link" type="url" className="input" placeholder="https://" value={f.link} onChange={set("link")} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="t-msg">Algo más que quieras contarnos (opcional)</label><textarea id="t-msg" className="textarea" rows={2} maxLength={500} value={f.message} onChange={set("message")} /></div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <p className="text-xs text-soft">Al enviar aceptas que Amser Global Tech te contacte por teléfono o correo para verificar tu identidad y evaluar tu postulación.</p>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <button className="btn btn-primary w-full sm:w-auto" disabled={busy}>{busy ? "Enviando…" : "Enviar mi postulación"}</button>
    </form>
  );
}
