"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PASS_PCT, fmtDate, fmtUSD } from "@/lib/data";
import { PLAN_LABEL, plansFor, schedule, type PlanId } from "@/lib/plans";
import { buyCourse, reportPayment, submitAssignment, submitQuiz, toggleLesson } from "@/app/estudiante/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Progress } from "./ui";

const safe = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);

// ───────── Compra: elegir plan ─────────
export function PlanPicker({ slug, kind, price, start, weeks, months }: { slug: string; kind: "rapido" | "largo"; price: number; start: string; weeks: number; months: number | null }) {
  const plans = plansFor(kind);
  const [plan, setPlan] = useState<PlanId>(plans.includes("anticipo") ? "anticipo" : plans[0]);
  const [busy, go] = useTransition();
  const items = schedule({ kind, price, start, weeks, months }, plan);
  const DESC: Record<PlanId, string> = { contado: "Pagas el 100% al inscribirte.", anticipo: "50% al inscribirte y 50% 30 días antes de que termine el curso.", mensual: "Divides el valor en cuotas mensuales; la primera al inscribirte." };
  return (
    <div className="space-y-4">
      {plans.length > 1 && (
        <div className="grid gap-2">
          {plans.map((p) => (
            <label key={p} className={`card cursor-pointer p-3 text-sm ${plan === p ? "!border-blue-bright shadow-[0_0_0_3px_rgba(31,122,224,.18)]" : "hover:bg-surface-2"}`}>
              <input type="radio" className="sr-only" name="plan" checked={plan === p} onChange={() => setPlan(p)} />
              <b>{PLAN_LABEL[p]}</b> <span className="text-xs text-soft">· hoy {fmtUSD(schedule({ kind, price, start, weeks, months }, p)[0].amount)}</span>
              <p className="text-xs text-soft">{DESC[p]}</p>
            </label>
          ))}
        </div>
      )}
      <ul className="divide-y divide-line rounded-xl bg-surface-2 px-3 text-sm">
        {items.map((i) => <li key={i.n} className="flex justify-between py-2"><span>{i.label} <span className="text-xs text-soft">{i.due ? `· vence ${fmtDate(i.due)}` : "· al inscribirte"}</span></span><b>{fmtUSD(i.amount)}</b></li>)}
        <li className="flex justify-between py-2 font-bold"><span>Total</span><span>{fmtUSD(price)}</span></li>
      </ul>
      <button className="btn btn-green w-full" disabled={busy} onClick={() => go(async () => { await buyCourse(slug, plan); })}>{busy ? "Creando inscripción…" : "Inscribirme y continuar al pago"}</button>
      <p className="text-xs text-soft">Después de inscribirte informarás tu transferencia con el comprobante. El curso se activa cuando administración confirma tu primer pago.</p>
    </div>
  );
}

// ───────── Pago: informar transferencia con comprobante ─────────
export function PaymentForm({ enrollmentId, userId, suggested, max, bank }: { enrollmentId: string; userId: string; suggested: number; max: number; bank: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(suggested));
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form className="mt-3 space-y-3 rounded-xl bg-surface-2 p-4" onSubmit={async (e) => {
      e.preventDefault();
      setErr("");
      if (!file) return setErr("Adjunta el comprobante de la transferencia (imagen o PDF).");
      if (file.size > 10 * 1024 * 1024) return setErr("El comprobante supera 10 MB.");
      setBusy(true);
      const path = `${userId}/${enrollmentId}/${crypto.randomUUID()}-${safe(file.name)}`;
      const up = await supabaseBrowser().storage.from("payment-proofs").upload(path, file, { contentType: file.type });
      if (up.error) { setBusy(false); return setErr("No se pudo subir el comprobante (usa imagen o PDF de hasta 10 MB)."); }
      const r = await reportPayment({ enrollmentId, amount: Number(amount), reference: ref, proofPath: path });
      setBusy(false);
      if (!r.ok) return setErr(r.error ?? "No se pudo registrar el pago.");
      setFile(null); setRef("");
      router.refresh();
    }}>
      <div className="rounded-lg bg-white p-3 text-sm"><b>Transfiere a:</b><pre className="mt-1 whitespace-pre-wrap font-sans text-soft">{bank}</pre></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Monto transferido (USD)</label><input type="number" min={0.01} max={max} step="0.01" required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label className="label">N.º de comprobante / referencia</label><input className="input" maxLength={120} value={ref} onChange={(e) => setRef(e.target.value)} /></div>
      </div>
      <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed border-line bg-white p-3 text-sm"><span className="btn btn-ghost btn-sm">📎 Adjuntar comprobante</span><span className="text-soft">{file?.name ?? "Imagen o PDF · máx. 10 MB"}</span><input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Enviando…" : "Informar pago"}</button>
    </form>
  );
}

