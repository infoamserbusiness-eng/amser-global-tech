"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PASS_PCT, fmtDate, fmtUSD, type Course, type Lesson, type Question } from "@/lib/data";
import {
  addSession, courseReadiness, courses as withOverrides, createCourse, editCourse, enrollments, findUser, mkQuiz, newId, setSessionStatus,
  shareOf, studentAccounts, submitForReview, teacherAccounts, useDemo,
} from "@/lib/store";
import { Empty, PageTitle, Progress, Stat } from "./ui";

const REVIEW: Record<NonNullable<Course["review"]>, [string, string]> = {
  borrador: ["Borrador", "badge"], revision: ["En revisión académica", "badge badge-warn"], publicado: ["Publicado", "badge badge-green"], rechazado: ["Devuelto con observaciones", "badge badge-red"],
};

function useTrainer(userId: string) {
  const s = useDemo();
  const mine = withOverrides(s).filter((c) => c.teacherId === userId);
  const authored = mine.filter((c) => c.authored);
  const accts = studentAccounts(s);
  const students = (slug: string) => enrollments(s).filter((e) => e.courseSlug === slug);
  const sessions = s.sessions.filter((x) => x.teacherId === userId);
  const pending = s.submissions.filter((x) => x.grade == null && mine.some((c) => c.assignments.some((a) => a.id === x.assignmentId)));
  const pay = teacherAccounts(s).filter((a) => a.teacherId === userId);
  return { s, mine, authored, accts, students, sessions, pending, pay };
}

