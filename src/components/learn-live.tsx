import Link from "next/link";
import QRCode from "qrcode";
import { fmtDate, fmtUSD } from "@/lib/data";
import { academicState, financials, listPublished, myEnrollments, publishedBySlug, startOf } from "@/lib/learn";
import { PLAN_LABEL, plansFor } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CampusLive, PaymentForm, PlanPicker, type CampusData } from "./learn-client";
import { PrintButton } from "./profile-client";
import { Empty, PageTitle, Progress, Stat } from "./ui";

type U = { id: string; name: string };
const weeksOf = (c: { kind: string; hours: number; months: number | null }) => (c.kind === "rapido" ? Math.max(1, Math.round(c.hours / 8)) : (c.months ?? 6) * 4);
const ACTIVE = ["activa", "completada"];
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amserglobaltech.com";

// ───────── Inicio: dashboard académico y financiero ─────────
export async function LiveDashboard({ user }: { user: U }) {
  const es = await myEnrollments(user.id);
  const rows = await Promise.all(es.map(async (e) => ({ e, a: await academicState(e.id) })));
  const certs = rows.filter((r) => r.a.cert?.status === "emitido").length;
  const total = rows.reduce((t, r) => t + r.a.fin.price, 0);
  const paid = rows.reduce((t, r) => t + r.a.fin.paid, 0);
  const pending = rows.reduce((t, r) => t + r.a.fin.pending, 0);
  const next = rows.map((r) => r.a.fin.next).filter(Boolean).sort((a, b) => (a!.due ?? "0").localeCompare(b!.due ?? "0"))[0];
  const overdue = rows.filter((r) => r.a.fin.installments.some((i) => i.state === "vencida")).length;
  const avg = rows.length ? Math.round(rows.reduce((t, r) => t + r.a.lessonsPct, 0) / rows.length) : 0;
  if (rows.length === 0) {
    return (
      <>
        <PageTitle title={`Bienvenido, ${user.name.split(" ")[0]} 👋`} sub="Tu portal de participante está habilitado." />
        <div className="card card-pad text-center"><p className="text-soft">Aún no estás inscrito en ningún curso. Explora el catálogo, elige el que más te guste y paga con el plan que prefieras.</p><Link href="/estudiante/catalogo" className="btn btn-primary mt-4">Ver catálogo de cursos</Link></div>
      </>
    );
  }
  return (
    <>
      <PageTitle title={`Hola, ${user.name.split(" ")[0]} 👋`} sub="Tu resumen académico y financiero." action={<Link href="/estudiante/catalogo" className="btn btn-ghost btn-sm">+ Explorar cursos</Link>} />
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-soft">Dashboard académico</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cursos" value={rows.length} tone="blue" /><Stat label="Avance medio" value={`${avg}%`} tone="green" />
        <Stat label="Certificados" value={certs} tone="amber" /><Stat label="Tareas pendientes" value={rows.reduce((t, r) => t + (r.a.tasksTotal - r.a.tasksDelivered), 0)} tone="violet" />
      </div>
      <div className="mb-8 space-y-3">
        {rows.map(({ e, a }) => (
          <Link key={e.id} href={`/estudiante/campus/${e.course.slug}`} className="card lift flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><b className="truncate">{e.course.title}</b>
                {a.cert?.status === "emitido" ? <span className="badge badge-green">Certificado emitido</span> : e.status === "pendiente_pago" ? <span className="badge badge-warn">Pago pendiente</span> : a.finalPassed ? <span className="badge badge-blue">Evaluación aprobada</span> : a.evalLock ? <span className="badge">En curso</span> : <span className="badge badge-blue">Evaluación disponible</span>}</div>
              <div className="mt-2"><Progress value={a.lessonsPct} /></div>
            </div>
            <span className="font-display text-lg font-bold">{a.lessonsPct}%</span>
          </Link>
        ))}
      </div>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-soft">Dashboard financiero</h2>
      {overdue > 0 && <p role="alert" className="mb-3 rounded-xl bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">Tienes cuotas vencidas. <Link href="/estudiante/pagos" className="font-semibold underline">Regularizar</Link></p>}
      {pending > 0 && <p className="mb-3 rounded-xl bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">Hay {fmtUSD(pending)} en transferencias por validar por administración.</p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total contratado" value={fmtUSD(total)} tone="blue" /><Stat label="Pagado" value={fmtUSD(paid)} tone="green" />
        <Stat label="Saldo" value={fmtUSD(Math.max(0, total - paid))} tone="amber" />
        <Stat label="Próxima cuota" value={next ? fmtUSD(next.amount) : "—"} hint={next ? (next.due ? `vence ${fmtDate(next.due)}` : "al inscribirte") : "sin cuotas pendientes"} tone="violet" />
      </div>
    </>
  );
}

// ───────── Catálogo (aquí SÍ se ve el precio) ─────────
export async function LiveCatalog({ user }: { user: U }) {
  const [list, mine] = await Promise.all([listPublished(), myEnrollments(user.id)]);
  const enrolled = new Set(mine.map((m) => m.course.id));
  return (
    <>
      <PageTitle title="Catálogo de cursos" sub="Toda la oferta de Amser Global Tech. Elige un curso para ver su información completa y comprarlo." />
      {list.length === 0 && <Empty>Aún no hay cursos publicados. Muy pronto tendremos nuevos cursos para ti.</Empty>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <Link key={c.id} href={`/estudiante/catalogo/${c.slug}`} className="card lift flex flex-col p-5">
            <div className="flex flex-wrap gap-1.5"><span className="badge badge-blue">{c.area}</span><span className="badge">{c.kind === "rapido" ? `${c.hours} h · pregrabado` : `${c.months} meses`}</span>{enrolled.has(c.id) && <span className="badge badge-green">Inscrito</span>}</div>
            <h3 className="mt-3 font-bold leading-snug">{c.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-soft">{c.summary}</p>
            <div className="mt-auto flex items-end justify-between pt-4"><span className="text-xs text-soft">{c.teacher_name}</span><b className="font-display text-xl text-blue">{fmtUSD(c.sale_price)}</b></div>
          </Link>
        ))}
      </div>
    </>
  );
}

