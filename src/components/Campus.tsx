"use client";

import Link from "next/link";
import { useState } from "react";
import { PASS_PCT, courseBySlug, fmtDate, fmtUSD, lessonsOf, type Course } from "@/lib/data";
import {
  addAnnouncement, addPost, addReply, courses as withOverrides, enrollments, enrollSelf, findUser, gradeAverage,
  courseStatus, isLive, progressOf, saveQuiz, studentAccounts, submitAssignment, toggleLesson, useDemo, type DemoState,
} from "@/lib/store";
import { Checkout } from "./Checkout";
import type { Quiz } from "@/lib/data";
import { Avatar, Empty, Progress } from "./ui";
import { GradeForm } from "./GradeForm";

type Tab = "resumen" | "contenido" | "tareas" | "evaluacion" | "foro" | "estudiantes";
const ICON = { video: "▶", lectura: "📄", laboratorio: "🧪" } as const;

export function Campus({ slug, role, userId }: { slug: string; role: "student" | "teacher"; userId: string }) {
  const s = useDemo();
  const base = courseBySlug(slug);
  const [tab, setTab] = useState<Tab>("resumen");
  if (!base) return <Empty>Curso no encontrado.</Empty>;
  const c = withOverrides(s).find((x) => x.slug === slug)!;
  const teacher = findUser(s, c.teacherId);
  const isTeacher = role === "teacher";
  const progress = progressOf(s, userId, slug);

  // Control de acceso por pago: el estudiante entra al contenido solo con su primera cuota confirmada.
  const acct = isTeacher ? undefined : studentAccounts(s).find((a) => a.studentId === userId && a.courseSlug === slug);
  let gate: React.ReactNode = null;
  if (!isTeacher) {
    if (!acct) {
      gate = (
        <div className="card card-pad text-center">
          <p className="text-soft">Aún no estás matriculado en este curso.</p>
          <button className="btn btn-primary mt-3" onClick={() => enrollSelf(userId, slug)}>Inscribirme</button>
        </div>
      );
    } else if (!acct.unlocked) {
      gate = acct.pendingValidation > 0 ? (
        <div className="card card-pad border-l-4" style={{ borderLeftColor: "#f59e0b" }}>
          <h2 className="font-display text-lg font-bold">Estamos validando tu pago</h2>
          <p className="mt-1 text-sm text-soft">Recibimos tu comprobante por {fmtUSD(acct.pendingValidation)}. En cuanto administración lo confirme (menos de 24 h), se habilitará el curso automáticamente.</p>
        </div>
      ) : <Checkout course={c} studentId={userId} />;
    }
  }

  const tabs: [Tab, string][] = [
    ["resumen", "Resumen"], ["contenido", c.kind === "rapido" ? "Videos" : "Contenido"], ...(c.kind === "rapido" && !isTeacher ? [] : ([["tareas", isTeacher ? "Entregas" : "Tareas"]] as [Tab, string][])),
    ["evaluacion", "Evaluación"], ["foro", "Foro"], ...(isTeacher ? ([["estudiantes", "Estudiantes"]] as [Tab, string][]) : []),
  ];

  return (
    <div>
      <Link href={isTeacher ? "/capacitador/cursos" : "/estudiante/cursos"} className="text-sm text-soft hover:text-blue">← Mis cursos</Link>
      <div className="mt-3 overflow-hidden rounded-2xl text-white" style={{ background: `linear-gradient(120deg, #0a1730 35%, ${c.color})` }}>
        <div className="p-6 md:p-8">
          <span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.area} · {c.modality}</span>
          <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">{c.title}</h1>
          <p className="mt-1 text-sm text-[var(--on-navy)]">{teacher?.title} {teacher?.name}</p>
          {!isTeacher && !gate && (
            <div className="mt-5 max-w-sm"><div className="mb-1 flex justify-between text-xs"><span>Tu avance</span><b>{progress}%</b></div><Progress value={progress} /></div>
          )}
        </div>
      </div>

      {gate ? <div className="mt-5">{gate}</div> : (
      <>
      {acct?.overdue && (
        <div role="alert" className="mt-5 rounded-xl bg-[rgba(192,57,43,.1)] p-4 text-sm text-danger">
          Tienes una cuota vencida. <Link href="/estudiante/pagos" className="font-semibold underline">Regularizar en Mis pagos</Link>
        </div>
      )}
      <div role="tablist" className="mt-5 flex gap-1 overflow-x-auto pb-1">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "resumen" && <Resumen s={s} c={c} isTeacher={isTeacher} userId={userId} go={setTab} />}
        {tab === "contenido" && <Contenido s={s} c={c} isTeacher={isTeacher} userId={userId} />}
        {tab === "tareas" && <Tareas s={s} c={c} isTeacher={isTeacher} userId={userId} />}
        {tab === "evaluacion" && <Evaluacion s={s} c={c} isTeacher={isTeacher} userId={userId} />}
        {tab === "foro" && <Foro s={s} c={c} userId={userId} />}
        {tab === "estudiantes" && <Estudiantes s={s} c={c} />}
      </div>
      </>
      )}
    </div>
  );
}

