import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { supabaseServer } from "@/lib/supabase/server";
import { CourseEditor } from "@/components/trainer";
import { LiveEditor, type LiveAssignment, type LiveCourse, type LiveLesson, type LiveModule } from "@/components/trainer-live";

// En producción el parámetro es el id del curso (uuid); en demo es el slug del curso guardado en el navegador.
export default async function Page({ params }: PageProps<"/capacitador/cursos/[slug]">) {
  const u = await requireRole("teacher");
  const { slug } = await params;
  if (DEMO) return <CourseEditor slug={slug} userId={u.id} />;

  if (!/^[0-9a-f-]{36}$/i.test(slug)) notFound();
  const sb = await supabaseServer();
  const { data: c } = await sb.from("courses").select("id, title, area, level, kind, hours, months, price, summary, outcomes, final_quiz, review, review_note").eq("id", slug).eq("owner_id", u.id).maybeSingle();
  if (!c) notFound();
  const { data: mods } = await sb.from("course_modules").select("id, title, quiz").eq("course_id", c.id).order("position");
  const { data: ls } = await sb.from("course_lessons").select("id, module_id, title, type, minutes, material_kind, material_name, material_url, material_path").eq("course_id", c.id).order("position");
  const { data: asg } = await sb.from("course_assignments").select("id, title, description, due, max_points").eq("course_id", c.id).order("due");
  const modules: LiveModule[] = (mods ?? []).map((m) => ({ id: m.id, title: m.title, quiz: (m.quiz as LiveModule["quiz"]) ?? null, lessons: (ls ?? []).filter((l) => l.module_id === m.id) as LiveLesson[] }));
  return <LiveEditor course={c as unknown as LiveCourse} modules={modules} assignments={(asg ?? []) as LiveAssignment[]} userId={u.id} />;
}
