"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Question } from "@/lib/data";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  addAssignmentLive, addLessonLive, addModuleLive, createCourseLive, materialUrlLive, removeAssignmentLive, removeLessonLive, removeModuleLive,
  setFinalQuizLive, setModuleQuizLive, submitReviewLive, updateCourseLive,
} from "@/app/capacitador/actions";
import { QuizBuilder } from "./trainer";
import { Empty, PageTitle } from "./ui";

export type LiveCourse = { id: string; title: string; area: string; level: string; kind: string; hours: number; months: number | null; price: number; summary: string; outcomes: string[]; final_quiz: Question[]; review: string; review_note: string | null };
export type LiveLesson = { id: string; title: string; type: string; minutes: number; material_kind: string | null; material_name: string | null; material_url: string | null; material_path: string | null };
export type LiveModule = { id: string; title: string; quiz: Question[] | null; lessons: LiveLesson[] };
export type LiveAssignment = { id: string; title: string; description: string; due: string; max_points: number };

export const REVIEW_LABEL: Record<string, [string, string]> = {
  borrador: ["Borrador", "badge"], revision: ["En revisión académica", "badge badge-warn"], publicado: ["Publicado", "badge badge-green"], rechazado: ["Devuelto con observaciones", "badge badge-red"],
};
type Res = { ok: boolean; error?: string; id?: string };

// ───────────────────────── Crear curso ─────────────────────────
export function LiveNewCourse() {
  const router = useRouter();
  const [f, setF] = useState({ title: "", area: "Desarrollo", level: "Básico", kind: "rapido", hours: 8, months: 6, price: 40, summary: "", outcomes: "" });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ["hours", "months", "price"].includes(k) ? Number(e.target.value) : e.target.value });
  return (
    <>
      <Link href="/capacitador/cursos" className="text-sm text-soft hover:text-blue">← Mis cursos</Link>
      <PageTitle title="Crear un curso" sub="Define el tipo de curso. Luego cargarás módulos, material y evaluaciones." />
      <form className="card card-pad max-w-3xl space-y-5" onSubmit={(e) => {
        e.preventDefault();
        setErr("");
        start(async () => {
          const r = await createCourseLive({ ...f, months: f.kind === "largo" ? f.months : undefined, outcomes: f.outcomes.split("\n") });
          if (r.ok && r.id) router.push(`/capacitador/cursos/${r.id}`);
          else setErr(r.error ?? "Error al crear.");
        });
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["rapido", "Curso pregrabado", "Videos y material ya cargados; el participante paga el 100% y obtiene certificado al aprobar la evaluación final."], ["largo", "Curso de larga duración", "Varios módulos con tareas y evaluaciones; el pago puede diferirse en cuotas."]] as const).map(([k, t, d]) => (
            <label key={k} className={`card cursor-pointer p-4 ${f.kind === k ? "!border-blue-bright shadow-[0_0_0_3px_rgba(31,122,224,.18)]" : "hover:bg-surface-2"}`}>
              <input type="radio" name="kind" className="sr-only" checked={f.kind === k} onChange={() => setF({ ...f, kind: k, hours: k === "rapido" ? 8 : 96, price: k === "rapido" ? 40 : 300 })} />
              <b>{t}</b><p className="mt-1 text-xs text-soft">{d}</p>
            </label>
          ))}
        </div>
        <div><label className="label" htmlFor="c-title">Título del curso</label><input id="c-title" className="input" required minLength={4} maxLength={140} value={f.title} onChange={set("title")} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="c-area">Área</label><select id="c-area" className="select" value={f.area} onChange={set("area")}>{["Desarrollo", "Seguridad", "Datos e IA", "Cloud", "Redes", "Negocios digitales"].map((a) => <option key={a}>{a}</option>)}</select></div>
          <div><label className="label" htmlFor="c-level">Nivel</label><select id="c-level" className="select" value={f.level} onChange={set("level")}>{["Básico", "Intermedio", "Avanzado"].map((a) => <option key={a}>{a}</option>)}</select></div>
          <div><label className="label" htmlFor="c-hours">Duración total (horas)</label><input id="c-hours" type="number" min={1} max={1000} className="input" value={f.hours} onChange={set("hours")} /></div>
          {f.kind === "largo" ? <div><label className="label" htmlFor="c-months">Duración (meses)</label><input id="c-months" type="number" min={2} max={24} className="input" value={f.months} onChange={set("months")} /></div> : <div />}
          <div><label className="label" htmlFor="c-price">Precio propuesto (USD)</label><input id="c-price" type="number" min={0} step="0.01" className="input" value={f.price} onChange={set("price")} /></div>
        </div>
        <div><label className="label" htmlFor="c-sum">Descripción del curso</label><textarea id="c-sum" className="textarea" rows={3} required minLength={11} maxLength={2000} value={f.summary} onChange={set("summary")} /></div>
        <div><label className="label" htmlFor="c-out">Lo que lograrán los participantes (una idea por línea)</label><textarea id="c-out" className="textarea" rows={4} required placeholder={"Aplicar X en proyectos reales\nDiseñar Y de forma segura"} value={f.outcomes} onChange={set("outcomes")} /></div>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Creando…" : "Crear y continuar →"}</button>
      </form>
    </>
  );
}