// ───────── Campus ─────────
type Q = { q: string; options: string[] };
export type CampusData = {
  enrollmentId: string; userId: string; title: string; kind: "rapido" | "largo";
  state: { lessonsPct: number; paidAll: boolean; tasksTotal: number; tasksDelivered: number; evalLock: string | null; finalBest: number | null; finalPassed: boolean; modulesPending: number; cert: { code: string; status: string } | null };
  modules: { id: string; title: string; quiz: Q[] | null; quizBest: number | null; allDone: boolean; lessons: { id: string; title: string; type: string; minutes: number; done: boolean; material: { kind: string; name: string; url: string | null; video: boolean } | null }[] }[];
  assignments: { id: string; title: string; description: string; due: string; maxPoints: number; sub: { body: string | null; fileName: string | null; at: string; grade: number | null; feedback: string | null } | null }[];
  finalQuiz: Q[] | null;
};
const ICON: Record<string, string> = { video: "▶", lectura: "📄", laboratorio: "🧪" };
type Tab = "resumen" | "contenido" | "tareas" | "evaluacion";

export function CampusLive({ d }: { d: CampusData }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const tabs: [Tab, string][] = [["resumen", "Resumen"], ["contenido", d.kind === "rapido" ? "Videos" : "Contenido"], ...(d.kind === "largo" ? ([["tareas", "Tareas"]] as [Tab, string][]) : []), ["evaluacion", "Evaluación final"]];
  const s = d.state;
  const checklist: [string, boolean][] = d.kind === "rapido"
    ? [[`Ver todos los videos (${s.lessonsPct}%)`, s.lessonsPct === 100], [`Aprobar la evaluación final con ${PASS_PCT}% o más${s.finalBest != null ? ` (tu mejor nota: ${s.finalBest}%)` : ""}`, s.finalPassed], ["Curso pagado al 100%", s.paidAll]]
    : [["Pagar el 100% del curso (requisito para la evaluación)", s.paidAll], [`Entregar todas las tareas (${s.tasksDelivered}/${s.tasksTotal})`, s.tasksDelivered === s.tasksTotal], [`Aprobar la evaluación final con ${PASS_PCT}% o más${s.finalBest != null ? ` (tu mejor nota: ${s.finalBest}%)` : ""}`, s.finalPassed]];
  return (
    <div>
      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto pb-1">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "resumen" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card card-pad"><h3 className="font-bold">Tu avance</h3><div className="mt-3"><div className="mb-1 flex justify-between text-sm"><span>Lecciones completadas</span><b>{s.lessonsPct}%</b></div><Progress value={s.lessonsPct} /></div></div>
          <div className="card card-pad">
            <h3 className="font-bold">🎓 Tu certificado</h3>
            {s.cert?.status === "emitido" ? <><p className="mt-2 text-sm text-ok">¡Emitido! Código {s.cert.code}</p><Link href="/estudiante/certificados" className="btn btn-green btn-sm mt-3">Ver certificado</Link></>
              : s.cert?.status === "pendiente" ? <p className="mt-2 rounded-lg bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">Cumpliste los requisitos. Tu certificado está pendiente de aprobación por el capacitador o coordinación.</p>
              : s.cert?.status === "retenido" ? <p className="mt-2 rounded-lg bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">Tu certificado está retenido. Contacta a administración.</p>
              : <><p className="mt-1 text-xs text-soft">Se emite al cumplir:</p><ul className="mt-2 space-y-1.5 text-sm">{checklist.map(([t, ok]) => <li key={t} className={ok ? "text-ok" : "text-soft"}>{ok ? "✔" : "○"} {t}</li>)}</ul></>}
          </div>
        </div>
      )}

      {tab === "contenido" && <div className="space-y-4">{d.modules.length === 0 && <p className="card card-pad text-sm text-soft">El capacitador aún no cargó contenido.</p>}{d.modules.map((m, i) => <ModuleCard key={m.id} m={m} i={i} d={d} />)}</div>}
      {tab === "tareas" && <div className="space-y-4">{d.assignments.length === 0 && <p className="card card-pad text-sm text-soft">Este curso no tiene tareas.</p>}{d.assignments.map((a) => <TaskCard key={a.id} a={a} d={d} />)}</div>}
      {tab === "evaluacion" && (
        s.evalLock ? <div className="card card-pad border-l-4" style={{ borderLeftColor: "#f59e0b" }}><h3 className="font-display text-lg font-bold">Evaluación final bloqueada</h3><p className="mt-1 text-sm text-soft">{s.evalLock}</p>{!s.paidAll && d.kind === "largo" && <Link href="/estudiante/pagos" className="btn btn-primary btn-sm mt-3">Ir a Mis pagos</Link>}</div>
          : <QuizBox enrollmentId={d.enrollmentId} moduleId={null} title="Evaluación final" questions={d.finalQuiz ?? []} best={s.finalBest} />
      )}
    </div>
  );
}

