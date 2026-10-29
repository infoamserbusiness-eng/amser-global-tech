import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Empty, PageTitle, Stat } from "./ui";
import { REVIEW_LABEL } from "./trainer-live";

type Row = { id: string; title: string; kind: string; hours: number; months: number | null; price: number; review: string; review_note: string | null };

async function myCourses(userId: string) {
  const sb = await supabaseServer();
  const { data } = await sb.from("courses").select("id, title, kind, hours, months, price, review, review_note").eq("owner_id", userId).order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.id);
  const { data: mods } = ids.length ? await sb.from("course_modules").select("course_id").in("course_id", ids) : { data: [] };
  const { data: ls } = ids.length ? await sb.from("course_lessons").select("course_id").in("course_id", ids) : { data: [] };
  return { rows, mods: mods ?? [], lessons: ls ?? [] };
}

// Dashboard del capacitador en producción: indicadores del contenido que ya está en la base real.
export async function LiveDashboard({ userId, name }: { userId: string; name: string }) {
  const { rows, mods, lessons } = await myCourses(userId);
  const count = (r: string) => rows.filter((x) => x.review === r).length;
  return (
    <>
      <PageTitle title={`Bienvenido, ${name}`} sub="Tu espacio para crear cursos y cargar material." action={<Link href="/capacitador/cursos/nuevo" className="btn btn-green btn-sm">+ Crear curso</Link>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Cursos creados" value={rows.length} tone="blue" />
        <Stat label="Módulos" value={mods.length} tone="violet" />
        <Stat label="Lecciones cargadas" value={lessons.length} tone="green" />
        <Stat label="En revisión" value={count("revision")} hint={`${count("publicado")} aprobados · ${count("rechazado")} devueltos`} tone="amber" />
      </div>
      <section className="card card-pad">
        <h2 className="mb-3 font-bold">Tus cursos</h2>
        {rows.length === 0 && <p className="text-sm text-soft">Aún no tienes cursos. Crea el primero y empieza a subir tu material.</p>}
        <ul className="divide-y divide-line text-sm">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2"><Link href={`/capacitador/cursos/${c.id}`} className="truncate font-semibold hover:text-blue">{c.title}</Link><span className={REVIEW_LABEL[c.review]?.[1] ?? "badge"}>{REVIEW_LABEL[c.review]?.[0] ?? c.review}</span></li>
          ))}
        </ul>
      </section>
      <p className="mt-4 text-xs text-soft">Las clases en vivo, las ventas, los pagos y la calificación de tareas se activarán cuando tus cursos tengan participantes inscritos.</p>
    </>
  );
}

export async function LiveCourses({ userId }: { userId: string }) {
  const { rows, mods, lessons } = await myCourses(userId);
  return (
    <>
      <PageTitle title="Mis cursos" sub="Los cursos que creas para vender en la plataforma." action={<Link href="/capacitador/cursos/nuevo" className="btn btn-green btn-sm">+ Crear curso</Link>} />
      {rows.length === 0 && <Empty>Aún no tienes cursos. Crea tu primer curso pregrabado o de larga duración.</Empty>}
      <div className="grid gap-5 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="card card-pad space-y-3">
            <div className="flex flex-wrap gap-1.5"><span className="badge">{c.kind === "rapido" ? `Pregrabado · ${c.hours} h` : `Largo · ${c.months} meses`}</span><span className={REVIEW_LABEL[c.review]?.[1] ?? "badge"}>{REVIEW_LABEL[c.review]?.[0] ?? c.review}</span></div>
            <h3 className="font-bold leading-snug">{c.title}</h3>
            <p className="text-xs text-soft">{mods.filter((m) => m.course_id === c.id).length} módulos · {lessons.filter((l) => l.course_id === c.id).length} lecciones · ${Number(c.price).toFixed(2)}</p>
            {c.review === "rechazado" && c.review_note && <p className="rounded-lg bg-[rgba(192,57,43,.08)] p-2 text-xs text-danger">Observación de la administración: {c.review_note}</p>}
            <Link href={`/capacitador/cursos/${c.id}`} className="btn btn-primary btn-sm">Editar contenido</Link>
          </div>
        ))}
      </div>
    </>
  );
}