export async function LiveCatalogDetail({ slug, user, err }: { slug: string; user: U; err?: string }) {
  const c = await publishedBySlug(slug);
  if (!c) return <Empty>Este curso ya no está disponible.</Empty>;
  const mine = (await myEnrollments(user.id)).find((m) => m.course.id === c.id);
  const admin = supabaseAdmin();
  const { data: mods } = await admin.from("course_modules").select("id, title").eq("course_id", c.id).order("position");
  const { data: ls } = await admin.from("course_lessons").select("module_id, title, minutes").eq("course_id", c.id).order("position");
  return (
    <>
      <Link href="/estudiante/catalogo" className="text-sm text-soft hover:text-blue">← Catálogo</Link>
      <div className="mt-3 rounded-2xl bg-gradient-to-r from-navy to-blue p-6 text-white md:p-8">
        <div className="flex flex-wrap gap-2"><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.area}</span><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.level}</span></div>
        <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">{c.title}</h1><p className="mt-2 max-w-2xl text-sm text-white/85">{c.summary}</p>
      </div>
      {err && <p role="alert" className="mt-4 rounded-lg bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">{err}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section><h2 className="mb-3 font-bold">Lo que lograrás</h2><ul className="grid gap-3 sm:grid-cols-2">{c.outcomes.map((o) => <li key={o} className="card flex gap-3 p-4 text-sm"><span className="text-green">✔</span>{o}</li>)}</ul></section>
          <section><h2 className="mb-3 font-bold">Temario</h2><div className="space-y-3">{(mods ?? []).map((m, i) => <details key={m.id} open={i === 0} className="card p-4"><summary className="cursor-pointer list-none font-display font-semibold">Módulo {i + 1} · {m.title}</summary><ul className="mt-3 divide-y divide-line text-sm">{(ls ?? []).filter((l) => l.module_id === m.id).map((l) => <li key={l.title} className="flex justify-between py-2"><span>{l.title}</span><span className="text-soft">{l.minutes} min</span></li>)}</ul></details>)}</div></section>
          <section className="card card-pad text-sm"><h2 className="mb-2 font-bold">Cómo se aprueba y se certifica</h2>
            {c.kind === "rapido" ? <ol className="list-decimal space-y-1 pl-5 text-soft"><li>Ves todos los videos del curso.</li><li>Rindes la evaluación final: con 70% o más apruebas.</li><li>Se emite tu certificado.</li></ol>
              : <ol className="list-decimal space-y-1 pl-5 text-soft"><li>Cursas los módulos y entregas las tareas.</li><li>Para rendir la evaluación final debes tener el curso pagado al 100%.</li><li>Con todas las tareas entregadas y la evaluación aprobada (70% o más) se emite tu certificado.</li></ol>}</section>
          {c.teacher_name && <section className="card flex gap-4 p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue to-green font-bold text-white">{c.teacher_name[0]}</span><div><b>{c.teacher_name}</b><p className="mt-1 text-sm text-soft">{c.teacher_bio}</p></div></section>}
        </div>
        <aside className="lg:sticky lg:top-6 lg:self-start"><div className="card card-pad">
          <div className="font-display text-3xl font-extrabold text-blue">{fmtUSD(c.sale_price)}</div>
          <dl className="mt-3 space-y-1.5 text-sm text-soft"><div className="flex justify-between"><dt>Inicio</dt><dd className="font-semibold text-text">{fmtDate(startOf(c))}</dd></div><div className="flex justify-between"><dt>Duración</dt><dd className="font-semibold text-text">{c.kind === "largo" ? `${c.months} meses` : `${weeksOf(c)} semanas`} · {c.hours} h</dd></div></dl>
          <hr className="my-4 border-line" />
          {mine ? <Link href={mine.status === "pendiente_pago" ? "/estudiante/pagos" : `/estudiante/campus/${c.slug}`} className="btn btn-primary w-full">{mine.status === "pendiente_pago" ? "Completar mi pago" : "Entrar al campus"}</Link>
            : c.site_status === "proximamente" ? <button className="btn btn-ghost w-full" disabled>Inscripciones próximamente</button>
            : <PlanPicker slug={c.slug} kind={c.kind} price={c.sale_price} start={startOf(c)} weeks={weeksOf(c)} months={c.months} />}
        </div></aside>
      </div>
    </>
  );
}