type P = { s: DemoState; c: Course; isTeacher: boolean; userId: string };

function Resumen({ s, c, isTeacher, userId, go }: P & { go: (t: Tab) => void }) {
  const anns = s.announcements.filter((a) => a.courseSlug === c.slug);
  const [t, setT] = useState("");
  const [b, setB] = useState("");
  const next = c.assignments.filter((a) => !s.submissions.some((x) => x.studentId === userId && x.assignmentId === a.id)).sort((a, b) => a.due.localeCompare(b.due))[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section>
        <h2 className="mb-3 font-bold">Anuncios del capacitador</h2>
        {isTeacher && (
          <form className="card card-pad mb-4 space-y-2" onSubmit={(e) => { e.preventDefault(); addAnnouncement(c.slug, userId, t, b); setT(""); setB(""); }}>
            <input className="input" placeholder="Título del anuncio" required value={t} onChange={(e) => setT(e.target.value)} />
            <textarea className="textarea" rows={2} placeholder="Mensaje para todo el curso…" required value={b} onChange={(e) => setB(e.target.value)} />
            <button className="btn btn-primary btn-sm">Publicar anuncio</button>
          </form>
        )}
        <div className="space-y-3">
          {anns.length === 0 && <Empty>Aún no hay anuncios.</Empty>}
          {anns.map((a) => (
            <article key={a.id} className="card card-pad">
              <div className="flex items-center justify-between"><b>{a.title}</b><span className="text-xs text-soft">{fmtDate(a.at)}</span></div>
              <p className="mt-1 text-sm text-soft">{a.body}</p>
            </article>
          ))}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="card card-pad">
          <h3 className="font-bold">Acerca del curso</h3>
          <p className="mt-2 text-sm text-soft">{c.summary}</p>
          <p className="mt-3 text-xs text-soft">{c.weeks} semanas · {c.hours} h · Inicio {fmtDate(c.start)}</p>
        </div>
        {!isTeacher && <CertChecklist s={s} c={c} userId={userId} />}
        <UpcomingClasses s={s} slug={c.slug} />
        {!isTeacher && next && (
          <div className="card card-pad">
            <h3 className="font-bold">Próxima entrega</h3>
            <p className="mt-2 text-sm">{next.title}</p>
            <p className="text-xs text-soft">Vence {fmtDate(next.due)}</p>
            <button className="btn btn-primary btn-sm mt-3" onClick={() => go("tareas")}>Ir a la tarea</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Contenido({ s, c, isTeacher, userId }: Pick<P, "s" | "c" | "isTeacher" | "userId">) {
  return (
    <div className="space-y-4">
      {c.modules.map((m, i) => {
        const done = m.lessons.filter((l) => s.completed.includes(`${userId}:${l.id}`)).length;
        return (
          <section key={m.id} className="card overflow-hidden">
            <header className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3">
              <h3 className="font-bold">Módulo {i + 1} · {m.title}</h3>
              {!isTeacher && <span className="text-xs text-soft">{done}/{m.lessons.length} completadas</span>}
            </header>
            <ul>
              {m.lessons.map((l) => {
                const on = s.completed.includes(`${userId}:${l.id}`);
                return (
                  <li key={l.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                    {!isTeacher ? (
                      <button onClick={() => toggleLesson(userId, l.id)} aria-pressed={on} aria-label={`Marcar «${l.title}» como ${on ? "pendiente" : "completada"}`} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs transition ${on ? "border-green bg-green text-white" : "border-line text-transparent hover:border-green"}`}>✔</button>
                    ) : <span className="w-6 text-center">{ICON[l.type]}</span>}
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${on && !isTeacher ? "text-soft line-through" : ""}`}>{ICON[l.type]} {l.title}</div>
                      <div className="text-xs capitalize text-soft">{l.type} · {l.min} min</div>
                      {l.material && (l.material.kind === "enlace" ? <a href={l.material.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-xs font-semibold text-blue hover:underline">🔗 Abrir material</a> : <span className="mt-0.5 inline-block text-xs text-soft">📎 {l.material.name}</span>)}
                    </div>
                  </li>
                );
              })}
            </ul>
{m.quiz && !isTeacher && <ModuleQuiz s={s} quiz={m.quiz} userId={userId} locked={done < m.lessons.length} />}            {m.quiz && isTeacher && <p className="border-t border-line px-5 py-3 text-xs text-soft">📝 Evaluación del módulo: {m.quiz.questions.length} preguntas</p>}
          </section>
        );
      })}
    </div>
  );
}

function Tareas({ s, c, isTeacher, userId }: P) {
  return (
    <div className="space-y-4">
      {c.assignments.map((a) => {
        const subs = s.submissions.filter((x) => x.assignmentId === a.id);
        const mine = subs.find((x) => x.studentId === userId);
        return (
          <section key={a.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h3 className="font-bold">{a.title}</h3><p className="mt-1 text-sm text-soft">{a.description}</p></div>
              <div className="text-right text-xs text-soft">Vence {fmtDate(a.due)}<br />{a.maxPoints} pts</div>
            </div>
            {isTeacher ? (
              <div className="mt-4 space-y-3">
                {subs.length === 0 && <p className="text-sm text-soft">Sin entregas todavía.</p>}
                {subs.map((x) => {
                  const st = findUser(s, x.studentId);
                  return (
                    <div key={x.id} className="rounded-xl border border-line p-4">
                      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-semibold"><Avatar name={st?.name ?? "?"} size={26} />{st?.name}</span>
                        {x.grade != null ? <span className="badge badge-green">{x.grade}/{a.maxPoints}</span> : <span className="badge badge-warn">Por calificar</span>}</div>
                      <p className="mt-2 text-sm text-soft">{x.text}{x.file && <span className="mt-1 block font-semibold text-text">📎 {x.file}</span>}</p>
                      <GradeForm id={x.id} max={a.maxPoints} grade={x.grade} feedback={x.feedback} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <SubmitBox a={a} mine={mine} userId={userId} />
            )}
          </section>
        );
      })}
    </div>
  );
}

function SubmitBox({ a, mine, userId }: { a: Course["assignments"][number]; mine?: DemoState["submissions"][number]; userId: string }) {
  const [text, setText] = useState(mine?.text ?? "");
  const [file, setFile] = useState<string | undefined>(mine?.file);
  const [edit, setEdit] = useState(!mine);
  return (
    <div className="mt-4">
      {mine && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {mine.grade != null ? <span className="badge badge-green">Calificada: {mine.grade}/{a.maxPoints}</span> : <span className="badge badge-blue">Entregada · pendiente de calificación</span>}
          <span className="text-xs text-soft">{fmtDate(mine.at)}</span>
        </div>
      )}
      {mine?.feedback && <p className="mb-3 rounded-lg bg-surface-2 p-3 text-sm"><b>Capacitador:</b> {mine.feedback}</p>}
      {edit ? (
        <form onSubmit={(e) => { e.preventDefault(); submitAssignment(userId, a.id, text, file); setEdit(false); }} className="space-y-2">
          <textarea className="textarea" rows={3} required placeholder="Escribe tu respuesta o pega el enlace a tu trabajo…" value={text} onChange={(e) => setText(e.target.value)} />
          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm hover:bg-surface-2">
            <span className="btn btn-ghost btn-sm">📎 Adjuntar archivo</span>
            <span className="text-soft">{file ?? "PDF, Word, ZIP o imagen (opcional)"}</span>
            <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name)} />
          </label>
          <button className="btn btn-primary btn-sm">{mine ? "Reenviar" : "Entregar tarea"}</button>
        </form>
      ) : (
        <>
          <p className="rounded-lg border border-line p-3 text-sm text-soft">{mine?.text}{mine?.file && <span className="mt-2 block font-semibold text-text">📎 {mine.file}</span>}</p>
          {mine?.grade == null && <button className="btn btn-ghost btn-sm mt-2" onClick={() => setEdit(true)}>Editar entrega</button>}
        </>
      )}
    </div>
  );
}

function Evaluacion({ s, c, isTeacher, userId }: P) {
  const q = c.quiz;
  const key = `${userId}:${q.id}`;
  const prev = s.quiz[key];
  const [answers, setAnswers] = useState<number[]>(() => q.questions.map(() => -1));
  const [showing, setShowing] = useState(false);
  const done = prev != null && !showing;

  if (isTeacher) {
    return (
      <div className="card card-pad">
        <h3 className="font-bold">{q.title}</h3>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">
          {q.questions.map((x) => (
            <li key={x.q}><b>{x.q}</b><ul className="mt-1 text-soft">{x.options.map((o, i) => <li key={o} className={i === x.answer ? "font-semibold text-ok" : ""}>{i === x.answer ? "✔ " : "• "}{o}</li>)}</ul></li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-soft">Los resultados por estudiante aparecen en la pestaña «Estudiantes».</p>
      </div>
    );
  }

  const st = courseStatus(s, userId, c);

  if (st.evalLock) {
    return (
      <div className="card card-pad border-l-4" style={{ borderLeftColor: "#f59e0b" }}>
        <h3 className="font-display text-lg font-bold">Evaluación final bloqueada</h3>
        <p className="mt-1 text-sm text-soft">{st.evalLock}</p>
        {st.rapido ? <p className="mt-2 text-sm font-semibold">Tu avance en videos: {st.lessonsPct}%</p> : <Link href="/estudiante/pagos" className="btn btn-primary btn-sm mt-3">Ir a Mis pagos</Link>}
      </div>
    );
  }

  if (done) {
    const pct = Math.round((prev.score / prev.total) * 100);
    const pass = pct >= PASS_PCT;
    return (
      <div className="card card-pad text-center">
        <div className={`font-display text-5xl font-extrabold ${pass ? "text-ok" : "text-danger"}`}>{pct}%</div>
        <p className="text-xs text-soft">{prev.score} de {prev.total} correctas · mínimo para aprobar: {PASS_PCT}%</p>
        <p className="mt-3 font-semibold">{pass ? "¡Aprobaste la evaluación!" : "Aún no alcanzas la nota mínima. Puedes intentarlo de nuevo."}</p>
        {st.cert ? (
          <Link href={`/estudiante/certificados/${c.slug}`} className="btn btn-green mt-4">🎓 Ver mi certificado</Link>
        ) : pass ? (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-surface-2 p-3 text-sm text-soft">
            Para emitir tu certificado falta: {[!st.paidAll && "pagar el 100% del curso", st.tasksDelivered < st.tasksTotal && `entregar las tareas (${st.tasksDelivered}/${st.tasksTotal})`, st.rapido && st.lessonsPct < 100 && "completar los videos"].filter(Boolean).join(", ")}.
          </p>
        ) : null}
        {!st.cert && <button className="btn btn-ghost mt-4" onClick={() => { setAnswers(q.questions.map(() => -1)); setShowing(true); }}>Intentar de nuevo</button>}
      </div>
    );
  }

  return (
    <form className="card card-pad space-y-6" onSubmit={(e) => {
      e.preventDefault();
      const score = q.questions.filter((x, i) => answers[i] === x.answer).length;
      saveQuiz(userId, q.id, score, q.questions.length);
      setShowing(false);
    }}>
      <h3 className="font-bold">{q.title}</h3>
      {q.questions.map((x, qi) => (
        <fieldset key={x.q}>
          <legend className="mb-2 text-sm font-semibold">{qi + 1}. {x.q}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {x.options.map((o, oi) => (
              <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition ${answers[qi] === oi ? "border-blue-bright bg-[rgba(31,122,224,.08)]" : "border-line hover:bg-surface-2"}`}>
                <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))} />{o}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button className="btn btn-primary" disabled={answers.includes(-1)}>Enviar evaluación</button>
    </form>
  );
}

function Foro({ s, c, userId }: Pick<P, "s" | "c" | "userId">) {
  const [text, setText] = useState("");
  const posts = s.posts.filter((p) => p.courseSlug === c.slug);
  return (
    <div className="space-y-4">
      <form className="card card-pad space-y-2" onSubmit={(e) => { e.preventDefault(); addPost(c.slug, userId, text); setText(""); }}>
        <textarea className="textarea" rows={2} required placeholder="Plantea una pregunta o comparte algo con el curso…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-primary btn-sm">Publicar</button>
      </form>
      {posts.length === 0 && <Empty>Sé el primero en publicar.</Empty>}
      {posts.map((p) => <PostCard key={p.id} s={s} p={p} userId={userId} />)}
    </div>
  );
}

function PostCard({ s, p, userId }: { s: DemoState; p: DemoState["posts"][number]; userId: string }) {
  const [r, setR] = useState("");
  const au = findUser(s, p.authorId);
  return (
    <article className="card card-pad">
      <div className="flex items-center gap-2"><Avatar name={au?.name ?? "?"} /><div><b className="text-sm">{au?.name}</b><span className="ml-2 text-xs text-soft">{fmtDate(p.at)}</span></div></div>
      <p className="mt-2 text-sm">{p.text}</p>
      <div className="mt-3 space-y-2 border-l-2 border-line pl-4">
        {p.replies.map((x, i) => {
          const u = findUser(s, x.authorId);
          return <div key={i} className="text-sm"><b>{u?.name}</b>{u?.role === "teacher" && <span className="badge badge-green ml-2">Capacitador</span>}<p className="text-soft">{x.text}</p></div>;
        })}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addReply(p.id, userId, r); setR(""); }}>
          <input className="input" placeholder="Responder…" required value={r} onChange={(e) => setR(e.target.value)} aria-label="Responder" />
          <button className="btn btn-ghost btn-sm">Enviar</button>
        </form>
      </div>
    </article>
  );
}

function Estudiantes({ s, c }: Pick<P, "s" | "c">) {
  const list = enrollments(s).filter((e) => e.courseSlug === c.slug);
  return (
    <div className="card tblwrap">
      <table className="tbl">
        <thead><tr><th>Estudiante</th><th>Avance</th><th>Promedio</th><th>Lecciones</th></tr></thead>
        <tbody>
          {list.map((e) => {
            const u = findUser(s, e.studentId);
            const p = progressOf(s, e.studentId, c.slug);
            const avg = gradeAverage(s, e.studentId, c.slug);
            return (
              <tr key={e.studentId}>
                <td><span className="flex items-center gap-2"><Avatar name={u?.name ?? "?"} size={26} />{u?.name}</span></td>
                <td className="min-w-40"><div className="flex items-center gap-2"><div className="flex-1"><Progress value={p} /></div><span className="text-xs">{p}%</span></div></td>
                <td>{avg ?? "—"}</td>
                <td className="text-soft">{isLive(s, e.studentId) ? `${lessonsOf(c).filter((l) => s.completed.includes(`${e.studentId}:${l.id}`)).length}/${lessonsOf(c).length}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Requisitos para obtener el certificado según el tipo de curso.
function CertChecklist({ s, c, userId }: { s: DemoState; c: Course; userId: string }) {
  const st = courseStatus(s, userId, c);
  const items: [string, boolean][] = st.rapido
    ? [[`Ver todos los videos (${st.lessonsPct}%)`, st.lessonsPct === 100], [`Aprobar la evaluación final con ${PASS_PCT}% o más${st.quizPct != null ? ` (tu nota: ${st.quizPct}%)` : ""}`, st.passed], ["Curso pagado al 100%", st.paidAll]]
    : [["Pagar el 100% del curso (requisito para rendir la evaluación)", st.paidAll], [`Entregar todas las tareas (${st.tasksDelivered}/${st.tasksTotal})`, st.tasksDelivered === st.tasksTotal], [`Aprobar la evaluación final con ${PASS_PCT}% o más${st.quizPct != null ? ` (tu nota: ${st.quizPct}%)` : ""}`, st.passed]];
  return (
    <div className="card card-pad">
      <h3 className="font-bold">🎓 Tu certificado</h3>
      {st.cert ? (
        <>
          <p className="mt-2 text-sm text-ok">¡Certificado emitido! Código {st.cert.code}</p>
          <Link href={`/estudiante/certificados/${c.slug}`} className="btn btn-green btn-sm mt-3">Ver certificado</Link>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-soft">Se emite automáticamente al cumplir:</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {items.map(([t, ok]) => <li key={t} className={ok ? "text-ok" : "text-soft"}>{ok ? "✔" : "○"} {t}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

// Próximas clases en vivo (Zoom/Meet) del curso.
function UpcomingClasses({ s, slug }: { s: DemoState; slug: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const list = s.sessions.filter((x) => x.courseSlug === slug && x.status === "programada" && x.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  if (list.length === 0) return null;
  return (
    <div className="card card-pad">
      <h3 className="font-bold">📹 Próximas clases en vivo</h3>
      <ul className="mt-2 divide-y divide-line text-sm">
        {list.map((x) => (
          <li key={x.id} className="py-2"><b className="block">{x.title}</b><span className="text-xs text-soft">{fmtDate(x.date)} · {x.time} · {x.platform === "zoom" ? "Zoom" : x.platform === "meet" ? "Meet" : "En línea"}</span>
            <a href={x.link} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm mt-2 w-full">Unirme a la clase</a></li>
        ))}
      </ul>
    </div>
  );
}

// Evaluación de módulo (creada por el capacitador). Se califica sola; hay que aprobarla para habilitar la evaluación final.
function ModuleQuiz({ s, quiz, userId, locked }: { s: DemoState; quiz: Quiz; userId: string; locked: boolean }) {
  const prev = s.quiz[`${userId}:${quiz.id}`];
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<number[]>(() => quiz.questions.map(() => -1));
  const pct = prev ? Math.round((prev.score / prev.total) * 100) : null;
  const pass = pct != null && pct >= PASS_PCT;
  return (
    <div className="border-t border-line bg-surface-2 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-sm">📝 Evaluación del módulo</b>
        {pct != null ? <span className={`badge ${pass ? "badge-green" : "badge-red"}`}>{pass ? "Aprobada" : "No aprobada"} · {pct}%</span> : locked ? <span className="badge">Completa las lecciones para rendirla</span> : null}
      </div>
      {!locked && (!pass) && !open && <button className="btn btn-primary btn-sm mt-3" onClick={() => setOpen(true)}>{prev ? "Intentar de nuevo" : "Rendir evaluación"}</button>}
      {open && !locked && (
        <form className="mt-3 space-y-4" onSubmit={(e) => {
          e.preventDefault();
          saveQuiz(userId, quiz.id, quiz.questions.filter((x, i) => answers[i] === x.answer).length, quiz.questions.length);
          setOpen(false);
          setAnswers(quiz.questions.map(() => -1));
        }}>
          {quiz.questions.map((x, qi) => (
            <fieldset key={qi}>
              <legend className="mb-1 text-sm font-semibold">{qi + 1}. {x.q}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {x.options.map((o, oi) => (
                  <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-2 text-sm ${answers[qi] === oi ? "border-blue-bright" : "border-line"}`}>
                    <input type="radio" name={`${quiz.id}-${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))} />{o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button className="btn btn-green btn-sm" disabled={answers.includes(-1)}>Enviar</button>
        </form>
      )}
    </div>
  );
}
