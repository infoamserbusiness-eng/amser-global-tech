"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { PASS_PCT, courseBySlug, fmtDate, fmtUSD, type PayMethod } from "@/lib/data";
import { PLAN_LABEL, addPayment, courseOfAssignment, courses as withOverrides, enrollSelf, enrollments, findUser, gradeAverage, progressOf, studentAccounts, submissionsOf, useDemo } from "@/lib/store";
import { Empty, PageTitle, Progress, Stat } from "./ui";

function myCourses(s: ReturnType<typeof useDemo>, userId: string) {
  const slugs = enrollments(s).filter((e) => e.studentId === userId).map((e) => e.courseSlug);
  return withOverrides(s).filter((c) => slugs.includes(c.slug));
}

export function StudentHome({ userId, name }: { userId: string; name: string }) {
  const s = useDemo();
  const mine = myCourses(s, userId);
  const pending = mine.flatMap((c) => c.assignments.filter((a) => !s.submissions.some((x) => x.studentId === userId && x.assignmentId === a.id)).map((a) => ({ a, c })))
    .sort((x, y) => x.a.due.localeCompare(y.a.due));
  const avg = gradeAverage(s, userId);
  const anns = s.announcements.filter((a) => mine.some((c) => c.slug === a.courseSlug)).slice(0, 4);
  const overall = mine.length ? Math.round(mine.reduce((t, c) => t + progressOf(s, userId, c.slug), 0) / mine.length) : 0;

  return (
    <>
      <PageTitle title={`Hola, ${name.split(" ")[0]} 👋`} sub="Esto es lo que tienes hoy en tu campus." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cursos activos" value={mine.length} tone="blue" />
        <Stat label="Avance global" value={`${overall}%`} tone="green" />
        <Stat label="Tareas pendientes" value={pending.length} tone="amber" />
        <Stat label="Promedio" value={avg ?? "—"} hint="sobre 10" tone="violet" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 font-bold">Continúa aprendiendo</h2>
          <div className="space-y-3">
            {mine.map((c) => {
              const p = progressOf(s, userId, c.slug);
              return (
                <Link key={c.slug} href={`/estudiante/campus/${c.slug}`} className="card lift flex items-center gap-4 p-4">
                  <span className="h-12 w-1.5 rounded-full" style={{ background: c.color }} />
                  <div className="min-w-0 flex-1"><b className="block truncate">{c.title}</b><div className="mt-2"><Progress value={p} /></div></div>
                  <span className="font-display text-lg font-bold">{p}%</span>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="space-y-6">
          <div>
            <h2 className="mb-3 font-bold">Próximas entregas</h2>
            <div className="card divide-y divide-line">
              {pending.length === 0 && <p className="p-4 text-sm text-soft">¡Estás al día! 🎉</p>}
              {pending.slice(0, 4).map(({ a, c }) => (
                <Link key={a.id} href={`/estudiante/campus/${c.slug}`} className="block p-4 text-sm hover:bg-surface-2"><b>{a.title}</b><div className="text-xs text-soft">{c.title} · vence {fmtDate(a.due)}</div></Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-bold">Anuncios recientes</h2>
            <div className="space-y-2">
              {anns.map((a) => <div key={a.id} className="card p-4 text-sm"><b>{a.title}</b><p className="mt-1 text-soft">{a.body}</p><p className="mt-1 text-xs text-soft">{findUser(s, a.authorId)?.name} · {courseBySlug(a.courseSlug)?.title}</p></div>)}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export function StudentCourses({ userId }: { userId: string }) {
  const s = useDemo();
  const mine = myCourses(s, userId);
  const accts = studentAccounts(s).filter((a) => a.studentId === userId);
  const others = withOverrides(s).filter((c) => c.published && c.status === "abierto" && !mine.some((m) => m.slug === c.slug));
  return (
    <>
      <PageTitle title="Mis cursos" sub="Entra al campus de cada curso." />
      {mine.length === 0 && <Empty>Aún no tienes cursos matriculados.</Empty>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {mine.map((c) => {
          const p = progressOf(s, userId, c.slug);
          return (
            <Link key={c.slug} href={`/estudiante/campus/${c.slug}`} className="card lift overflow-hidden">
              <div className="h-20" style={{ background: `linear-gradient(135deg, ${c.color}, #0a1730)` }} />
              <div className="space-y-3 p-5">
                <h3 className="font-bold leading-snug">{c.title}</h3>
                <p className="text-xs text-soft">{findUser(s, c.teacherId)?.title} {findUser(s, c.teacherId)?.name} · {c.modality}</p>
                <div><div className="mb-1 flex justify-between text-xs"><span>Avance</span><b>{p}%</b></div><Progress value={p} /></div>
                {accts.find((a) => a.courseSlug === c.slug && !a.unlocked) ? <span className="btn btn-green btn-sm w-full">Pagar para acceder</span> : <span className="btn btn-primary btn-sm w-full">Entrar al campus</span>}
              </div>
            </Link>
          );
        })}
      </div>
      {others.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-bold">Otros cursos disponibles</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {others.map((c) => (
              <div key={c.slug} className="card flex flex-col gap-3 p-5">
                <div className="flex flex-wrap gap-1.5"><span className="badge badge-blue">{c.area}</span><span className="badge">{c.kind === "rapido" ? "Pago único · pregrabado" : `${c.months} meses · plan de pagos`}</span></div>
                <h3 className="font-bold leading-snug">{c.title}</h3>
                <p className="text-sm text-soft">{c.summary}</p>
                <div className="mt-auto flex items-center justify-between"><b className="font-display text-lg text-blue">{fmtUSD(c.price)}</b>
                  <Link href={`/estudiante/campus/${c.slug}`} onClick={() => enrollSelf(userId, c.slug)} className="btn btn-primary btn-sm">Inscribirme</Link></div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function StudentGrades({ userId }: { userId: string }) {
  const s = useDemo();
  const mine = myCourses(s, userId);
  const subs = submissionsOf(s, userId);
  return (
    <>
      <PageTitle title="Calificaciones" sub="Notas de tareas y evaluaciones por curso." />
      <div className="space-y-5">
        {mine.map((c) => {
          const avg = gradeAverage(s, userId, c.slug);
          const q = s.quiz[`${userId}:${c.quiz.id}`];
          return (
            <section key={c.slug} className="card overflow-hidden">
              <header className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3"><h3 className="font-bold">{c.title}</h3><span className="badge badge-blue">Promedio: {avg ?? "—"}</span></header>
              <table className="tbl">
                <thead><tr><th>Actividad</th><th>Tipo</th><th>Estado</th><th>Nota</th></tr></thead>
                <tbody>
                  {(c.kind === "largo" ? c.assignments : []).map((a) => {
                    const x = subs.find((y) => y.assignmentId === a.id && courseOfAssignment(a.id)?.slug === c.slug);
                    return <tr key={a.id}><td>{a.title}</td><td className="text-soft">Tarea</td><td>{x ? (x.grade != null ? <span className="badge badge-green">Calificada</span> : <span className="badge badge-blue">En revisión</span>) : <span className="badge badge-warn">Pendiente</span>}</td><td className="font-semibold">{x?.grade != null ? `${x.grade}/${a.maxPoints}` : "—"}</td></tr>;
                  })}
                  <tr><td>{c.quiz.title}</td><td className="text-soft">Evaluación</td><td>{q ? (q.score / q.total) * 100 >= PASS_PCT ? <span className="badge badge-green">Aprobada</span> : <span className="badge badge-red">No aprobada</span> : <span className="badge badge-warn">Pendiente</span>}</td><td className="font-semibold">{q ? `${Math.round((q.score / q.total) * 100)}%` : "—"}</td></tr>
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function StudentPayments({ userId }: { userId: string }) {
  const s = useDemo();
  const accts = studentAccounts(s).filter((a) => a.studentId === userId);
  const [open, setOpen] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>("tarjeta");
  const [ref, setRef] = useState("");
  const BADGE = { pagada: "badge badge-green", pendiente: "badge", vencida: "badge badge-red" } as const;
  const pending = s.payments.filter((p) => p.studentId === userId && p.status === "por_validar");

  return (
    <>
      <PageTitle title="Mis pagos" sub="Tu plan de pagos y el estado de cada cuota." />
      {accts.length === 0 && <Empty>No tienes matrículas.</Empty>}
      {pending.length > 0 && <p className="mb-4 rounded-xl bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">Tienes {pending.length} pago{pending.length > 1 ? "s" : ""} por transferencia en validación ({fmtUSD(pending.reduce((t, p) => t + p.amount, 0))}).</p>}
      <div className="space-y-5">
        {accts.map((a) => {
          const k = `${a.courseSlug}`;
          return (
            <section key={k} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-5 py-3">
                <div><h3 className="font-bold">{a.course.title}</h3><p className="text-xs text-soft">{a.plan ? `Plan: ${PLAN_LABEL[a.plan]}` : "Sin plan elegido"} · {a.course.kind === "rapido" ? "Pago único" : `${a.course.months} meses`}</p></div>
                <div className="text-right text-sm"><b>{fmtUSD(a.paid)}</b> <span className="text-soft">de {fmtUSD(a.price)}</span></div>
              </header>
              {!a.plan || a.installments.length === 0 ? (
                <div className="flex items-center justify-between gap-3 p-5 text-sm"><span className="text-soft">Elige tu forma de pago para acceder al curso.</span><Link href={`/estudiante/campus/${a.courseSlug}`} className="btn btn-primary btn-sm">Elegir plan y pagar</Link></div>
              ) : (
                <div className="tblwrap">
                  <table className="tbl">
                    <thead><tr><th>Cuota</th><th>Vence</th><th>Monto</th><th>Estado</th><th /></tr></thead>
                    <tbody>
                      {a.installments.map((i) => {
                        const isNext = a.next?.n === i.n;
                        const kk = `${k}:${i.n}`;
                        return (
                          <Fragment key={kk}>
                            <tr>
                              <td>{i.label}</td>
                              <td className="whitespace-nowrap text-soft">{i.due ? fmtDate(i.due) : "Al inscribirse"}</td>
                              <td className="font-semibold">{fmtUSD(i.amount)}</td>
                              <td><span className={BADGE[i.state]}>{i.state[0].toUpperCase() + i.state.slice(1)}</span></td>
                              <td className="text-right">{isNext && a.pendingValidation === 0 && <button className="btn btn-primary btn-sm" onClick={() => setOpen(open === kk ? null : kk)}>Pagar ahora</button>}</td>
                            </tr>
                            {open === kk && (
                              <tr><td colSpan={5} className="!p-0">
                                <form className="grid gap-2 bg-surface-2 p-3 sm:grid-cols-[180px_1fr_auto_auto] sm:items-end" onSubmit={(e) => {
                                  e.preventDefault();
                                  const amount = Math.min(i.amount, a.balance);
                                  addPayment({ studentId: userId, courseSlug: a.courseSlug, amount, method, note: method === "transferencia" ? `Comprobante: ${ref}` : undefined, status: method === "tarjeta" ? "confirmado" : "por_validar" });
                                  setOpen(null); setRef("");
                                }}>
                                  <div><label className="label">Método</label><select className="select" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}><option value="tarjeta">Tarjeta (inmediato)</option><option value="transferencia">Transferencia (validación)</option></select></div>
                                  {method === "transferencia" ? <div><label className="label">N.º de comprobante</label><input className="input" required value={ref} onChange={(e) => setRef(e.target.value)} /></div> : <p className="text-xs text-soft">Pago simulado en el demo.</p>}
                                  <button className="btn btn-green btn-sm">Pagar {fmtUSD(Math.min(i.amount, a.balance))}</button>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(null)}>Cancelar</button>
                                </form>
                              </td></tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