// ───────────────────────── Dashboard ─────────────────────────
export function TrainerDashboard({ userId, name }: { userId: string; name: string }) {
  const { s, mine, authored, accts, students, sessions, pending, pay } = useTrainer(userId);
  const today = new Date().toISOString().slice(0, 10);
  const hoursTaught = sessions.filter((x) => x.status === "dictada").reduce((t, x) => t + x.hours, 0);
  const upcoming = sessions.filter((x) => x.status === "programada" && x.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const myAccts = accts.filter((a) => mine.some((c) => c.slug === a.courseSlug));
  const learners = new Set(myAccts.map((a) => a.studentId)).size;
  const sold = authored.reduce((t, c) => t + students(c.slug).length, 0);
  const revenue = authored.reduce((t, c) => t + myAccts.filter((a) => a.courseSlug === c.slug).reduce((x, a) => x + a.paid, 0), 0);
  const earned = pay.reduce((t, a) => t + a.total, 0);
  const received = pay.reduce((t, a) => t + a.paid, 0);
  const certs = s.certs.filter((c) => mine.some((m) => m.slug === c.courseSlug)).length;
  const enrolled = mine.reduce((t, c) => t + students(c.slug).length, 0);
  const approval = enrolled ? Math.round((certs / enrolled) * 100) : 0;
  const maxSold = Math.max(1, ...mine.map((c) => students(c.slug).length));

  return (
    <>
      <PageTitle title={`Bienvenido, ${name}`} sub="Indicadores clave de tu actividad como capacitador." action={<Link href="/capacitador/cursos/nuevo" className="btn btn-green btn-sm">+ Crear curso</Link>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cursos a mi cargo" value={mine.length} hint={`${authored.length} propios · ${authored.filter((c) => c.review === "publicado").length} publicados`} tone="blue" />
        <Stat label="Participantes" value={learners} hint={`${enrolled} matrículas`} tone="green" />
        <Stat label="Cursos vendidos" value={sold} hint="matrículas en cursos propios" tone="violet" />
        <Stat label="Ingresos generados" value={fmtUSD(revenue)} hint="cobrado en cursos propios" tone="amber" />
        <Stat label="Mis ganancias" value={fmtUSD(earned)} hint={`${fmtUSD(received)} recibido · ${fmtUSD(earned - received)} por cobrar`} tone="green" />
        <Stat label="Horas dictadas" value={`${hoursTaught} h`} hint={`${upcoming.length} clases programadas`} tone="blue" />
        <Stat label="Por calificar" value={pending.length} hint="entregas de participantes" tone="amber" />
        <Stat label="Aprobación" value={`${approval}%`} hint={`${certs} certificados emitidos`} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="mb-4 font-bold">Participantes por curso</h2>
          {mine.length === 0 && <p className="text-sm text-soft">Aún no tienes cursos. Crea el primero.</p>}
          <div className="space-y-3">
            {mine.map((c) => (
              <div key={c.slug}>
                <div className="mb-1 flex justify-between text-sm"><span className="truncate pr-3">{c.title}</span><b>{students(c.slug).length}</b></div>
                <Progress value={Math.round((students(c.slug).length / maxSold) * 100)} />
              </div>
            ))}
          </div>
        </section>
        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Próximas clases</h2><Link href="/capacitador/clases" className="text-sm font-semibold text-blue">Gestionar →</Link></div>
          {upcoming.length === 0 && <p className="text-sm text-soft">No tienes clases programadas.</p>}
          <ul className="divide-y divide-line text-sm">
            {upcoming.slice(0, 4).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                <span><b className="block">{x.title}</b><span className="text-xs text-soft">{fmtDate(x.date)} · {x.time} · {x.hours} h · {x.platform}</span></span>
                <a href={x.link} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Abrir sala</a>
              </li>
            ))}
          </ul>
        </section>
        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Entregas por calificar</h2><Link href="/capacitador/calificar" className="text-sm font-semibold text-blue">Calificar →</Link></div>
          {pending.length === 0 && <p className="text-sm text-soft">Todo al día ✔</p>}
          <ul className="divide-y divide-line text-sm">
            {pending.slice(0, 4).map((x) => <li key={x.id} className="flex justify-between py-2"><b>{findUser(s, x.studentId)?.name}</b><span className="text-xs text-soft">{fmtDate(x.at)}</span></li>)}
          </ul>
        </section>
        <section className="card card-pad">
          <h2 className="mb-3 font-bold">Estado de mis cursos</h2>
          <ul className="divide-y divide-line text-sm">
            {mine.map((c) => (
              <li key={c.slug} className="flex items-center justify-between gap-3 py-2"><span className="truncate">{c.title}</span>
                {c.authored ? <span className={REVIEW[c.review ?? "borrador"][1]}>{REVIEW[c.review ?? "borrador"][0]}</span> : <span className="badge badge-blue">Asignado por Amser</span>}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

// ───────────────────────── Lista de cursos ─────────────────────────
export function TrainerCourses({ userId }: { userId: string }) {
  const { mine, students } = useTrainer(userId);
  return (
    <>
      <PageTitle title="Mis cursos" sub="Cursos asignados por Amser y los que creas tú para vender en la plataforma." action={<Link href="/capacitador/cursos/nuevo" className="btn btn-green btn-sm">+ Crear curso</Link>} />
      {mine.length === 0 && <Empty>Aún no tienes cursos. Crea tu primer curso pregrabado o de larga duración.</Empty>}
      <div className="grid gap-5 md:grid-cols-2">
        {mine.map((c) => (
          <div key={c.slug} className="card overflow-hidden">
            <div className="h-14" style={{ background: `linear-gradient(135deg, ${c.color}, #0a1730)` }} />
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-1.5">
                <span className="badge">{c.kind === "rapido" ? `Pregrabado · ${c.hours} h` : `Largo · ${c.months} meses`}</span>
                {c.authored ? <span className={REVIEW[c.review ?? "borrador"][1]}>{REVIEW[c.review ?? "borrador"][0]}</span> : <span className="badge badge-blue">Asignado por Amser</span>}
              </div>
              <h3 className="font-bold leading-snug">{c.title}</h3>
              <p className="text-xs text-soft">{students(c.slug).length} participantes · {fmtUSD(c.price)} · {c.modules.length} módulos</p>
              {c.review === "rechazado" && c.reviewNote && <p className="rounded-lg bg-[rgba(192,57,43,.08)] p-2 text-xs text-danger">Observación de la administración: {c.reviewNote}</p>}
              <div className="flex flex-wrap gap-2">
                {c.authored && <Link href={`/capacitador/cursos/${c.slug}`} className="btn btn-primary btn-sm">Editar contenido</Link>}
                {(!c.authored || c.review === "publicado") && <Link href={`/capacitador/campus/${c.slug}`} className="btn btn-ghost btn-sm">Ver campus</Link>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ───────────────────────── Crear curso ─────────────────────────
export function NewCourseForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [f, setF] = useState({ title: "", area: "Desarrollo" as Course["area"], level: "Básico" as Course["level"], kind: "rapido" as Course["kind"], hours: 8, months: 6, price: 40, summary: "", outcomes: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ["hours", "months", "price"].includes(k) ? Number(e.target.value) : e.target.value });
  return (
    <>
      <Link href="/capacitador/cursos" className="text-sm text-soft hover:text-blue">← Mis cursos</Link>
      <PageTitle title="Crear un curso" sub="Define el tipo de curso. Luego cargarás módulos, material y evaluaciones." />
      <form className="card card-pad max-w-3xl space-y-5" onSubmit={(e) => {
        e.preventDefault();
        const slug = createCourse(userId, { ...f, months: f.kind === "largo" ? f.months : undefined, outcomes: f.outcomes.split("\n").map((x) => x.trim()).filter(Boolean) });
        router.push(`/capacitador/cursos/${slug}`);
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["rapido", "Curso pregrabado", "Videos y material ya cargados; el participante paga el 100% y obtiene certificado al aprobar la evaluación final."], ["largo", "Curso de larga duración", "Varios módulos con tareas y evaluaciones; el pago puede diferirse en cuotas."]] as const).map(([k, t, d]) => (
            <label key={k} className={`card cursor-pointer p-4 ${f.kind === k ? "!border-blue-bright shadow-[0_0_0_3px_rgba(31,122,224,.18)]" : "hover:bg-surface-2"}`}>
              <input type="radio" name="kind" className="sr-only" checked={f.kind === k} onChange={() => setF({ ...f, kind: k, hours: k === "rapido" ? 8 : 96, price: k === "rapido" ? 40 : 300 })} />
              <b>{t}</b><p className="mt-1 text-xs text-soft">{d}</p>
            </label>
          ))}
        </div>
        <div><label className="label" htmlFor="c-title">Título del curso</label><input id="c-title" className="input" required minLength={4} value={f.title} onChange={set("title")} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="c-area">Área</label><select id="c-area" className="select" value={f.area} onChange={set("area")}>{["Desarrollo", "Seguridad", "Datos e IA", "Cloud", "Redes", "Negocios digitales"].map((a) => <option key={a}>{a}</option>)}</select></div>
          <div><label className="label" htmlFor="c-level">Nivel</label><select id="c-level" className="select" value={f.level} onChange={set("level")}>{["Básico", "Intermedio", "Avanzado"].map((a) => <option key={a}>{a}</option>)}</select></div>
          <div><label className="label" htmlFor="c-hours">Duración total (horas)</label><input id="c-hours" type="number" min={1} className="input" value={f.hours} onChange={set("hours")} /></div>
          {f.kind === "largo" ? <div><label className="label" htmlFor="c-months">Duración (meses)</label><input id="c-months" type="number" min={2} max={12} className="input" value={f.months} onChange={set("months")} /></div> : <div />}
          <div><label className="label" htmlFor="c-price">Precio propuesto (USD)</label><input id="c-price" type="number" min={1} className="input" value={f.price} onChange={set("price")} /></div>
        </div>
        <div><label className="label" htmlFor="c-sum">Descripción del curso</label><textarea id="c-sum" className="textarea" rows={3} required minLength={11} value={f.summary} onChange={set("summary")} /></div>
        <div><label className="label" htmlFor="c-out">Lo que lograrán los participantes (una idea por línea)</label><textarea id="c-out" className="textarea" rows={4} required placeholder={"Aplicar X en proyectos reales\nDiseñar Y de forma segura"} value={f.outcomes} onChange={set("outcomes")} /></div>
        <button className="btn btn-primary">Crear y continuar →</button>
      </form>
    </>
  );
}

// ───────────────────────── Constructor de evaluaciones ─────────────────────────
export function QuizBuilder({ questions, onChange, minQuestions }: { questions: Question[]; onChange: (q: Question[]) => void; minQuestions?: number }) {
  const blank = { q: "", options: ["", "", "", ""], answer: 0 };
  const [d, setD] = useState(blank);
  return (
    <div className="space-y-4">
      <p className="text-xs text-soft">Aprueba el participante con {PASS_PCT}% o más. Se califica automáticamente.{minQuestions ? ` Mínimo ${minQuestions} preguntas.` : ""}</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        {questions.map((x, i) => (
          <li key={i}>
            <div className="flex items-start justify-between gap-2"><b>{x.q}</b><button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(questions.filter((_, j) => j !== i))}>Quitar</button></div>
            <ul className="text-soft">{x.options.map((o, k) => <li key={k} className={k === x.answer ? "font-semibold text-ok" : ""}>{k === x.answer ? "✔" : "•"} {o}</li>)}</ul>
          </li>
        ))}
      </ol>
      <form className="rounded-xl border border-dashed border-line p-4" onSubmit={(e) => { e.preventDefault(); onChange([...questions, d]); setD(blank); }}>
        <label className="label" htmlFor="qq">Nueva pregunta</label>
        <input id="qq" className="input mb-3" required value={d.q} onChange={(e) => setD({ ...d, q: e.target.value })} />
        <div className="grid gap-2 sm:grid-cols-2">
          {d.options.map((o, k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="radio" name="correct" checked={d.answer === k} onChange={() => setD({ ...d, answer: k })} aria-label={`Opción ${k + 1} correcta`} />
              <input className="input" required placeholder={`Opción ${k + 1}`} value={o} onChange={(e) => setD({ ...d, options: d.options.map((x, j) => (j === k ? e.target.value : x)) })} />
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-soft">Marca el círculo de la respuesta correcta.</p>
        <button className="btn btn-primary btn-sm mt-3">Agregar pregunta</button>
      </form>
    </div>
  );
}

// ───────────────────────── Editor de curso ─────────────────────────
type EditorTab = "datos" | "modulos" | "final" | "tareas" | "publicar";

export function CourseEditor({ slug, userId }: { slug: string; userId: string }) {
  const s = useDemo();
  const c = s.customCourses.find((x) => x.slug === slug && x.teacherId === userId);
  const [tab, setTab] = useState<EditorTab>("modulos");
  if (!c) return <Empty>No encontramos este curso entre tus cursos propios.</Empty>;
  const ed = (fn: (x: Course) => Course) => editCourse(slug, fn);
  const tabs: [EditorTab, string][] = [["datos", "Datos"], ["modulos", "Módulos y material"], ["final", "Evaluación final"], ...(c.kind === "largo" ? ([["tareas", "Tareas"]] as [EditorTab, string][]) : []), ["publicar", "Publicar"]];
  const [rl, rc] = REVIEW[c.review ?? "borrador"];

  return (
    <>
      <Link href="/capacitador/cursos" className="text-sm text-soft hover:text-blue">← Mis cursos</Link>
      <div className="mb-5 mt-2 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold">{c.title}</h1><span className={rc}>{rl}</span><span className="badge">{c.kind === "rapido" ? "Pregrabado" : "Larga duración"}</span></div>
      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto pb-1">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "datos" && (
        <div className="card card-pad max-w-3xl space-y-4">
          <div><label className="label" htmlFor="e-t">Título</label><input id="e-t" className="input" value={c.title} onChange={(e) => ed((x) => ({ ...x, title: e.target.value }))} /></div>
          <div><label className="label" htmlFor="e-s">Descripción</label><textarea id="e-s" className="textarea" rows={3} value={c.summary} onChange={(e) => ed((x) => ({ ...x, summary: e.target.value }))} /></div>
          <div><label className="label" htmlFor="e-o">Objetivos (uno por línea)</label><textarea id="e-o" className="textarea" rows={4} value={c.outcomes.join("\n")} onChange={(e) => ed((x) => ({ ...x, outcomes: e.target.value.split("\n") }))} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="e-h">Horas</label><input id="e-h" type="number" min={1} className="input" value={c.hours} onChange={(e) => ed((x) => ({ ...x, hours: Number(e.target.value) }))} /></div>
            <div><label className="label" htmlFor="e-p">Precio (USD)</label><input id="e-p" type="number" min={1} className="input" value={c.price} onChange={(e) => ed((x) => ({ ...x, price: Number(e.target.value) }))} /></div>
          </div>
        </div>
      )}

      {tab === "modulos" && <ModulesTab c={c} ed={ed} />}

      {tab === "final" && (
        <div className="card card-pad max-w-3xl">
          <h2 className="mb-3 font-bold">Evaluación final del curso</h2>
          <p className="mb-4 text-sm text-soft">Se habilita al participante cuando completa el curso ({c.kind === "rapido" ? "todos los videos y las evaluaciones de módulo" : "con el curso pagado al 100%"}). Al aprobarla se emite el certificado.</p>
          <QuizBuilder minQuestions={3} questions={c.quiz.questions} onChange={(qs) => ed((x) => ({ ...x, quiz: mkQuiz(x.quiz.id, "Evaluación final", qs) }))} />
        </div>
      )}

      {tab === "tareas" && <TasksTab c={c} ed={ed} />}

      {tab === "publicar" && (
        <div className="card card-pad max-w-2xl space-y-4">
          <h2 className="font-bold">Requisitos para enviar a revisión</h2>
          <ul className="space-y-1.5 text-sm">{courseReadiness(c).map(([t, ok]) => <li key={t} className={ok ? "text-ok" : "text-soft"}>{ok ? "✔" : "○"} {t}</li>)}</ul>
          {c.review === "rechazado" && c.reviewNote && <p className="rounded-lg bg-[rgba(192,57,43,.08)] p-3 text-sm text-danger"><b>Observación de la administración:</b> {c.reviewNote}</p>}
          {c.review === "revision" && <p className="rounded-lg bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">Tu curso está en revisión por la administración. Te avisaremos cuando se publique.</p>}
          {c.review === "publicado" && <p className="rounded-lg bg-[rgba(34,178,76,.12)] p-3 text-sm text-ok">¡Publicado! Ya aparece en el catálogo y los participantes pueden inscribirse. Si lo editas, volverá a revisión.</p>}
          {(c.review === "borrador" || c.review === "rechazado") && (
            <button className="btn btn-green" disabled={!courseReadiness(c).every(([, ok]) => ok)} onClick={() => submitForReview(slug)}>Enviar a revisión académica</button>
          )}
          <p className="text-xs text-soft">La administración revisa el contenido y lo publica. Tu comisión por cada venta es del {shareOf(s, userId)}% de lo cobrado.</p>
        </div>
      )}
    </>
  );
}

function ModulesTab({ c, ed }: { c: Course; ed: (fn: (x: Course) => Course) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="space-y-5">
      {c.modules.length === 0 && <Empty>Agrega el primer módulo de tu curso.</Empty>}
      {c.modules.map((m, i) => (
        <section key={m.id} className="card card-pad">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold">Módulo {i + 1} · {m.title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => ed((x) => ({ ...x, modules: x.modules.filter((y) => y.id !== m.id) }))}>Eliminar módulo</button>
          </div>
          <ul className="mt-3 divide-y divide-line text-sm">
            {m.lessons.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                <span><b>{l.title}</b> <span className="text-xs capitalize text-soft">· {l.type} · {l.min} min</span><br /><span className="text-xs text-soft">{l.material ? `${l.material.kind === "archivo" ? "📎" : "🔗"} ${l.material.name}` : "⚠ sin material"}</span></span>
                <button className="btn btn-ghost btn-sm" onClick={() => ed((x) => ({ ...x, modules: x.modules.map((y) => (y.id === m.id ? { ...y, lessons: y.lessons.filter((z) => z.id !== l.id) } : y)) }))}>Quitar</button>
              </li>
            ))}
          </ul>
          <LessonForm onAdd={(l) => ed((x) => ({ ...x, modules: x.modules.map((y) => (y.id === m.id ? { ...y, lessons: [...y.lessons, l] } : y)) }))} />
          <details className="mt-4 rounded-xl border border-line p-4" open={!!m.quiz}>
            <summary className="cursor-pointer text-sm font-semibold">📝 Evaluación del módulo {m.quiz ? `(${m.quiz.questions.length} preguntas)` : "(opcional)"}</summary>
            <div className="mt-3">
              <QuizBuilder questions={m.quiz?.questions ?? []} onChange={(qs) => ed((x) => ({ ...x, modules: x.modules.map((y) => (y.id === m.id ? { ...y, quiz: qs.length ? mkQuiz(m.quiz?.id ?? newId("mq"), `Evaluación: ${m.title}`, qs) : undefined } : y)) }))} />
            </div>
          </details>
        </section>
      ))}
      <form className="card card-pad flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); ed((x) => ({ ...x, modules: [...x.modules, { id: newId("m"), title, lessons: [] }] })); setTitle(""); }}>
        <div className="min-w-60 flex-1"><label className="label" htmlFor="m-t">Nuevo módulo</label><input id="m-t" className="input" required placeholder="Ej.: Fundamentos de redes" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <button className="btn btn-primary">+ Agregar módulo</button>
      </form>
    </div>
  );
}

function LessonForm({ onAdd }: { onAdd: (l: Lesson) => void }) {
  const [f, setF] = useState({ title: "", type: "video" as Lesson["type"], min: 20, kind: "archivo" as "archivo" | "enlace", url: "", file: "" });
  return (
    <form className="mt-4 grid gap-3 rounded-xl bg-surface-2 p-4 sm:grid-cols-[1fr_130px_90px]" onSubmit={(e) => {
      e.preventDefault();
      const name = f.kind === "archivo" ? f.file : f.url;
      if (!name) return;
      onAdd({ id: newId("l"), title: f.title, type: f.type, min: f.min, material: { name, kind: f.kind, url: f.kind === "enlace" ? f.url : undefined } });
      setF({ ...f, title: "", url: "", file: "" });
    }}>
      <div><label className="label">Lección</label><input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><label className="label">Tipo</label><select className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Lesson["type"] })}><option value="video">Video</option><option value="lectura">Lectura</option><option value="laboratorio">Laboratorio</option></select></div>
      <div><label className="label">Minutos</label><input type="number" min={1} className="input" value={f.min} onChange={(e) => setF({ ...f, min: Number(e.target.value) })} /></div>
      <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
        <select className="select !w-auto" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "archivo" | "enlace" })} aria-label="Tipo de material"><option value="archivo">Subir archivo</option><option value="enlace">Enlace (YouTube/Vimeo/Drive)</option></select>
        {f.kind === "archivo" ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm"><span className="btn btn-ghost btn-sm">📎 Elegir archivo</span><span className="text-soft">{f.file || "Video, PDF, presentación…"}</span><input type="file" className="sr-only" onChange={(e) => setF({ ...f, file: e.target.files?.[0]?.name ?? "" })} /></label>
        ) : <input className="input min-w-60 flex-1" type="url" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} aria-label="Enlace del material" />}
        <button className="btn btn-primary btn-sm">+ Agregar lección</button>
      </div>
    </form>
  );
}

