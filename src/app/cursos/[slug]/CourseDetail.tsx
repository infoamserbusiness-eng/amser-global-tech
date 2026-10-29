"use client";

import Link from "next/link";
import { courseBySlug, fmtDate, fmtUSD, lessonsOf, userById, type Course } from "@/lib/data";
import { courses as withOverrides, useDemo } from "@/lib/store";

const ICON = { video: "▶", lectura: "📄", laboratorio: "🧪" } as const;

export function CourseDetail({ slug, course }: { slug: string; course?: Course }) {
  const s = useDemo();
  const c = course ?? withOverrides(s).find((x) => x.slug === slug) ?? courseBySlug(slug);
  if (!c) return <div className="container-x py-24 text-center"><h1 className="text-2xl font-bold">Curso no encontrado</h1><Link href="/cursos" className="btn btn-primary mt-4">Ver cursos</Link></div>;
  const found = userById(c.teacherId);
  const teacher = found ?? (c.teacherName ? { name: c.teacherName, title: "", bio: c.teacherBio } : undefined);
  return (
    <>
      <section className="text-white" style={{ background: `linear-gradient(135deg, #0a1730 40%, ${c.color})` }}>
        <div className="container-x py-12">
          <Link href="/cursos" className="text-sm text-[var(--on-navy-soft)] hover:text-white">← Todos los cursos</Link>
          <div className="mt-4 flex flex-wrap gap-2"><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.area}</span><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.level}</span><span className="badge" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{c.modality}</span></div>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold md:text-5xl">{c.title}</h1>
          <p className="mt-3 max-w-2xl text-[var(--on-navy)]">{c.summary}</p>
        </div>
      </section>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold">Lo que lograrás</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {c.outcomes.map((o) => (
                <li key={o} className="card flex gap-3 p-4 text-sm"><span className="text-green">✔</span>{o}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold">Temario</h2>
            <div className="mt-4 space-y-3">
              {c.modules.map((m, i) => (
                <details key={m.id} open={i === 0} className="card group p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-display font-semibold">
                    <span>Módulo {i + 1} · {m.title}</span><span className="text-xs font-normal text-soft">{m.lessons.length} lecciones</span>
                  </summary>
                  <ul className="mt-3 divide-y divide-line text-sm">
                    {m.lessons.map((l) => <li key={l.id} className="flex items-center justify-between py-2"><span>{ICON[l.type]} {l.title}</span><span className="text-soft">{l.min} min</span></li>)}
                  </ul>
                </details>
              ))}
            </div>
          </section>
          {teacher && (
            <section>
              <h2 className="text-xl font-bold">Tu capacitador</h2>
              <div className="card mt-4 flex gap-4 p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue to-green font-display text-lg font-bold text-white">{teacher.name[0]}</span>
                <div><b>{`${teacher.title ?? ""} ${teacher.name}`.trim()}</b><p className="mt-1 text-sm text-soft">{teacher.bio}</p></div>
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card card-pad">
            <div className="font-display text-lg font-extrabold text-blue">Regístrate para ver el precio</div>
            <p className="mt-1 text-xs text-soft">El valor del curso se muestra dentro de tu portal de participante, donde también puedes comprarlo.</p>
            <dl className="mt-3 space-y-1.5 text-sm text-soft">
              <div className="flex justify-between"><dt>Inicio</dt><dd className="font-semibold text-text">{fmtDate(c.start)}</dd></div>
              <div className="flex justify-between"><dt>Duración</dt><dd className="font-semibold text-text">{c.kind === "largo" ? `${c.months} meses` : `${c.weeks} semanas`} · {c.hours} h</dd></div>
              <div className="flex justify-between"><dt>Contenido</dt><dd className="font-semibold text-text">{lessonsOf(c).length} lecciones</dd></div>
            </dl>
            <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-soft">
              <b className="block text-text">Formas de pago</b>
              {c.kind === "rapido" ? (
                <p className="mt-1">Curso pregrabado: pago único del 100% al inscribirte, desde tu portal. El acceso se habilita al confirmarse el pago.</p>
              ) : (
                <ul className="mt-1 space-y-1">
<li>• <b>Contado</b> (100% al inscribirte)</li>                  <li>• <b>50% + 50%</b>: el saldo 30 días antes de terminar</li>                  <li>• <b>{c.months} cuotas mensuales</b></li>
                </ul>
              )}
            </div>
            <hr className="my-4 border-line" />
            <div className="rounded-xl bg-surface-2 p-3 text-xs text-soft">
              <b className="block text-text">🎓 Certificado</b>
              <p className="mt-1">{c.kind === "rapido" ? "Ve todos los videos y aprueba la evaluación final con 70% o más." : "Paga el 100% del curso, entrega todas las tareas y aprueba la evaluación final."}</p>
            </div>
            <Link href={`/registro?curso=${c.slug}`} className="btn btn-primary mt-4 w-full">Registrarme como participante</Link>
            <ol className="mt-4 space-y-1.5 text-xs text-soft">
              <li><b className="text-text">1.</b> Te registras con tus datos.</li>
              <li><b className="text-text">2.</b> Admisiones te llama para resolver tus dudas sobre el curso.</li>
              <li><b className="text-text">3.</b> Habilitamos tu plataforma y eliges cómo pagar.</li>
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
