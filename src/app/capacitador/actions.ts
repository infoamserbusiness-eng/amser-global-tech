"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { Question } from "@/lib/data";

// Acciones del constructor de cursos en producción. Todas pasan por RLS: el capacitador solo toca sus cursos
// y NO puede publicar (la publicación la aprueba coordinación/administración).

type Res = { ok: boolean; error?: string; id?: string };
const AREAS = ["Desarrollo", "Seguridad", "Datos e IA", "Cloud", "Redes", "Negocios digitales"];
const LEVELS = ["Básico", "Intermedio", "Avanzado"];

const slugify = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const fail = (error: string): Res => ({ ok: false, error });

async function ctx() {
  const user = await requireRole("teacher");
  return { user, sb: await supabaseServer() };
}

// Un curso en revisión no se edita; uno publicado/devuelto vuelve a borrador para nueva revisión.
async function guard(sb: Awaited<ReturnType<typeof supabaseServer>>, courseId: string): Promise<string | null> {
  const { data: c } = await sb.from("courses").select("review").eq("id", courseId).maybeSingle();
  if (!c) return "No encontramos el curso.";
  if (c.review === "revision") return "El curso está en revisión académica y no se puede editar hasta que sea aprobado o devuelto.";
  await sb.from("courses").update({ updated_at: new Date().toISOString(), ...(c.review !== "borrador" ? { review: "borrador" } : {}) }).eq("id", courseId);
  return null;
}
const refresh = (courseId: string) => { revalidatePath(`/capacitador/cursos/${courseId}`); revalidatePath("/capacitador/cursos"); revalidatePath("/capacitador"); };

function cleanQuestions(qs: Question[]): Question[] | null {
  if (!Array.isArray(qs) || qs.length > 60) return null;
  const out: Question[] = [];
  for (const x of qs) {
    const q = String(x?.q ?? "").trim();
    const options = Array.isArray(x?.options) ? x.options.map((o) => String(o).trim()) : [];
    if (!q || q.length > 300 || options.length !== 4 || options.some((o) => !o || o.length > 200) || !Number.isInteger(x.answer) || x.answer < 0 || x.answer > 3) return null;
    out.push({ q, options, answer: x.answer });
  }
  return out;
}

export async function createCourseLive(i: { title: string; area: string; level: string; kind: string; hours: number; months?: number; price: number; summary: string; outcomes: string[] }): Promise<Res> {
  const { user, sb } = await ctx();
  const title = i.title.trim();
  const outcomes = i.outcomes.map((o) => o.trim()).filter(Boolean).slice(0, 12);
  if (title.length < 4 || title.length > 140) return fail("El título debe tener entre 4 y 140 caracteres.");
  if (!AREAS.includes(i.area) || !LEVELS.includes(i.level) || !["rapido", "largo"].includes(i.kind)) return fail("Datos del curso no válidos.");
  if (!(i.hours >= 1 && i.hours <= 1000) || !(i.price >= 0)) return fail("Revisa las horas y el precio.");
  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await sb.from("courses").insert({
    owner_id: user.id, slug, title, area: i.area, level: i.level, kind: i.kind, hours: Math.round(i.hours),
    months: i.kind === "largo" ? Math.min(24, Math.max(2, Math.round(i.months ?? 6))) : null, price: i.price, summary: i.summary.trim().slice(0, 2000), outcomes,
  }).select("id").single();
  if (error || !data) return fail("No se pudo crear el curso. Inténtalo de nuevo.");
  revalidatePath("/capacitador/cursos");
  return { ok: true, id: data.id };
}

export async function updateCourseLive(courseId: string, p: { title: string; summary: string; outcomes: string[]; hours: number; price: number }): Promise<Res> {
  const { sb } = await ctx();
  const title = p.title.trim();
  if (title.length < 4 || title.length > 140 || !(p.hours >= 1 && p.hours <= 1000) || !(p.price >= 0)) return fail("Revisa los datos del curso.");
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  const { error } = await sb.from("courses").update({ title, summary: p.summary.trim().slice(0, 2000), outcomes: p.outcomes.map((o) => o.trim()).filter(Boolean).slice(0, 12), hours: Math.round(p.hours), price: p.price }).eq("id", courseId);
  refresh(courseId);
  return error ? fail("No se pudo guardar.") : { ok: true };
}