// ───────── Mis cursos ─────────
export async function LiveMyCourses({ user }: { user: U }) {
  const es = await myEnrollments(user.id);
  return (
    <>
      <PageTitle title="Mis cursos" sub="Entra al campus de cada curso." />
      {es.length === 0 && <Empty>Aún no tienes cursos. <Link href="/estudiante/catalogo" className="font-semibold text-blue">Explora el catálogo</Link>.</Empty>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {es.map((e) => (
          <Link key={e.id} href={e.status === "pendiente_pago" ? "/estudiante/pagos" : `/estudiante/campus/${e.course.slug}`} className="card lift p-5">
            <div className="flex flex-wrap gap-1.5"><span className="badge">{e.course.kind === "rapido" ? "Pregrabado" : "Larga duración"}</span>{e.status === "pendiente_pago" ? <span className="badge badge-warn">Pago pendiente</span> : e.status === "completada" ? <span className="badge badge-green">Completado</span> : <span className="badge badge-blue">Activo</span>}</div>
            <h3 className="mt-3 font-bold leading-snug">{e.course.title}</h3><p className="mt-1 text-xs text-soft">{e.course.teacher_name}</p>
            <span className={`btn btn-sm mt-4 w-full ${e.status === "pendiente_pago" ? "btn-green" : "btn-primary"}`}>{e.status === "pendiente_pago" ? "Pagar para acceder" : "Entrar al campus"}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

// ───────── Campus ─────────
export async function LiveCampus({ slug, user }: { slug: string; user: U }) {
  const e = (await myEnrollments(user.id)).find((x) => x.course.slug === slug);
  if (!e) return <Empty>No estás inscrito en este curso. <Link href={`/estudiante/catalogo/${slug}`} className="font-semibold text-blue">Ver el curso</Link>.</Empty>;
  const head = (
    <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-blue p-6 text-white md:p-8">
      <span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{e.course.area} · {e.course.kind === "rapido" ? "Pregrabado" : "Larga duración"}</span>
      <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">{e.course.title}</h1><p className="mt-1 text-sm text-white/80">{e.course.teacher_name}</p>
    </div>
  );
  if (!ACTIVE.includes(e.status)) {
    return <>{head}<div className="card card-pad border-l-4" style={{ borderLeftColor: "#f59e0b" }}><h2 className="font-display text-lg font-bold">Tu curso se activa al confirmar tu primer pago</h2><p className="mt-1 text-sm text-soft">Informa tu transferencia con el comprobante; administración la valida y se habilita el campus.</p><Link href="/estudiante/pagos" className="btn btn-primary btn-sm mt-3">Ir a Mis pagos</Link></div></>;
  }
  const admin = supabaseAdmin();
  const st = await academicState(e.id);
  const { data: mods } = await admin.from("course_modules").select("id, title, quiz").eq("course_id", e.course.id).order("position");
  const { data: ls } = await admin.from("course_lessons").select("id, module_id, title, type, minutes, material_kind, material_name, material_url, material_path").eq("course_id", e.course.id).order("position");
  const { data: done } = await admin.from("lesson_progress").select("lesson_id").eq("enrollment_id", e.id);
  const { data: asg } = await admin.from("course_assignments").select("id, title, description, due, max_points").eq("course_id", e.course.id).order("due");
  const { data: subs } = await admin.from("submissions").select("assignment_id, body, file_name, submitted_at, grade, feedback").eq("enrollment_id", e.id);
  const { data: full } = await admin.from("courses").select("final_quiz").eq("id", e.course.id).single();
  const doneSet = new Set((done ?? []).map((d) => d.lesson_id));
  const clean = (q: unknown): { q: string; options: string[] }[] | null => (Array.isArray(q) && q.length ? q.map((x: { q: string; options: string[] }) => ({ q: x.q, options: x.options })) : null); // sin respuestas

  const modules: CampusData["modules"] = await Promise.all((mods ?? []).map(async (m) => {
    const lessons = await Promise.all((ls ?? []).filter((l) => l.module_id === m.id).map(async (l) => {
      let url: string | null = null;
      if (l.material_kind === "enlace") url = l.material_url;
      else if (l.material_path) url = (await admin.storage.from("course-materials").createSignedUrl(l.material_path, 3600)).data?.signedUrl ?? null;
      const video = l.material_kind === "archivo" && /\.(mp4|webm|mov)$/i.test(l.material_name ?? "");
      return { id: l.id, title: l.title, type: l.type, minutes: l.minutes, done: doneSet.has(l.id), material: l.material_kind ? { kind: l.material_kind, name: l.material_name ?? "material", url, video } : null };
    }));
    return { id: m.id, title: m.title, quiz: clean(m.quiz), quizBest: st.best(m.id), allDone: lessons.every((l) => l.done), lessons };
  }));
  const data: CampusData = {
    enrollmentId: e.id, userId: user.id, title: e.course.title, kind: e.course.kind,
    state: { lessonsPct: st.lessonsPct, paidAll: st.paidAll, tasksTotal: st.tasksTotal, tasksDelivered: st.tasksDelivered, evalLock: st.evalLock, finalBest: st.finalBest, finalPassed: st.finalPassed, modulesPending: st.modulesPending, cert: st.cert ? { code: st.cert.code, status: st.cert.status } : null },
    modules,
    assignments: e.course.kind === "largo" ? (asg ?? []).map((a) => { const s = (subs ?? []).find((x) => x.assignment_id === a.id); return { id: a.id, title: a.title, description: a.description, due: a.due, maxPoints: a.max_points, sub: s ? { body: s.body, fileName: s.file_name, at: s.submitted_at, grade: s.grade == null ? null : Number(s.grade), feedback: s.feedback } : null }; }) : [],
    finalQuiz: st.evalLock ? null : clean(full?.final_quiz),
  };
  const inst = st.fin.installments.filter((i) => i.state === "vencida").length;
  return <>{head}{inst > 0 && <p role="alert" className="mb-4 rounded-xl bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">Tienes una cuota vencida. <Link href="/estudiante/pagos" className="font-semibold underline">Regularizar en Mis pagos</Link></p>}<CampusLive d={data} /></>;
}

// ───────── Pagos ─────────
export async function LivePayments({ user, msg }: { user: U; msg?: string }) {
  const es = await myEnrollments(user.id);
  const { data: bank } = await supabaseAdmin().from("site_settings").select("value").eq("key", "bank_info").maybeSingle();
  const rows = await Promise.all(es.map(async (e) => ({ e, f: await financials(e.id) })));
  const BADGE = { pagada: "badge badge-green", pendiente: "badge", vencida: "badge badge-red" } as const;
  return (
    <>
      <PageTitle title="Mis pagos" sub="Tu plan de pagos y el estado de cada cuota." />
      {msg && <p role="status" className="mb-4 rounded-lg bg-[rgba(34,178,76,.12)] p-3 text-sm text-ok">✔ {msg}</p>}
      {rows.length === 0 && <Empty>Aún no tienes inscripciones.</Empty>}
      <div className="space-y-5">
        {rows.map(({ e, f }) => {
          const open = Math.round((f.balance - f.pending) * 100) / 100;
          return (
            <section key={e.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-5 py-3"><div><h3 className="font-bold">{e.course.title}</h3><p className="text-xs text-soft">{e.plan ? `Plan: ${PLAN_LABEL[e.plan]}` : ""}</p></div><div className="text-right text-sm"><b>{fmtUSD(f.paid)}</b> <span className="text-soft">de {fmtUSD(f.price)}</span></div></header>
              <div className="tblwrap"><table className="tbl"><thead><tr><th>Cuota</th><th>Vence</th><th>Monto</th><th>Estado</th></tr></thead><tbody>
                {f.installments.map((i) => <tr key={i.n}><td>{i.label}</td><td className="whitespace-nowrap text-soft">{i.due ? fmtDate(i.due) : "Al inscribirse"}</td><td className="font-semibold">{fmtUSD(i.amount)}</td><td><span className={BADGE[i.state]}>{i.state[0].toUpperCase() + i.state.slice(1)}</span></td></tr>)}
              </tbody></table></div>
              {f.payments.length > 0 && <div className="border-t border-line px-5 py-3 text-xs text-soft"><b className="text-text">Tus pagos informados:</b> {f.payments.map((p) => `${fmtUSD(Number(p.amount))} (${p.status === "confirmado" ? "confirmado" : p.status === "rechazado" ? "rechazado" : "en validación"})`).join(" · ")}</div>}
              {open > 0 && <div className="border-t border-line px-5 pb-5"><PaymentForm enrollmentId={e.id} userId={user.id} suggested={Math.min(open, f.next?.amount ?? open)} max={open} bank={bank?.value ?? ""} /></div>}
            </section>
          );
        })}
      </div>
    </>
  );
}

// ───────── Calificaciones ─────────
export async function LiveGrades({ user }: { user: U }) {
  const es = await myEnrollments(user.id);
  const admin = supabaseAdmin();
  const blocks = await Promise.all(es.map(async (e) => {
    const { data: asg } = await admin.from("course_assignments").select("id, title, max_points").eq("course_id", e.course.id).order("due");
    const { data: subs } = await admin.from("submissions").select("assignment_id, grade, feedback").eq("enrollment_id", e.id);
    const st = await academicState(e.id);
    return { e, asg: e.course.kind === "largo" ? asg ?? [] : [], subs: subs ?? [], st };
  }));
  return (
    <>
      <PageTitle title="Calificaciones" sub="Notas de tareas y evaluaciones por curso." />
      {blocks.length === 0 && <Empty>Aún no tienes cursos.</Empty>}
      <div className="space-y-5">{blocks.map(({ e, asg, subs, st }) => (
        <section key={e.id} className="card overflow-hidden"><header className="border-b border-line bg-surface-2 px-5 py-3"><h3 className="font-bold">{e.course.title}</h3></header>
          <table className="tbl"><thead><tr><th>Actividad</th><th>Tipo</th><th>Estado</th><th>Nota</th></tr></thead><tbody>
            {asg.map((a) => { const s = subs.find((x) => x.assignment_id === a.id); return <tr key={a.id}><td>{a.title}{s?.feedback && <span className="block text-xs text-soft">«{s.feedback}»</span>}</td><td className="text-soft">Tarea</td><td>{s ? (s.grade != null ? <span className="badge badge-green">Calificada</span> : <span className="badge badge-blue">En revisión</span>) : <span className="badge badge-warn">Pendiente</span>}</td><td className="font-semibold">{s?.grade != null ? `${Number(s.grade)}/${a.max_points}` : "—"}</td></tr>; })}
            <tr><td>Evaluación final</td><td className="text-soft">Evaluación</td><td>{st.finalBest == null ? <span className="badge badge-warn">Pendiente</span> : st.finalPassed ? <span className="badge badge-green">Aprobada</span> : <span className="badge badge-red">No aprobada</span>}</td><td className="font-semibold">{st.finalBest != null ? `${st.finalBest}%` : "—"}</td></tr>
          </tbody></table></section>
      ))}</div>
    </>
  );
}

// ───────── Certificados ─────────
export async function LiveCertificates({ user }: { user: U }) {
  const es = await myEnrollments(user.id);
  const certs = (await Promise.all(es.map(async (e) => { const { data } = await supabaseAdmin().from("certificates").select("code, status, issued_at, score").eq("enrollment_id", e.id).maybeSingle(); return data ? { e, c: data } : null; }))).filter(Boolean) as { e: (typeof es)[number]; c: { code: string; status: string; issued_at: string; score: number } }[];
  return (
    <>
      <PageTitle title="Mis certificados" sub="Se emiten al cumplir los requisitos de cada curso." />
      {certs.length === 0 && <Empty>Aún no tienes certificados. Completa un curso y aprueba su evaluación final.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">{certs.map(({ e, c }) => (
        <div key={c.code} className="card p-5"><span className="text-3xl">🎓</span><h3 className="mt-2 font-bold">{e.course.title}</h3>
          {c.status === "emitido" ? <><p className="text-xs text-soft">Emitido el {fmtDate(c.issued_at)} · nota {c.score}% · <code>{c.code}</code></p><Link href={`/estudiante/certificados/${e.course.slug}`} className="btn btn-green btn-sm mt-3">Ver / imprimir</Link></>
            : <p className="mt-2 rounded-lg bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">{c.status === "pendiente" ? "Cumpliste los requisitos. Está pendiente de aprobación." : "Retenido por administración académica."}</p>}</div>
      ))}</div>
    </>
  );
}

export async function LiveCertificate({ slug, user }: { slug: string; user: U }) {
  const e = (await myEnrollments(user.id)).find((x) => x.course.slug === slug);
  const { data: c } = e ? await supabaseAdmin().from("certificates").select("code, status, issued_at, score").eq("enrollment_id", e.id).maybeSingle() : { data: null };
  if (!e || !c || c.status !== "emitido") return <><Link href="/estudiante/certificados" className="text-sm text-soft hover:text-blue">← Certificados</Link><div className="mt-4"><Empty>Aún no tienes el certificado de este curso.</Empty></div></>;
  const qr = await QRCode.toDataURL(`${SITE}/verificar/certificado/${c.code}`, { margin: 1, width: 200, color: { dark: "#0a1730", light: "#ffffff" } });
  return (
    <>
      <div className="no-print mb-4"><Link href="/estudiante/certificados" className="text-sm text-soft hover:text-blue">← Certificados</Link></div>
      <div className="cert mx-auto max-w-3xl bg-white p-3 shadow-lg">
        <div className="border-[6px] border-double p-8 text-center md:p-12" style={{ borderColor: "var(--blue)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Amser Global Tech" className="mx-auto h-28 w-auto" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-soft">Certificado de aprobación</p>
          <p className="mt-6 text-sm text-soft">Amser Global Tech certifica que</p>
          <h1 className="my-3 font-display text-3xl font-extrabold md:text-4xl" style={{ color: "var(--navy)" }}>{user.name}</h1>
          <p className="text-sm text-soft">ha aprobado satisfactoriamente el curso</p>
          <h2 className="my-2 font-display text-xl font-bold md:text-2xl" style={{ color: "var(--blue)" }}>{e.course.title}</h2>
          <p className="text-sm text-soft">con una duración de <b className="text-text">{e.course.hours} horas</b> y una calificación de <b className="text-text">{c.score}%</b>.</p>
          <div className="mt-8 flex items-end justify-between gap-6 text-xs text-soft">
            <div className="flex-1"><div className="border-t border-text pt-2">Dirección Académica</div></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div><img src={qr} alt="QR de verificación del certificado" className="mx-auto h-20 w-20" /><span className="text-[9px] uppercase">Verificar</span></div>
            <div className="flex-1"><div className="border-t border-text pt-2">Dirección</div></div>
          </div>
          <p className="mt-6 text-xs text-soft">Emitido el {fmtDate(c.issued_at)} · Código: <code className="font-bold text-text">{c.code}</code></p>
        </div>
      </div>
      <div className="no-print mt-4 text-center"><PrintButton /></div>
    </>
  );
}

