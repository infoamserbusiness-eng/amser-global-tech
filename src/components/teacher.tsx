"use client";

import Link from "next/link";
import { fmtDate } from "@/lib/data";
import { courses as withOverrides, courseOfAssignment, enrollments, findUser, progressOf, useDemo } from "@/lib/store";
import { GradeForm } from "./GradeForm";
import { Avatar, Empty, PageTitle, Progress, Stat } from "./ui";

function useMine(userId: string) {
  const s = useDemo();
  const mine = withOverrides(s).filter((c) => c.teacherId === userId);
  const students = (slug: string) => enrollments(s).filter((e) => e.courseSlug === slug);
  const pending = s.submissions.filter((x) => x.grade == null && mine.some((c) => c.assignments.some((a) => a.id === x.assignmentId)));
  return { s, mine, students, pending };
}

export function TeacherHome({ userId, name }: { userId: string; name: string }) {
  const { s, mine, students, pending } = useMine(userId);
  const total = new Set(mine.flatMap((c) => students(c.slug).map((e) => e.studentId))).size;
  return (
    <>
      <PageTitle title={`Bienvenido, ${name}`} sub="Resumen de tus cursos y entregas." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cursos a cargo" value={mine.length} tone="blue" />
        <Stat label="Estudiantes" value={total} tone="green" />
        <Stat label="Entregas por calificar" value={pending.length} tone="amber" />
        <Stat label="Mensajes en foros" value={s.posts.filter((p) => mine.some((c) => c.slug === p.courseSlug)).length} tone="violet" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold">Pendiente de calificar</h2>
          <div className="card divide-y divide-line">
            {pending.length === 0 && <p className="p-4 text-sm text-soft">Todo al día ✔</p>}
            {pending.slice(0, 5).map((x) => (
              <Link key={x.id} href="/capacitador/calificar" className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-surface-2">
                <span><b>{findUser(s, x.studentId)?.name}</b><span className="block text-xs text-soft">{courseOfAssignment(x.assignmentId)?.assignments.find((a) => a.id === x.assignmentId)?.title}</span></span>
                <span className="text-xs text-soft">{fmtDate(x.at)}</span>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-bold">Tus cursos</h2>
          <div className="space-y-3">
            {mine.map((c) => (
              <Link key={c.slug} href={`/capacitador/campus/${c.slug}`} className="card lift flex items-center gap-3 p-4">
                <span className="h-10 w-1.5 rounded-full" style={{ background: c.color }} />
                <span className="flex-1"><b className="block">{c.title}</b><span className="text-xs text-soft">{students(c.slug).length} estudiantes · inicia {fmtDate(c.start)}</span></span>
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export function TeacherCourses({ userId }: { userId: string }) {
  const { s, mine, students } = useMine(userId);
  return (
    <>
      <PageTitle title="Mis cursos" sub="Gestiona contenido, entregas y foro de cada curso." />
      {mine.length === 0 && <Empty>No tienes cursos asignados.</Empty>}
      <div className="grid gap-5 md:grid-cols-2">
        {mine.map((c) => {
          const list = students(c.slug);
          const avgProg = list.length ? Math.round(list.reduce((t, e) => t + progressOf(s, e.studentId, c.slug), 0) / list.length) : 0;
          return (
            <Link key={c.slug} href={`/capacitador/campus/${c.slug}`} className="card lift overflow-hidden">
              <div className="h-16" style={{ background: `linear-gradient(135deg, ${c.color}, #0a1730)` }} />
              <div className="space-y-3 p-5">
                <h3 className="font-bold">{c.title}</h3>
                <p className="text-xs text-soft">{list.length} estudiantes · {c.modality} · inicio {fmtDate(c.start)}</p>
                <div><div className="mb-1 flex justify-between text-xs"><span>Avance promedio del grupo</span><b>{avgProg}%</b></div><Progress value={avgProg} /></div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function TeacherGrading({ userId }: { userId: string }) {
  const { s, mine } = useMine(userId);
  const items = s.submissions
    .map((x) => ({ x, c: mine.find((c) => c.assignments.some((a) => a.id === x.assignmentId)) }))
    .filter((r): r is { x: typeof r.x; c: NonNullable<typeof r.c> } => !!r.c)
    .sort((a, b) => b.x.at.localeCompare(a.x.at)); // orden estable: no saltan las tarjetas al calificar
  const open = items.filter((i) => i.x.grade == null).length;
  return (
    <>
      <PageTitle title="Calificar entregas" sub={`${open} pendiente${open === 1 ? "" : "s"} de calificar. Tu nota y comentario llegan al estudiante al instante.`} />
      {items.length === 0 && <Empty>No hay entregas todavía.</Empty>}
      <div className="space-y-3">
        {items.map(({ x, c }) => {
          const a = c.assignments.find((y) => y.id === x.assignmentId)!;
          const st = findUser(s, x.studentId);
          return (
            <article key={x.id} className="card card-pad">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold"><Avatar name={st?.name ?? "?"} />{st?.name}</span>
                {x.grade != null ? <span className="badge badge-green">{x.grade}/{a.maxPoints}</span> : <span className="badge badge-warn">Por calificar</span>}
              </div>
              <p className="mt-2 text-xs text-soft">{c.title} · {a.title} · {fmtDate(x.at)}</p>
              <p className="mt-2 rounded-lg bg-surface-2 p-3 text-sm">{x.text}</p>
              <GradeForm id={x.id} max={a.maxPoints} grade={x.grade} feedback={x.feedback} />
            </article>
          );
        })}
      </div>
    </>
  );
}