// ───────────────────────── Editor ─────────────────────────
type Tab = "datos" | "modulos" | "final" | "tareas" | "publicar";

export function LiveEditor({ course: c, modules, assignments, userId }: { course: LiveCourse; modules: LiveModule[]; assignments: LiveAssignment[]; userId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("modulos");
  const [msg, setMsg] = useState("");
  const [busy, start] = useTransition();
  const locked = c.review === "revision";
  const run = (fn: () => Promise<Res>, after?: () => void) => start(async () => {
    const r = await fn();
    setMsg(r.ok ? "" : r.error ?? "Ocurrió un error.");
    if (r.ok) after?.();
    router.refresh();
  });
  const lessons = modules.flatMap((m) => m.lessons);
  const readiness: [string, boolean][] = [
    ["Datos generales y objetivos (mínimo 2)", c.title.length > 3 && c.summary.length > 10 && c.outcomes.length >= 2],
    ["Al menos 1 módulo con 1 lección", modules.length > 0 && lessons.length > 0],
    ["Cada lección tiene su material cargado", lessons.length > 0 && lessons.every((l) => !!l.material_kind)],
    ["Evaluación final con mínimo 3 preguntas", c.final_quiz.length >= 3],
    ...(c.kind === "largo" ? ([["Al menos 1 tarea para los participantes", assignments.length > 0]] as [string, boolean][]) : []),
  ];
  const tabs: [Tab, string][] = [["datos", "Datos"], ["modulos", "Módulos y material"], ["final", "Evaluación final"], ...(c.kind === "largo" ? ([["tareas", "Tareas"]] as [Tab, string][]) : []), ["publicar", "Publicar"]];
  const [rl, rc] = REVIEW_LABEL[c.review] ?? ["", "badge"];

  return (
    <>
      <Link href="/capacitador/cursos" className="text-sm text-soft hover:text-blue">← Mis cursos</Link>
      <div className="mb-5 mt-2 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold">{c.title}</h1><span className={rc}>{rl}</span><span className="badge">{c.kind === "rapido" ? "Pregrabado" : "Larga duración"}</span></div>
      {locked && <p className="mb-4 rounded-lg bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">Este curso está en revisión académica: no se puede editar hasta que sea aprobado o devuelto.</p>}
      {msg && <p role="alert" className="mb-4 rounded-lg bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">{msg}</p>}
      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto pb-1">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      <fieldset disabled={locked || busy} className="min-w-0 border-0 p-0">
        {tab === "datos" && <DataTab c={c} run={run} />}
        {tab === "modulos" && <ModulesTab c={c} modules={modules} userId={userId} run={run} />}
        {tab === "final" && (
          <div className="card card-pad max-w-3xl">
            <h2 className="mb-3 font-bold">Evaluación final del curso</h2>
            <p className="mb-4 text-sm text-soft">Se habilita al participante cuando completa el curso. Al aprobarla se emite el certificado.</p>
            <QuizBuilder minQuestions={3} questions={c.final_quiz} onChange={(qs) => run(() => setFinalQuizLive(c.id, qs))} />
          </div>
        )}
        {tab === "tareas" && <TasksTab c={c} assignments={assignments} run={run} />}
        {tab === "publicar" && (
          <div className="card card-pad max-w-2xl space-y-4">
            <h2 className="font-bold">Requisitos para enviar a revisión</h2>
            <ul className="space-y-1.5 text-sm">{readiness.map(([t, ok]) => <li key={t} className={ok ? "text-ok" : "text-soft"}>{ok ? "✔" : "○"} {t}</li>)}</ul>
            {c.review === "rechazado" && c.review_note && <p className="rounded-lg bg-[rgba(192,57,43,.08)] p-3 text-sm text-danger"><b>Observación de la administración:</b> {c.review_note}</p>}
            {c.review === "publicado" && <p className="rounded-lg bg-[rgba(34,178,76,.12)] p-3 text-sm text-ok">Aprobado por la administración. Si lo editas, volverá a revisión.</p>}
            {(c.review === "borrador" || c.review === "rechazado" || c.review === "publicado") && (
              <button className="btn btn-green" disabled={!readiness.every(([, ok]) => ok) || busy} onClick={() => run(() => submitReviewLive(c.id))}>Enviar a revisión académica</button>
            )}
            <p className="text-xs text-soft">La administración revisa el contenido antes de publicarlo para la venta.</p>
          </div>
        )}
      </fieldset>
    </>
  );
}

type Run = (fn: () => Promise<Res>, after?: () => void) => void;

function DataTab({ c, run }: { c: LiveCourse; run: Run }) {
  const [f, setF] = useState({ title: c.title, summary: c.summary, outcomes: c.outcomes.join("\n"), hours: c.hours, price: c.price });
  return (
    <form className="card card-pad max-w-3xl space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => updateCourseLive(c.id, { ...f, outcomes: f.outcomes.split("\n") })); }}>
      <div><label className="label" htmlFor="e-t">Título</label><input id="e-t" className="input" required minLength={4} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><label className="label" htmlFor="e-s">Descripción</label><textarea id="e-s" className="textarea" rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></div>
      <div><label className="label" htmlFor="e-o">Objetivos (uno por línea)</label><textarea id="e-o" className="textarea" rows={4} value={f.outcomes} onChange={(e) => setF({ ...f, outcomes: e.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="e-h">Horas</label><input id="e-h" type="number" min={1} max={1000} className="input" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} /></div>
        <div><label className="label" htmlFor="e-p">Precio (USD)</label><input id="e-p" type="number" min={0} step="0.01" className="input" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></div>
      </div>
      <button className="btn btn-primary">Guardar cambios</button>
    </form>
  );
}

function ModulesTab({ c, modules, userId, run }: { c: LiveCourse; modules: LiveModule[]; userId: string; run: Run }) {
  const [title, setTitle] = useState("");
  const openMaterial = async (path: string) => {
    const r = await materialUrlLive(path);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else alert(r.error);
  };
  return (
    <div className="space-y-5">
      {modules.length === 0 && <Empty>Agrega el primer módulo de tu curso.</Empty>}
      {modules.map((m, i) => (
        <section key={m.id} className="card card-pad">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold">Módulo {i + 1} · {m.title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("¿Eliminar el módulo y su material?")) run(() => removeModuleLive(c.id, m.id)); }}>Eliminar módulo</button>
          </div>
          <ul className="mt-3 divide-y divide-line text-sm">
            {m.lessons.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                <span><b>{l.title}</b> <span className="text-xs capitalize text-soft">· {l.type} · {l.minutes} min</span><br />
                  <span className="text-xs text-soft">{l.material_kind === "archivo" ? "📎" : "🔗"} {l.material_name}{" "}
                    {l.material_kind === "archivo" && l.material_path ? <button type="button" className="font-semibold text-blue hover:underline" onClick={() => openMaterial(l.material_path!)}>Ver</button> : l.material_url ? <a className="font-semibold text-blue hover:underline" href={l.material_url} target="_blank" rel="noreferrer">Abrir</a> : null}
                  </span></span>
                <button className="btn btn-ghost btn-sm" onClick={() => run(() => removeLessonLive(c.id, l.id))}>Quitar</button>
              </li>
            ))}
          </ul>
          <LessonForm courseId={c.id} moduleId={m.id} userId={userId} run={run} />
          <details className="mt-4 rounded-xl border border-line p-4" open={!!m.quiz}>
            <summary className="cursor-pointer text-sm font-semibold">📝 Evaluación del módulo {m.quiz ? `(${m.quiz.length} preguntas)` : "(opcional)"}</summary>
            <div className="mt-3"><QuizBuilder questions={m.quiz ?? []} onChange={(qs) => run(() => setModuleQuizLive(c.id, m.id, qs))} /></div>
          </details>
        </section>
      ))}
      <form className="card card-pad flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => addModuleLive(c.id, title), () => setTitle("")); }}>
        <div className="min-w-60 flex-1"><label className="label" htmlFor="m-t">Nuevo módulo</label><input id="m-t" className="input" required minLength={2} maxLength={140} placeholder="Ej.: Fundamentos de redes" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <button className="btn btn-primary">+ Agregar módulo</button>
      </form>
    </div>
  );
}

// Lección con material: se sube el archivo a almacenamiento privado (o se pega un enlace) y luego se registra.
function LessonForm({ courseId, moduleId, userId, run }: { courseId: string; moduleId: string; userId: string; run: Run }) {
  const [f, setF] = useState({ title: "", type: "video", minutes: 20, kind: "archivo" as "archivo" | "enlace", url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [up, setUp] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form className="mt-4 grid gap-3 rounded-xl bg-surface-2 p-4 sm:grid-cols-[1fr_130px_90px]" onSubmit={async (e) => {
      e.preventDefault();
      setErr("");
      if (f.kind === "archivo") {
        if (!file) return setErr("Elige un archivo.");
        if (file.size > 500 * 1024 * 1024) return setErr("El archivo supera 500 MB. Para videos grandes usa un enlace (YouTube/Vimeo no listado).");
        setUp(true);
        const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
        const path = `${userId}/${courseId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabaseBrowser().storage.from("course-materials").upload(path, file, { contentType: file.type || "application/octet-stream" });
        setUp(false);
        if (error) return setErr(`No se pudo subir el archivo: ${error.message.includes("mime") ? "tipo de archivo no permitido (usa video MP4/WebM, PDF, Office, ZIP o imagen)" : error.message}`);
        run(() => addLessonLive(courseId, moduleId, { title: f.title, type: f.type, minutes: f.minutes, kind: "archivo", name: file.name, path }), () => { setF({ ...f, title: "" }); setFile(null); });
      } else {
        run(() => addLessonLive(courseId, moduleId, { title: f.title, type: f.type, minutes: f.minutes, kind: "enlace", name: f.url, url: f.url }), () => setF({ ...f, title: "", url: "" }));
      }
    }}>
      <div><label className="label">Lección</label><input className="input" required minLength={2} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><label className="label">Tipo</label><select className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="video">Video</option><option value="lectura">Lectura</option><option value="laboratorio">Laboratorio</option></select></div>
      <div><label className="label">Minutos</label><input type="number" min={1} max={600} className="input" value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} /></div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <select className="select !w-auto" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "archivo" | "enlace" })} aria-label="Tipo de material"><option value="archivo">Subir archivo</option><option value="enlace">Enlace (YouTube/Vimeo/Drive)</option></select>
        {f.kind === "archivo" ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm"><span className="btn btn-ghost btn-sm">📎 Elegir archivo</span><span className="text-soft">{file?.name ?? "Video MP4, PDF, presentación, ZIP… (máx. 500 MB)"}</span><input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        ) : <input className="input min-w-60 flex-1" type="url" required placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} aria-label="Enlace del material" />}
        <button className="btn btn-primary btn-sm" disabled={up}>{up ? "Subiendo…" : "+ Agregar lección"}</button>
      </div>
      {err && <p role="alert" className="text-sm text-danger sm:col-span-3">{err}</p>}
    </form>
  );
}

function TasksTab({ c, assignments, run }: { c: LiveCourse; assignments: LiveAssignment[]; run: Run }) {
  const [f, setF] = useState({ title: "", description: "", due: "", maxPoints: 10 });
  return (
    <div className="max-w-3xl space-y-4">
      {assignments.map((a) => (
        <div key={a.id} className="card card-pad flex items-start justify-between gap-3"><div><b>{a.title}</b><p className="text-sm text-soft">{a.description}</p><p className="mt-1 text-xs text-soft">Vence {a.due} · {a.max_points} pts</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => run(() => removeAssignmentLive(c.id, a.id))}>Quitar</button></div>
      ))}
      <form className="card card-pad space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => addAssignmentLive(c.id, f), () => setF({ title: "", description: "", due: "", maxPoints: 10 })); }}>
        <h3 className="font-bold">Nueva tarea</h3>
        <div><label className="label" htmlFor="t-t">Título</label><input id="t-t" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label" htmlFor="t-d">Instrucciones</label><textarea id="t-d" className="textarea" rows={3} required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="t-f">Fecha de entrega</label><input id="t-f" type="date" className="input" required value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div><div><label className="label" htmlFor="t-p">Puntos</label><input id="t-p" type="number" min={1} className="input" value={f.maxPoints} onChange={(e) => setF({ ...f, maxPoints: Number(e.target.value) })} /></div></div>
        <button className="btn btn-primary btn-sm">Agregar tarea</button>
      </form>
    </div>
  );
}