function TasksTab({ c, ed }: { c: Course; ed: (fn: (x: Course) => Course) => void }) {
  const [f, setF] = useState({ title: "", description: "", due: "", maxPoints: 10 });
  return (
    <div className="max-w-3xl space-y-4">
      {c.assignments.map((a) => (
        <div key={a.id} className="card card-pad flex items-start justify-between gap-3"><div><b>{a.title}</b><p className="text-sm text-soft">{a.description}</p><p className="mt-1 text-xs text-soft">Vence {fmtDate(a.due)} · {a.maxPoints} pts</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => ed((x) => ({ ...x, assignments: x.assignments.filter((y) => y.id !== a.id) }))}>Quitar</button></div>
      ))}
      <form className="card card-pad space-y-3" onSubmit={(e) => { e.preventDefault(); ed((x) => ({ ...x, assignments: [...x.assignments, { id: newId("a"), ...f }] })); setF({ title: "", description: "", due: "", maxPoints: 10 }); }}>
        <h3 className="font-bold">Nueva tarea</h3>
        <div><label className="label" htmlFor="t-t">Título</label><input id="t-t" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label" htmlFor="t-d">Instrucciones</label><textarea id="t-d" className="textarea" rows={3} required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="t-f">Fecha de entrega</label><input id="t-f" type="date" className="input" required value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div><div><label className="label" htmlFor="t-p">Puntos</label><input id="t-p" type="number" min={1} className="input" value={f.maxPoints} onChange={(e) => setF({ ...f, maxPoints: Number(e.target.value) })} /></div></div>
        <button className="btn btn-primary btn-sm">Agregar tarea</button>
      </form>
    </div>
  );
}

