import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Course } from "./data";

// Catálogo público (producción): cursos publicados en el sitio. Se consulta SIEMPRE como visitante anónimo
// (nunca con la sesión de quien navega) y solo con las columnas permitidas al público: sin respuestas ni material.
const anon = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

const COLOR: Record<string, string> = { Desarrollo: "#1f7ae0", Seguridad: "#16a34a", "Datos e IA": "#7c3aed", Cloud: "#f59e0b", Redes: "#0891b2", "Negocios digitales": "#e11d48" };
const COLS = "id, slug, title, area, level, kind, hours, months, summary, outcomes, site_status, start_date, teacher_name, teacher_bio"; // sin precio: el público no lo ve

type Row = { id: string; slug: string; title: string; area: Course["area"]; level: Course["level"]; kind: Course["kind"]; hours: number; months: number | null; summary: string; outcomes: string[]; site_status: "abierto" | "proximamente"; start_date: string | null; teacher_name: string | null; teacher_bio: string | null };

const toCourse = (r: Row, modules: Course["modules"] = []): Course => ({
  slug: r.slug, title: r.title, area: r.area, level: r.level, modality: r.kind === "rapido" ? "Pregrabado" : "Virtual en vivo",
  weeks: r.kind === "rapido" ? Math.max(1, Math.round(r.hours / 8)) : (r.months ?? 6) * 4, kind: r.kind, months: r.months ?? undefined, hours: r.hours, price: 0, // el precio solo se muestra a participantes registrados
  start: r.start_date ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), status: r.site_status, published: true, teacherId: "", teacherName: r.teacher_name ?? undefined, teacherBio: r.teacher_bio ?? undefined,
  summary: r.summary, outcomes: r.outcomes, modules, assignments: [], quiz: { id: `${r.slug}-q`, title: "Evaluación final", questions: [] }, color: COLOR[r.area] ?? "#1f7ae0",
});

export async function getSiteCourses(): Promise<Course[]> {
  const { data } = await anon().from("courses").select(COLS).eq("site_published", true).eq("review", "publicado").order("published_at", { ascending: false });
  return ((data ?? []) as Row[]).map((r) => toCourse(r));
}

export async function getSiteCourse(slug: string): Promise<Course | null> {
  const sb = anon();
  const { data } = await sb.from("courses").select(COLS).eq("slug", slug).eq("site_published", true).eq("review", "publicado").maybeSingle();
  if (!data) return null;
  const row = data as Row & { id: string };
  const { data: mods } = await sb.from("course_modules").select("id, title").eq("course_id", row.id).order("position");
  const { data: ls } = await sb.from("course_lessons").select("id, module_id, title, type, minutes").eq("course_id", row.id).order("position");
  return toCourse(row, (mods ?? []).map((m) => ({ id: m.id, title: m.title, lessons: (ls ?? []).filter((l) => l.module_id === m.id).map((l) => ({ id: l.id, title: l.title, type: l.type as "video" | "lectura" | "laboratorio", min: l.minutes })) })));
}