function ModuleCard({ m, i, d }: { m: CampusData["modules"][number]; i: number; d: CampusData }) {
  const router = useRouter();
  const [busy, go] = useTransition();
  const done = m.lessons.filter((l) => l.done).length;
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3"><h3 className="font-bold">Módulo {i + 1} · {m.title}</h3><span className="text-xs text-soft">{done}/{m.lessons.length} completadas</span></header>
      <ul>
        {m.lessons.map((l) => (
          <li key={l.id} className="border-b border-line px-5 py-3 last:border-0">
            <div className="flex items-start gap-3">
              <button disabled={busy} onClick={() => go(async () => { await toggleLesson(d.enrollmentId, l.id); router.refresh(); })} aria-pressed={l.done} aria-label={`Marcar «${l.title}» como ${l.done ? "pendiente" : "completada"}`} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs transition ${l.done ? "border-green bg-green text-white" : "border-line text-transparent hover:border-green"}`}>✔</button>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${l.done ? "text-soft line-through" : ""}`}>{ICON[l.type]} {l.title}</div>
                <div className="text-xs capitalize text-soft">{l.type} · {l.minutes} min</div>
                {l.material?.url && (l.material.video ? <video controls preload="metadata" className="mt-2 w-full max-w-2xl rounded-lg bg-black" src={l.material.url} /> : <a href={l.material.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-blue hover:underline">{l.material.kind === "enlace" ? "🔗 Abrir material" : `📎 ${l.material.name}`}</a>)}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {m.quiz && <div className="border-t border-line bg-surface-2 p-4">{m.allDone ? <QuizBox enrollmentId={d.enrollmentId} moduleId={m.id} title="Evaluación del módulo" questions={m.quiz} best={m.quizBest} compact /> : <p className="text-sm text-soft">📝 Evaluación del módulo: completa todas las lecciones para rendirla.</p>}</div>}
    </section>
  );
}

function QuizBox({ enrollmentId, moduleId, title, questions, best, compact }: { enrollmentId: string; moduleId: string | null; title: string; questions: Q[]; best: number | null; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(best == null && !compact);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [res, setRes] = useState<{ pct: number; score: number; total: number } | null>(null);
  const [err, setErr] = useState("");
  const [busy, go] = useTransition();
  const passed = (res?.pct ?? best ?? -1) >= PASS_PCT;
  return (
    <div className={compact ? "" : "card card-pad"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">📝 {title}</h3>
        {(res || best != null) && <span className={`badge ${passed ? "badge-green" : "badge-red"}`}>{passed ? "Aprobada" : "No aprobada"} · mejor nota {Math.max(res?.pct ?? 0, best ?? 0)}%</span>}
      </div>
      {res && <p className="mt-2 text-sm">Tu resultado: <b>{res.score}/{res.total} ({res.pct}%)</b>. Mínimo para aprobar: {PASS_PCT}%.</p>}
      {!open && !passed && <button className="btn btn-primary btn-sm mt-3" onClick={() => { setAnswers(questions.map(() => -1)); setRes(null); setOpen(true); }}>{best != null || res ? "Intentar de nuevo" : "Rendir evaluación"}</button>}
      {open && (
        <form className="mt-4 space-y-5" onSubmit={(e) => { e.preventDefault(); setErr(""); go(async () => { const r = await submitQuiz(enrollmentId, moduleId, answers); if (!r.ok) return setErr(r.error ?? "Error"); setRes({ pct: r.pct!, score: r.score!, total: r.total! }); setOpen(false); router.refresh(); }); }}>
          {questions.map((x, qi) => (
            <fieldset key={qi}><legend className="mb-2 text-sm font-semibold">{qi + 1}. {x.q}</legend>
              <div className="grid gap-2 sm:grid-cols-2">{x.options.map((o, oi) => (
                <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-xl border bg-white p-3 text-sm transition ${answers[qi] === oi ? "border-blue-bright bg-[rgba(31,122,224,.08)]" : "border-line hover:bg-surface-2"}`}>
                  <input type="radio" name={`${moduleId ?? "final"}-${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers(answers.map((a, k) => (k === qi ? oi : a)))} />{o}
                </label>))}</div>
            </fieldset>
          ))}
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <button className="btn btn-primary" disabled={answers.includes(-1) || busy}>{busy ? "Calificando…" : "Enviar evaluación"}</button>
        </form>
      )}
    </div>
  );
}

function TaskCard({ a, d }: { a: CampusData["assignments"][number]; d: CampusData }) {
  const router = useRouter();
  const [edit, setEdit] = useState(!a.sub);
  const [body, setBody] = useState(a.sub?.body ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const graded = a.sub?.grade != null;
  return (
    <section className="card card-pad">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{a.title}</h3><p className="mt-1 text-sm text-soft">{a.description}</p></div><div className="text-right text-xs text-soft">Vence {fmtDate(a.due)}<br />{a.maxPoints} pts</div></div>
      {a.sub && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">{graded ? <span className="badge badge-green">Calificada: {a.sub.grade}/{a.maxPoints}</span> : <span className="badge badge-blue">Entregada · pendiente de calificación</span>}<span className="text-xs text-soft">{fmtDate(a.sub.at)}</span></div>
          {a.sub.feedback && <p className="rounded-lg bg-surface-2 p-3"><b>Capacitador:</b> {a.sub.feedback}</p>}
          {!edit && <p className="rounded-lg border border-line p-3 text-soft">{a.sub.body}{a.sub.fileName && <span className="mt-1 block font-semibold text-text">📎 {a.sub.fileName}</span>}</p>}
          {!edit && !graded && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>Editar entrega</button>}
        </div>
      )}
      {edit && !graded && (
        <form className="mt-4 space-y-2" onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          setBusy(true);
          let filePath: string | undefined;
          if (file) {
            if (file.size > 50 * 1024 * 1024) { setBusy(false); return setErr("El archivo supera 50 MB."); }
            filePath = `${d.userId}/${a.id}/${crypto.randomUUID()}-${safe(file.name)}`;
            const up = await supabaseBrowser().storage.from("submissions").upload(filePath, file, { contentType: file.type || "application/octet-stream" });
            if (up.error) { setBusy(false); return setErr("No se pudo subir el archivo (usa PDF, Office, ZIP, imagen o MP4)."); }
          }
          const r = await submitAssignment({ enrollmentId: d.enrollmentId, assignmentId: a.id, body, filePath, fileName: file?.name });
          setBusy(false);
          if (!r.ok) return setErr(r.error ?? "Error");
          setEdit(false); setFile(null);
          router.refresh();
        }}>
          <textarea className="textarea" rows={3} placeholder="Escribe tu respuesta o pega el enlace a tu trabajo…" value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm hover:bg-surface-2"><span className="btn btn-ghost btn-sm">📎 Adjuntar archivo</span><span className="text-soft">{file?.name ?? "PDF, Word, Excel, PowerPoint, ZIP, imagen o MP4 (opcional, máx. 50 MB)"}</span><input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Enviando…" : a.sub ? "Reenviar" : "Entregar tarea"}</button>
        </form>
      )}
    </section>
  );
}