// ───────────────────────── Clases en vivo ─────────────────────────
export function TrainerClasses({ userId }: { userId: string }) {
  const { s, mine, sessions } = useTrainer(userId);
  const [f, setF] = useState({ courseSlug: "", title: "", date: "", time: "19:00", hours: 2, platform: "zoom" as "zoom" | "meet" | "otro", link: "" });
  const done = sessions.filter((x) => x.status === "dictada");
  const live = mine.filter((c) => c.kind === "largo" || !c.authored);
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const B = { programada: "badge badge-blue", dictada: "badge badge-green", cancelada: "badge badge-red" } as const;
  return (
    <>
      <PageTitle title="Clases en vivo" sub="Programa tus sesiones por Zoom o Meet y lleva el control de las horas dictadas." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Clases dictadas" value={done.length} tone="green" />
        <Stat label="Horas dictadas" value={`${done.reduce((t, x) => t + x.hours, 0)} h`} tone="blue" />
        <Stat label="Programadas" value={sessions.filter((x) => x.status === "programada").length} tone="violet" />
        <Stat label="Canceladas" value={sessions.filter((x) => x.status === "cancelada").length} tone="amber" />
      </div>
      <form className="card card-pad mb-6 grid gap-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); addSession({ ...f, teacherId: userId, courseSlug: f.courseSlug || live[0]?.slug }); setF({ ...f, title: "", date: "", link: "" }); }}>
        <div className="md:col-span-2"><label className="label" htmlFor="cl-c">Curso</label><select id="cl-c" className="select" value={f.courseSlug || live[0]?.slug} onChange={(e) => setF({ ...f, courseSlug: e.target.value })}>{live.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></div>
        <div className="md:col-span-4"><label className="label" htmlFor="cl-t">Tema de la clase</label><input id="cl-t" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label" htmlFor="cl-d">Fecha</label><input id="cl-d" type="date" className="input" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <div><label className="label" htmlFor="cl-h">Hora</label><input id="cl-h" type="time" className="input" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
        <div><label className="label" htmlFor="cl-n">Horas</label><input id="cl-n" type="number" min={1} max={8} className="input" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} /></div>
        <div><label className="label" htmlFor="cl-p">Plataforma</label><select id="cl-p" className="select" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value as "zoom" | "meet" | "otro" })}><option value="zoom">Zoom</option><option value="meet">Google Meet</option><option value="otro">Otra</option></select></div>
        <div className="md:col-span-2"><label className="label" htmlFor="cl-l">Enlace de la sala</label><input id="cl-l" type="url" className="input" required placeholder="https://" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></div>
        <div className="md:col-span-6"><button className="btn btn-primary btn-sm" disabled={live.length === 0}>+ Programar clase</button>{live.length === 0 && <span className="ml-3 text-xs text-soft">Necesitas un curso de larga duración o asignado para programar clases en vivo.</span>}</div>
      </form>
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Clase</th><th>Curso</th><th>Sala</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={6} className="text-center text-soft">Aún no hay clases.</td></tr>}
            {sorted.map((x) => (
              <tr key={x.id}>
                <td className="whitespace-nowrap">{fmtDate(x.date)}<br /><span className="text-xs text-soft">{x.time} · {x.hours} h</span></td>
                <td className="font-semibold">{x.title}</td>
                <td className="text-soft">{withOverrides(s).find((c) => c.slug === x.courseSlug)?.title}</td>
                <td><a className="text-blue hover:underline" href={x.link} target="_blank" rel="noreferrer">{x.platform === "zoom" ? "Zoom" : x.platform === "meet" ? "Meet" : "Enlace"}</a></td>
                <td><span className={B[x.status]}>{x.status}</span></td>
                <td className="text-right whitespace-nowrap">{x.status === "programada" && <><button className="btn btn-green btn-sm" onClick={() => setSessionStatus(x.id, "dictada")}>Marcar dictada</button> <button className="btn btn-ghost btn-sm" onClick={() => setSessionStatus(x.id, "cancelada")}>Cancelar</button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ───────────────────────── Ventas y pagos ─────────────────────────
export function TrainerEarnings({ userId }: { userId: string }) {
  const { s, mine, accts, students, pay } = useTrainer(userId);
  const share = shareOf(s, userId);
  const total = pay.reduce((t, a) => t + a.total, 0);
  const paid = pay.reduce((t, a) => t + a.paid, 0);
  const myAccts = accts.filter((a) => mine.some((c) => c.slug === a.courseSlug));
  const payouts = s.payouts.filter((p) => p.teacherId === userId).sort((a, b) => b.at.localeCompare(a.at));
  const title = (slug: string) => mine.find((c) => c.slug === slug)?.title ?? slug;
  return (
    <>
      <PageTitle title="Ventas y pagos" sub={`Cursos vendidos y estado de tus pagos. Por tus cursos propios recibes el ${share}% de lo cobrado.`} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Ganancias acumuladas" value={fmtUSD(total)} tone="blue" />
        <Stat label="Pagado a ti" value={fmtUSD(paid)} tone="green" />
        <Stat label="Por cobrar" value={fmtUSD(total - paid)} tone="amber" />
        <Stat label="Matrículas" value={mine.reduce((t, c) => t + students(c.slug).length, 0)} tone="violet" />
      </div>
      <h2 className="mb-3 font-bold">Detalle por curso</h2>
      <div className="card tblwrap mb-8">
        <table className="tbl">
          <thead><tr><th>Curso</th><th>Concepto</th><th>Participantes</th><th>Cobrado a participantes</th><th>Tu ganancia</th><th>Pagado</th><th>Saldo</th></tr></thead>
          <tbody>
            {pay.length === 0 && <tr><td colSpan={7} className="text-center text-soft">Aún no tienes cursos.</td></tr>}
            {pay.filter((a) => mine.some((c) => c.slug === a.courseSlug)).map((a) => (
              <tr key={a.courseSlug}>
                <td className="min-w-48 font-semibold">{title(a.courseSlug)}</td>
                <td className="text-soft">{a.kind === "comision" ? `Comisión ${a.share}%` : `${a.hours} h × ${fmtUSD(a.rate)}`}</td>
                <td>{students(a.courseSlug).length}</td>
                <td>{fmtUSD(myAccts.filter((x) => x.courseSlug === a.courseSlug).reduce((t, x) => t + x.paid, 0))}</td>
                <td className="font-semibold">{fmtUSD(a.total)}</td><td>{fmtUSD(a.paid)}</td>
                <td className={a.balance > 0 ? "font-semibold text-warn" : "text-soft"}>{fmtUSD(a.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 font-bold">Pagos recibidos</h2>
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Curso</th><th>Método</th><th>Nota</th><th className="text-right">Monto</th></tr></thead>
          <tbody>
            {payouts.length === 0 && <tr><td colSpan={5} className="text-center text-soft">Aún no has recibido pagos.</td></tr>}
            {payouts.map((p) => <tr key={p.id}><td className="whitespace-nowrap text-soft">{fmtDate(p.at)}</td><td>{title(p.courseSlug)}</td><td className="capitalize">{p.method}</td><td className="text-soft">{p.note ?? "—"}</td><td className="text-right font-semibold text-ok">{fmtUSD(p.amount)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
