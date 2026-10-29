"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { academicState, enroll, financials, maybeIssueCertificate, notify, ownEnrollment } from "@/lib/learn";
import type { PlanId } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Res = { ok: boolean; error?: string; pct?: number; score?: number; total?: number };
const fail = (error: string): Res => ({ ok: false, error });

// Toda acción del participante verifica que la inscripción sea suya y que su pago habilite el acceso.
async function ctx(enrollmentId: string, needActive = true) {
  const user = await requireRole("student");
  const e = await ownEnrollment(user.id, enrollmentId);
  if (!e) return { user, e: null as null, error: "No encontramos tu inscripción." };
  if (needActive && !["activa", "completada"].includes(e.status)) return { user, e: null as null, error: "Tu curso se activa cuando administración confirme tu primer pago." };
  return { user, e, error: null };
}
const refresh = () => { revalidatePath("/estudiante", "layout"); };

export async function buyCourse(slug: string, plan: PlanId) {
  const user = await requireRole("student");
  const r = await enroll(user.id, slug, plan);
  if (!r.ok) redirect(`/estudiante/catalogo/${slug}?err=${encodeURIComponent(r.error ?? "No se pudo inscribir.")}`);
  redirect(`/estudiante/pagos?msg=${encodeURIComponent("Inscripción creada. Realiza tu primer pago para activar el curso.")}`);
}

// El participante informa su transferencia con el comprobante; administración la valida.
export async function reportPayment(i: { enrollmentId: string; amount: number; reference: string; proofPath: string }): Promise<Res> {
  const { user, e, error } = await ctx(i.enrollmentId, false);
  if (!e) return fail(error!);
  if (!(i.amount > 0)) return fail("Indica el monto transferido.");
  if (!i.proofPath.startsWith(`${user.id}/`) || i.proofPath.includes("..")) return fail("Adjunta el comprobante de la transferencia.");
  const f = await financials(i.enrollmentId);
  if (i.amount > f.balance - f.pending + 0.01) return fail(`El monto supera tu saldo por pagar (${(f.balance - f.pending).toFixed(2)} USD, descontando pagos en validación).`);
  const admin = supabaseAdmin();
  const { error: err } = await admin.from("payments").insert({ enrollment_id: i.enrollmentId, amount: i.amount, method: "transferencia", reference: i.reference.trim().slice(0, 120) || null, proof_path: i.proofPath });
  if (err) return fail("No se pudo registrar el pago. Inténtalo de nuevo.");
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_active", true);
  await notify((admins ?? []).map((a) => a.id), "payment_review", "Pago por validar", `${user.name} informó una transferencia de $${i.amount.toFixed(2)}.`, "");
  refresh();
  return { ok: true };
}

export async function toggleLesson(enrollmentId: string, lessonId: string): Promise<Res> {
  const { e, error } = await ctx(enrollmentId);
  if (!e) return fail(error!);
  const admin = supabaseAdmin();
  const { data: l } = await admin.from("course_lessons").select("id").eq("id", lessonId).eq("course_id", e.course_id).maybeSingle();
  if (!l) return fail("Lección no válida.");
  const { data: had } = await admin.from("lesson_progress").select("lesson_id").eq("enrollment_id", enrollmentId).eq("lesson_id", lessonId).maybeSingle();
  if (had) await admin.from("lesson_progress").delete().eq("enrollment_id", enrollmentId).eq("lesson_id", lessonId);
  else await admin.from("lesson_progress").insert({ enrollment_id: enrollmentId, lesson_id: lessonId });
  await maybeIssueCertificate(enrollmentId);
  refresh();
  return { ok: true };
}

// La evaluación se califica en el servidor; el participante nunca recibe las respuestas correctas.
export async function submitQuiz(enrollmentId: string, moduleId: string | null, answers: number[]): Promise<Res> {
  const { e, error } = await ctx(enrollmentId);
  if (!e) return fail(error!);
  const admin = supabaseAdmin();
  const state = await academicState(enrollmentId);
  let questions: { answer: number }[];
  if (moduleId) {
    const { data: m } = await admin.from("course_modules").select("id, quiz").eq("id", moduleId).eq("course_id", e.course_id).maybeSingle();
    if (!m || !Array.isArray(m.quiz) || !m.quiz.length) return fail("Evaluación no disponible.");
    const { data: ls } = await admin.from("course_lessons").select("id").eq("module_id", moduleId);
    const { data: done } = await admin.from("lesson_progress").select("lesson_id").eq("enrollment_id", enrollmentId);
    const doneSet = new Set((done ?? []).map((d) => d.lesson_id));
    if ((ls ?? []).some((l) => !doneSet.has(l.id))) return fail("Completa las lecciones del módulo para rendir su evaluación.");
    questions = m.quiz as { answer: number }[];
  } else {
    if (state.evalLock) return fail(state.evalLock);
    questions = (state.course.final_quiz ?? []) as { answer: number }[];
  }
  if (!Array.isArray(answers) || answers.length !== questions.length) return fail("Responde todas las preguntas.");
  const score = questions.filter((q, i) => answers[i] === q.answer).length;
  await admin.from("quiz_attempts").insert({ enrollment_id: enrollmentId, module_id: moduleId, score, total: questions.length });
  await maybeIssueCertificate(enrollmentId);
  refresh();
  return { ok: true, score, total: questions.length, pct: Math.round((score / questions.length) * 100) };
}

export async function submitAssignment(i: { enrollmentId: string; assignmentId: string; body: string; filePath?: string; fileName?: string }): Promise<Res> {
  const { user, e, error } = await ctx(i.enrollmentId);
  if (!e) return fail(error!);
  const admin = supabaseAdmin();
  const { data: a } = await admin.from("course_assignments").select("id, title").eq("id", i.assignmentId).eq("course_id", e.course_id).maybeSingle();
  if (!a) return fail("Tarea no válida.");
  const body = i.body.trim().slice(0, 5000);
  if (!body && !i.filePath) return fail("Escribe tu respuesta o adjunta un archivo.");
  if (i.filePath && (!i.filePath.startsWith(`${user.id}/`) || i.filePath.includes(".."))) return fail("Archivo no válido.");
  const { data: prev } = await admin.from("submissions").select("id, grade").eq("enrollment_id", i.enrollmentId).eq("assignment_id", i.assignmentId).maybeSingle();
  if (prev?.grade != null) return fail("Esta tarea ya fue calificada y no se puede modificar.");
  const row = { enrollment_id: i.enrollmentId, assignment_id: i.assignmentId, body: body || null, file_path: i.filePath ?? null, file_name: i.fileName?.slice(0, 200) ?? null, submitted_at: new Date().toISOString() };
  const { error: err } = prev ? await admin.from("submissions").update(row).eq("id", prev.id) : await admin.from("submissions").insert(row);
  if (err) return fail("No se pudo guardar tu entrega.");
  const { data: c } = await admin.from("courses").select("owner_id, title").eq("id", e.course_id).single();
  await notify([c!.owner_id], "submission", "Nueva entrega por calificar", `${user.name} entregó «${a.title}» en ${c!.title}.`, "/capacitador/calificar");
  await maybeIssueCertificate(i.enrollmentId);
  refresh();
  return { ok: true };
}