export async function addModuleLive(courseId: string, title: string): Promise<Res> {
  const { sb } = await ctx();
  const t = title.trim();
  if (t.length < 2 || t.length > 140) return fail("El título del módulo debe tener entre 2 y 140 caracteres.");
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  const { count } = await sb.from("course_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const { error } = await sb.from("course_modules").insert({ course_id: courseId, title: t, position: count ?? 0 });
  refresh(courseId);
  return error ? fail("No se pudo agregar el módulo.") : { ok: true };
}

export async function removeModuleLive(courseId: string, moduleId: string): Promise<Res> {
  const { sb } = await ctx();
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  const { data: ls } = await sb.from("course_lessons").select("material_path").eq("module_id", moduleId);
  const paths = (ls ?? []).map((l) => l.material_path).filter((p): p is string => !!p);
  if (paths.length) await sb.storage.from("course-materials").remove(paths);
  await sb.from("course_modules").delete().eq("id", moduleId).eq("course_id", courseId);
  refresh(courseId);
  return { ok: true };
}

export async function setModuleQuizLive(courseId: string, moduleId: string, questions: Question[]): Promise<Res> {
  const { sb } = await ctx();
  const qs = cleanQuestions(questions);
  if (!qs) return fail("Alguna pregunta no es válida (se requieren 4 opciones y una respuesta correcta).");
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  await sb.from("course_modules").update({ quiz: qs.length ? qs : null }).eq("id", moduleId).eq("course_id", courseId);
  refresh(courseId);
  return { ok: true };
}

export async function setFinalQuizLive(courseId: string, questions: Question[]): Promise<Res> {
  const { sb } = await ctx();
  const qs = cleanQuestions(questions);
  if (!qs) return fail("Alguna pregunta no es válida (se requieren 4 opciones y una respuesta correcta).");
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  await sb.from("courses").update({ final_quiz: qs }).eq("id", courseId);
  refresh(courseId);
  return { ok: true };
}

export async function addLessonLive(courseId: string, moduleId: string, l: { title: string; type: string; minutes: number; kind: "archivo" | "enlace"; name: string; url?: string; path?: string }): Promise<Res> {
  const { user, sb } = await ctx();
  const title = l.title.trim();
  if (title.length < 2 || title.length > 160 || !["video", "lectura", "laboratorio"].includes(l.type) || !(l.minutes >= 1 && l.minutes <= 600)) return fail("Revisa los datos de la lección.");
  if (l.kind === "enlace" && !/^https?:\/\//i.test(l.url ?? "")) return fail("El enlace debe empezar con http:// o https://");
  if (l.kind === "archivo" && !(l.path ?? "").startsWith(`${user.id}/`)) return fail("Archivo no válido.");
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  const { count } = await sb.from("course_lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { error } = await sb.from("course_lessons").insert({
    course_id: courseId, module_id: moduleId, position: count ?? 0, title, type: l.type, minutes: Math.round(l.minutes),
    material_kind: l.kind, material_name: l.name.slice(0, 300), material_url: l.kind === "enlace" ? l.url : null, material_path: l.kind === "archivo" ? l.path : null,
  });
  refresh(courseId);
  return error ? fail("No se pudo agregar la lección.") : { ok: true };
}

export async function removeLessonLive(courseId: string, lessonId: string): Promise<Res> {
  const { sb } = await ctx();
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  const { data: l } = await sb.from("course_lessons").select("material_path").eq("id", lessonId).maybeSingle();
  if (l?.material_path) await sb.storage.from("course-materials").remove([l.material_path]);
  await sb.from("course_lessons").delete().eq("id", lessonId).eq("course_id", courseId);
  refresh(courseId);
  return { ok: true };
}

export async function addAssignmentLive(courseId: string, a: { title: string; description: string; due: string; maxPoints: number }): Promise<Res> {
  const { sb } = await ctx();
  if (a.title.trim().length < 2 || !a.description.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(a.due) || !(a.maxPoints >= 1)) return fail("Revisa los datos de la tarea.");
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  const { error } = await sb.from("course_assignments").insert({ course_id: courseId, title: a.title.trim(), description: a.description.trim().slice(0, 2000), due: a.due, max_points: Math.round(a.maxPoints) });
  refresh(courseId);
  return error ? fail("No se pudo agregar la tarea.") : { ok: true };
}

export async function removeAssignmentLive(courseId: string, assignmentId: string): Promise<Res> {
  const { sb } = await ctx();
  const err = await guard(sb, courseId);
  if (err) return fail(err);
  await sb.from("course_assignments").delete().eq("id", assignmentId).eq("course_id", courseId);
  refresh(courseId);
  return { ok: true };
}

// Enlace temporal (10 min) para que el capacitador abra su propio material privado.
export async function materialUrlLive(path: string): Promise<{ url?: string; error?: string }> {
  const { sb } = await ctx();
  const { data, error } = await sb.storage.from("course-materials").createSignedUrl(path, 600);
  return error || !data ? { error: "No se pudo abrir el archivo." } : { url: data.signedUrl };
}

// Envía a revisión académica si cumple los requisitos mínimos (se validan aquí, no solo en pantalla).
export async function submitReviewLive(courseId: string): Promise<Res> {
  const { sb } = await ctx();
  const { data: c } = await sb.from("courses").select("title, summary, outcomes, final_quiz, kind, review").eq("id", courseId).maybeSingle();
  if (!c) return fail("No encontramos el curso.");
  if (c.review === "revision") return fail("El curso ya está en revisión.");
  const { data: lessons } = await sb.from("course_lessons").select("material_kind").eq("course_id", courseId);
  const { count: mods } = await sb.from("course_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const { count: asg } = await sb.from("course_assignments").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const quiz = Array.isArray(c.final_quiz) ? c.final_quiz.length : 0;
  const ok = c.title.length >= 4 && c.summary.length > 10 && c.outcomes.length >= 2 && (mods ?? 0) > 0 && (lessons?.length ?? 0) > 0 && (lessons ?? []).every((l) => !!l.material_kind) && quiz >= 3 && (c.kind !== "largo" || (asg ?? 0) > 0);
  if (!ok) return fail("Aún faltan requisitos. Revisa la lista en la pestaña Publicar.");
  const { error } = await sb.from("courses").update({ review: "revision", review_note: null, updated_at: new Date().toISOString() }).eq("id", courseId);
  refresh(courseId);
  return error ? fail("No se pudo enviar a revisión.") : { ok: true };
}
