"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AREAS, PASS_PCT, fmtDate, fmtUSD, lessonsOf } from "@/lib/data";
import { PLAN_LABEL, courseStatus, courses as withOverrides, enrollSelf, enrollments, findUser, gradeAverage, plansFor, progressOf, studentAccounts, submissionsOf, useDemo } from "@/lib/store";
import { Empty, PageTitle, Progress, Stat } from "./ui";

// ───────────────────────── Dashboard académico + financiero ─────────────────────────
export function ParticipantDashboard({ userId, name }: { userId: string; name: string }) {
  const s = useDemo();
  const accts = studentAccounts(s).filter((a) => a.studentId === userId);
  const mine = accts.map((a) => a.course);
  const certs = s.certs.filter((c) => c.studentId === userId);
  const overall = mine.length ? Math.round(mine.reduce((t, c) => t + progressOf(s, userId, c.slug), 0) / mine.length) : 0;
  const avg = gradeAverage(s, userId);
  const pending = mine
    .filter((c) => c.kind === "largo")
    .flatMap((c) => c.assignments.filter((a) => !submissionsOf(s, userId).some((x) => x.assignmentId === a.id)).map((a) => ({ a, c })))
    .sort((x, y) => x.a.due.localeCompare(y.a.due));

  const total = accts.reduce((t, a) => t + a.price, 0);
  const paid = accts.reduce((t, a) => t + a.paid, 0);
  const balance = accts.reduce((t, a) => t + a.balance, 0);
  const upcoming = accts
    .flatMap((a) => a.installments.filter((i) => i.state !== "pagada").map((i) => ({ ...i, course: a.course.title })))
    .sort((x, y) => (x.due ?? "0").localeCompare(y.due ?? "0"));
  const overdue = accts.filter((a) => a.overdue).length;
  const validating = accts.reduce((t, a) => t + a.pendingValidation, 0);
  const anns = s.announcements.filter((a) => mine.some((c) => c.slug === a.courseSlug)).slice(0, 3);

  if (mine.length === 0) {
    return (
      <>
        <PageTitle title={`Bienvenido, ${name.split(" ")[0]} 👋`} sub="Tu plataforma de participante está habilitada." />
        <div className="card card-pad text-center">
          <p className="text-soft">Aún no estás inscrito en ningún curso. Explora la oferta, elige el que más te guste y paga con el plan que prefieras.</p>
          <Link href="/estudiante/catalogo" className="btn btn-primary mt-4">Ver catálogo de cursos</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title={`Hola, ${name.split(" ")[0]} 👋`} sub="Tu resumen académico y financiero." action={<Link href="/estudiante/catalogo" className="btn btn-ghost btn-sm">+ Explorar cursos</Link>} />

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-soft">Dashboard académico</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cursos activos" value={mine.length} tone="blue" />
        <Stat label="Avance global" value={`${overall}%`} tone="green" />
        <Stat label="Promedio" value={avg ?? "—"} hint="sobre 10" tone="violet" />
        <Stat label="Certificados" value={certs.length} tone="amber" />
      </div>
      <div className="mb-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h3 className="mb-3 font-bold">Mis cursos</h3>
          <div className="space-y-3">
            {accts.map((a) => {
              const c = a.course;
              const st = courseStatus(s, userId, c);
              const p = progressOf(s, userId, c.slug);
              const tag = st.cert ? <span className="badge badge-green">Certificado emitido</span>
                : !a.unlocked ? <span className="badge badge-warn">Pago pendiente</span>
                : st.passed ? <span className="badge badge-blue">Evaluación aprobada</span>
                : st.evalLock ? <span className="badge">{st.rapido ? "Viendo videos" : "Pagar para evaluación"}</span>
                : <span className="badge badge-blue">Evaluación disponible</span>;
              return (
                <Link key={c.slug} href={`/estudiante/campus/${c.slug}`} className="card lift flex items-center gap-4 p-4">
                  <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><b className="truncate">{c.title}</b>{tag}</div>
                    <div className="mt-2"><Progress value={p} /></div>
                  </div>
                  <span className="font-display text-lg font-bold">{p}%</span>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="space-y-6">
          <div>
            <h3 className="mb-3 font-bold">Próximas entregas</h3>
            <div className="card divide-y divide-line">
              {pending.length === 0 && <p className="p-4 text-sm text-soft">Sin entregas pendientes 🎉</p>}
              {pending.slice(0, 4).map(({ a, c }) => (
                <Link key={a.id} href={`/estudiante/campus/${c.slug}`} className="block p-4 text-sm hover:bg-surface-2"><b>{a.title}</b><div className="text-xs text-soft">{c.title} · vence {fmtDate(a.due)}</div></Link>
              ))}
            </div>
          </div>
          {anns.length > 0 && (
            <div>
              <h3 className="mb-3 font-bold">Anuncios</h3>
              <div className="space-y-2">{anns.map((a) => <div key={a.id} className="card p-4 text-sm"><b>{a.title}</b><p className="mt-1 text-soft">{a.body}</p><p className="mt-1 text-xs text-soft">{findUser(s, a.authorId)?.name}</p></div>)}</div>
            </div>
          )}
        </section>
      </div>

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-soft">Dashboard financiero</h2>
      {(overdue > 0 || validating > 0) && (
        <div className="mb-4 space-y-2">
          {overdue > 0 && <p role="alert" className="rounded-xl bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">Tienes {overdue} curso{overdue > 1 ? "s" : ""} con cuotas vencidas. <Link href="/estudiante/pagos" className="font-semibold underline">Regularizar</Link></p>}
          {validating > 0 && <p className="rounded-xl bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">Hay {fmtUSD(validating)} en transferencias por validar por administración.</p>}
        </div>
      )}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total contratado" value={fmtUSD(total)} tone="blue" />
        <Stat label="Pagado" value={fmtUSD(paid)} tone="green" />
        <Stat label="Saldo por pagar" value={fmtUSD(balance)} tone="amber" />
        <Stat label="Próxima cuota" value={upcoming[0] ? fmtUSD(upcoming[0].amount) : "—"} hint={upcoming[0] ? (upcoming[0].due ? `vence ${fmtDate(upcoming[0].due)}` : "al inscribirte") : "sin cuotas pendientes"} tone="violet" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad">
          <div className="mb-1 flex justify-between text-sm"><b>Avance de pago</b><span className="text-soft">{total ? Math.round((paid / total) * 100) : 0}%</span></div>
          <Progress value={total ? Math.round((paid / total) * 100) : 0} />
          <ul className="mt-4 space-y-2 text-sm">
            {accts.map((a) => (
              <li key={a.courseSlug} className="flex justify-between gap-3"><span className="truncate">{a.course.title}</span><span className="shrink-0 text-soft">{fmtUSD(a.paid)} / {fmtUSD(a.price)}</span></li>
            ))}
          </ul>
        </section>
        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between"><b>Cuotas pendientes</b><Link href="/estudiante/pagos" className="text-sm font-semibold text-blue">Ver y pagar →</Link></div>
          {upcoming.length === 0 && <p className="text-sm text-soft">Estás al día ✔</p>}
          <ul className="divide-y divide-line text-sm">
            {upcoming.slice(0, 5).map((i) => (
              <li key={`${i.course}${i.n}`} className="flex items-center justify-between gap-3 py-2"><span><b className="block">{i.label}</b><span className="text-xs text-soft">{i.course} · {i.due ? `vence ${fmtDate(i.due)}` : "al inscribirte"}</span></span><b className={i.state === "vencida" ? "text-danger" : ""}>{fmtUSD(i.amount)}</b></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

// ───────────────────────── Catálogo ─────────────────────────
export function Catalog({ userId }: { userId: string }) {
  const s = useDemo();
  const [area, setArea] = useState("Todos");
  const mine = enrollments(s).filter((e) => e.studentId === userId).map((e) => e.courseSlug);
  const list = withOverrides(s).filter((c) => c.published && (area === "Todos" || c.area === area));
  return (
    <>
      <PageTitle title="Catálogo de cursos" sub="Toda la oferta de Amser Global Tech. Elige un curso para ver su información completa." />
      <div className="mb-5 flex flex-wrap gap-2">{AREAS.map((a) => <button key={a} onClick={() => setArea(a)} className={`tab ${area === a ? "on" : "border border-line bg-white"}`}>{a}</button>)}</div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <Link key={c.slug} href={`/estudiante/catalogo/${c.slug}`} className="card lift flex flex-col overflow-hidden">
            <div className="relative h-20" style={{ background: `linear-gradient(135deg, ${c.color}, #0a1730)` }}>
              <span className="badge absolute left-4 top-4" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>{c.area}</span>
              {mine.includes(c.slug) && <span className="badge badge-green absolute right-4 top-4">Inscrito</span>}
              {c.status === "proximamente" && !mine.includes(c.slug) && <span className="badge badge-warn absolute right-4 top-4">Próximamente</span>}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <h3 className="font-bold leading-snug">{c.title}</h3>
              <p className="line-clamp-2 text-sm text-soft">{c.summary}</p>
              <div className="flex flex-wrap gap-1.5"><span className="badge">{c.kind === "rapido" ? `${c.hours} h · pregrabado` : `${c.months} meses`}</span><span className="badge badge-green">{c.kind === "rapido" ? "Pago único" : "Plan de pagos"}</span></div>
              <div className="mt-auto flex items-end justify-between pt-2"><span className="text-xs text-soft">Inicio {fmtDate(c.start)}</span><b className="font-display text-lg text-blue">{fmtUSD(c.price)}</b></div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function CatalogDetail({ slug, userId }: { slug: string; userId: string }) {
  const s = useDemo();
  const router = useRouter();
  const c = withOverrides(s).find((x) => x.slug === slug);
  if (!c) return <Empty>Curso no encontrado.</Empty>;
  const teacher = findUser(s, c.teacherId);
  const enrolled = enrollments(s).some((e) => e.studentId === userId && e.courseSlug === slug);
  const plans = plansFor(c);
  const half = Math.round(c.price / 2);
  const m = c.months ?? 6;

  return (
    <>
      <Link href="/estudiante/catalogo" className="text-sm text-soft hover:text-blue">← Catálogo</Link>
      <div className="mt-3 overflow-hidden rounded-2xl text-white" style={{ background: `linear-gradient(120deg, #0a1730 35%, ${c.color})` }}>
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2"><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.area}</span><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.level}</span><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.modality}</span></div>
          <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">{c.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--on-navy)]">{c.summary}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section><h2 className="mb-3 font-bold">Lo que lograrás</h2><ul className="grid gap-3 sm:grid-cols-2">{c.outcomes.map((o) => <li key={o} className="card flex gap-3 p-4 text-sm"><span className="text-green">✔</span>{o}</li>)}</ul></section>
          <section>
            <h2 className="mb-3 font-bold">Temario ({lessonsOf(c).length} lecciones)</h2>
            <div className="space-y-3">{c.modules.map((mod, i) => (
              <details key={mod.id} open={i === 0} className="card p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display font-semibold"><span>Módulo {i + 1} · {mod.title}</span><span className="text-xs font-normal text-soft">{mod.lessons.length} lecciones</span></summary>
                <ul className="mt-3 divide-y divide-line text-sm">{mod.lessons.map((l) => <li key={l.id} className="flex justify-between py-2"><span>{l.title}</span><span className="text-soft">{l.min} min</span></li>)}</ul>
              </details>
            ))}</div>
          </section>
          <section>
            <h2 className="mb-3 font-bold">Cómo se aprueba y se certifica</h2>
            <div className="card card-pad text-sm">
              {c.kind === "rapido" ? (
                <ol className="list-decimal space-y-1.5 pl-5 text-soft"><li>Ves todos los videos del curso (ya está cargado en la plataforma).</li><li>Rindes la evaluación final.</li><li>Si obtienes <b className="text-text">{PASS_PCT}% o más</b>, se emite tu certificado automáticamente.</li></ol>
              ) : (
                <ol className="list-decimal space-y-1.5 pl-5 text-soft"><li>Cursas los módulos con tu capacitador y entregas las tareas ({c.assignments.length}).</li><li>Para rendir la evaluación final debes tener el curso <b className="text-text">pagado al 100%</b>.</li><li>Con todas las tareas entregadas y la evaluación aprobada (<b className="text-text">{PASS_PCT}% o más</b>), se emite tu certificado.</li></ol>
              )}
            </div>
          </section>
          {teacher && <section><h2 className="mb-3 font-bold">Tu capacitador</h2><div className="card flex gap-4 p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue to-green font-bold text-white">{teacher.name[0]}</span><div><b>{teacher.title} {teacher.name}</b><p className="mt-1 text-sm text-soft">{teacher.bio}</p></div></div></section>}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card card-pad">
            <div className="font-display text-3xl font-extrabold text-blue">{fmtUSD(c.price)}</div>
            <dl className="mt-3 space-y-1.5 text-sm text-soft">
              <div className="flex justify-between"><dt>Inicio</dt><dd className="font-semibold text-text">{fmtDate(c.start)}</dd></div>
              <div className="flex justify-between"><dt>Duración</dt><dd className="font-semibold text-text">{c.kind === "largo" ? `${c.months} meses` : `${c.weeks} semanas`} · {c.hours} h</dd></div>
              <div className="flex justify-between"><dt>Modalidad</dt><dd className="font-semibold text-text">{c.modality}</dd></div>
            </dl>
            <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-soft">
              <b className="block text-text">Formas de pago</b>
              {plans.length === 1 ? <p className="mt-1">Curso pregrabado: pago único del 100% al inscribirte. Accedes al contenido al confirmarse el pago.</p> : (
                <ul className="mt-1 space-y-1">
                  <li>• <b>{PLAN_LABEL.contado}:</b> {fmtUSD(c.price)}</li>
                  <li>• <b>{PLAN_LABEL.anticipo}:</b> {fmtUSD(half)} hoy y {fmtUSD(c.price - half)} 30 días antes de terminar</li>
                  <li>• <b>{m} cuotas mensuales</b> de ~{fmtUSD(Math.round(c.price / m))}</li>
                </ul>
              )}
              <p className="mt-2">Tú eliges el plan al momento de pagar.</p>
            </div>
            {enrolled ? (
              <Link href={`/estudiante/campus/${c.slug}`} className="btn btn-primary mt-4 w-full">Entrar al campus</Link>
            ) : c.status === "proximamente" ? (
              <button className="btn btn-ghost mt-4 w-full" disabled>Inscripciones próximamente</button>
            ) : (
              <button className="btn btn-green mt-4 w-full" onClick={() => { enrollSelf(userId, c.slug); router.push(`/estudiante/campus/${c.slug}`); }}>Inscribirme y pagar</button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

// ───────────────────────── Certificados ─────────────────────────
export function CertificateList({ userId }: { userId: string }) {
  const s = useDemo();
  const certs = s.certs.filter((c) => c.studentId === userId);
  return (
    <>
      <PageTitle title="Mis certificados" sub="Se emiten automáticamente al cumplir los requisitos de cada curso." />
      {certs.length === 0 && <Empty>Aún no tienes certificados. Completa un curso y aprueba su evaluación final ({PASS_PCT}% o más).</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {certs.map((c) => {
          const course = withOverrides(s).find((x) => x.slug === c.courseSlug);
          return (
            <Link key={c.code} href={`/estudiante/certificados/${c.courseSlug}`} className="card lift p-5">
              <span className="text-3xl">🎓</span>
              <h3 className="mt-2 font-bold">{course?.title}</h3>
              <p className="text-xs text-soft">Emitido el {fmtDate(c.at)} · {course?.hours} h · nota {c.score}%</p>
              <p className="mt-2 text-xs"><code>{c.code}</code></p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function CertificateView({ slug, userId }: { slug: string; userId: string }) {
  const s = useDemo();
  const cert = s.certs.find((c) => c.studentId === userId && c.courseSlug === slug);
  const course = withOverrides(s).find((c) => c.slug === slug);
  const user = findUser(s, userId);
  if (!cert || !course) return <><Link href="/estudiante/certificados" className="text-sm text-soft hover:text-blue">← Certificados</Link><div className="mt-4"><Empty>Aún no has obtenido el certificado de este curso.</Empty></div></>;
  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/estudiante/certificados" className="text-sm text-soft hover:text-blue">← Certificados</Link>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 Imprimir / guardar PDF</button>
      </div>
      <div className="cert mx-auto max-w-3xl bg-white p-3 shadow-lg">
        <div className="border-[6px] border-double p-8 text-center md:p-12" style={{ borderColor: "var(--blue)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Amser Global Tech" className="mx-auto h-28 w-auto" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-soft">Certificado de aprobación</p>
          <p className="mt-6 text-sm text-soft">Amser Global Tech certifica que</p>
          <h1 className="my-3 font-display text-3xl font-extrabold md:text-4xl" style={{ color: "var(--navy)" }}>{user?.name}</h1>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-soft">ha aprobado satisfactoriamente el curso</p>
          <h2 className="my-2 font-display text-xl font-bold md:text-2xl" style={{ color: "var(--blue)" }}>{course.title}</h2>
          <p className="text-sm text-soft">con una duración de <b className="text-text">{course.hours} horas</b> y una calificación de <b className="text-text">{cert.score}%</b>.</p>
          <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-soft">
            <div><div className="border-t border-text pt-2">Coordinación Académica</div></div>
            <div><div className="border-t border-text pt-2">Dirección</div></div>
          </div>
          <p className="mt-8 text-xs text-soft">Emitido el {fmtDate(cert.at)} · Código: <code className="font-bold text-text">{cert.code}</code></p>
        </div>
      </div>
    </>
  );
}
