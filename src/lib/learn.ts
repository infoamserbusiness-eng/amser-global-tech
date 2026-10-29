import "server-only";
import { PASS_PCT } from "./data";
import { PLAN_LABEL, plansFor, schedule, withState, type PlanId } from "./plans";
import { supabaseAdmin } from "./supabase/admin";

// Motor del campus en producción. El participante NUNCA lee las tablas de cursos: todo pasa por aquí, con service role,
// verificando siempre que la inscripción sea suya. Así no puede ver respuestas de evaluaciones ni material sin acceso.

export type PublishedCourse = {
  id: string; slug: string; title: string; area: string; level: string; kind: "rapido" | "largo"; hours: number; months: number | null; summary: string; outcomes: string[];
  sale_price: number; start_date: string | null; site_status: string; teacher_name: string | null; teacher_bio: string | null; owner_id: string; certificate_mode: string;
};
const PUB_COLS = "id, slug, title, area, level, kind, hours, months, summary, outcomes, sale_price, start_date, site_status, teacher_name, teacher_bio, owner_id, certificate_mode";
const num = (v: unknown) => Number(v ?? 0);

export async function listPublished(): Promise<PublishedCourse[]> {
  const { data } = await supabaseAdmin().from("courses").select(PUB_COLS).eq("site_published", true).eq("review", "publicado").not("sale_price", "is", null).order("published_at", { ascending: false });
  return ((data ?? []) as unknown as PublishedCourse[]).map((c) => ({ ...c, sale_price: num(c.sale_price) }));
}
export async function publishedBySlug(slug: string): Promise<PublishedCourse | null> {
  const { data } = await supabaseAdmin().from("courses").select(PUB_COLS).eq("slug", slug).eq("site_published", true).eq("review", "publicado").maybeSingle();
  return data ? { ...(data as unknown as PublishedCourse), sale_price: num((data as { sale_price: unknown }).sale_price) } : null;
}

const weeksOf = (c: { kind: string; hours: number; months: number | null }) => (c.kind === "rapido" ? Math.max(1, Math.round(c.hours / 8)) : (c.months ?? 6) * 4);
export const startOf = (c: { start_date: string | null }) => c.start_date ?? new Date().toISOString().slice(0, 10);

// ───────── inscripción y pagos ─────────
export async function enroll(userId: string, slug: string, plan: PlanId): Promise<{ ok: boolean; error?: string; enrollmentId?: string }> {
  const c = await publishedBySlug(slug);
  if (!c) return { ok: false, error: "El curso ya no está disponible." };
  if (!plansFor(c.kind).includes(plan)) return { ok: false, error: "Plan de pago no válido para este curso." };
  const admin = supabaseAdmin();
  const { data: prev } = await admin.from("enrollments").select("id").eq("course_id", c.id).eq("participant_id", userId).maybeSingle();
  if (prev) return { ok: true, enrollmentId: prev.id };
  const { data: trainerPrice } = await admin.from("courses").select("price").eq("id", c.id).single();
  const { data: e, error } = await admin.from("enrollments").insert({ course_id: c.id, participant_id: userId, sale_price: c.sale_price, trainer_amount: num(trainerPrice?.price), plan }).select("id").single();
  if (error || !e) return { ok: false, error: "No se pudo crear la inscripción." };
  const list = schedule({ kind: c.kind, price: c.sale_price, start: startOf(c), weeks: weeksOf(c), months: c.months }, plan);
  await admin.from("installments").insert(list.map((i) => ({ enrollment_id: e.id, n: i.n, label: i.label, due: i.due, amount: i.amount })));
  return { ok: true, enrollmentId: e.id };
}

export type EnrollmentRow = { id: string; status: string; plan: PlanId | null; sale_price: number; created_at: string; course: PublishedCourse & { final_quiz_count: number } };

export async function myEnrollments(userId: string): Promise<EnrollmentRow[]> {
  const admin = supabaseAdmin();
  const { data: es } = await admin.from("enrollments").select("id, status, plan, sale_price, created_at, course_id").eq("participant_id", userId).order("created_at", { ascending: false });
  if (!es?.length) return [];
  const { data: cs } = await admin.from("courses").select(`${PUB_COLS}, final_quiz`).in("id", es.map((e) => e.course_id));
  return es.flatMap((e) => {
    const c = (cs ?? []).find((x) => x.id === e.course_id) as unknown as (PublishedCourse & { final_quiz: unknown[] }) | undefined;
    return c ? [{ id: e.id, status: e.status, plan: e.plan as PlanId | null, sale_price: num(e.sale_price), created_at: e.created_at, course: { ...c, sale_price: num(c.sale_price), final_quiz_count: Array.isArray(c.final_quiz) ? c.final_quiz.length : 0 } }] : [];
  });
}

export async function ownEnrollment(userId: string, enrollmentId: string) {
  const { data } = await supabaseAdmin().from("enrollments").select("id, course_id, participant_id, status, plan, sale_price").eq("id", enrollmentId).eq("participant_id", userId).maybeSingle();
  return data;
}

export async function financials(enrollmentId: string) {
  const admin = supabaseAdmin();
  const { data: e } = await admin.from("enrollments").select("id, sale_price, status").eq("id", enrollmentId).single();
  const { data: inst } = await admin.from("installments").select("n, label, due, amount").eq("enrollment_id", enrollmentId).order("n");
  const { data: pays } = await admin.from("payments").select("id, amount, status, reference, created_at, note").eq("enrollment_id", enrollmentId).order("created_at", { ascending: false });
  const paid = (pays ?? []).filter((p) => p.status === "confirmado").reduce((t, p) => t + num(p.amount), 0);
  const pending = (pays ?? []).filter((p) => p.status === "por_validar").reduce((t, p) => t + num(p.amount), 0);
  const price = num(e?.sale_price);
  const list = withState((inst ?? []).map((i) => ({ n: i.n, label: i.label, due: i.due, amount: num(i.amount) })), paid);
  return { price, paid, pending, balance: Math.max(0, Math.round((price - paid) * 100) / 100), installments: list, payments: pays ?? [], next: list.find((i) => i.state !== "pagada") };
}

// ───────── estado académico y certificado ─────────
export async function academicState(enrollmentId: string) {
  const admin = supabaseAdmin();
  const { data: e } = await admin.from("enrollments").select("id, course_id, status, sale_price").eq("id", enrollmentId).single();
  const { data: c } = await admin.from("courses").select("id, slug, kind, final_quiz, certificate_mode").eq("id", e!.course_id).single();
  const { data: mods } = await admin.from("course_modules").select("id, quiz").eq("course_id", c!.id);
  const { data: lessons } = await admin.from("course_lessons").select("id").eq("course_id", c!.id);
  const { data: done } = await admin.from("lesson_progress").select("lesson_id").eq("enrollment_id", enrollmentId);
  const { data: asg } = await admin.from("course_assignments").select("id").eq("course_id", c!.id);
  const { data: subs } = await admin.from("submissions").select("assignment_id").eq("enrollment_id", enrollmentId);
  const { data: attempts } = await admin.from("quiz_attempts").select("module_id, score, total").eq("enrollment_id", enrollmentId);
  const fin = await financials(enrollmentId);

  const rapido = c!.kind === "rapido";
  const lessonsTotal = (lessons ?? []).length;
  const lessonsDone = (done ?? []).length;
  const lessonsPct = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const best = (moduleId: string | null) => {
    const list = (attempts ?? []).filter((a) => (a.module_id ?? null) === moduleId).map((a) => Math.round((a.score / a.total) * 100));
    return list.length ? Math.max(...list) : null;
  };
  const modulesWithQuiz = (mods ?? []).filter((m) => Array.isArray(m.quiz) && m.quiz.length > 0);
  const modulesPending = modulesWithQuiz.filter((m) => (best(m.id) ?? -1) < PASS_PCT).length;
  const finalBest = best(null);
  const finalPassed = finalBest != null && finalBest >= PASS_PCT;
  const paidAll = fin.paid + 0.001 >= fin.price;
  const tasksTotal = rapido ? 0 : (asg ?? []).length;
  const tasksDelivered = rapido ? 0 : (subs ?? []).length;
  const finalCount = Array.isArray(c!.final_quiz) ? c!.final_quiz.length : 0;

  let evalLock: string | null = null;
  if (finalCount === 0) evalLock = "El capacitador aún no ha publicado la evaluación final de este curso.";
  else if (rapido && lessonsPct < 100) evalLock = "Completa todas las lecciones (videos) para habilitar la evaluación final.";
  else if (modulesPending > 0) evalLock = `Aprueba las evaluaciones de módulo pendientes (${modulesPending}) para habilitar la evaluación final.`;
  else if (!rapido && !paidAll) evalLock = "Para rendir la evaluación final debes tener el curso pagado al 100%.";
  const eligible = paidAll && finalPassed && tasksDelivered === tasksTotal && (!rapido || lessonsPct === 100);
  const { data: cert } = await admin.from("certificates").select("code, status, issued_at, score").eq("enrollment_id", enrollmentId).maybeSingle();
  return { enrollment: e!, course: c!, rapido, lessonsPct, lessonsDone, lessonsTotal, modulesPending, finalBest, finalPassed, paidAll, tasksTotal, tasksDelivered, evalLock, eligible, cert, best, fin };
}

export async function notify(userIds: string[], kind: string, title: string, body: string, link: string) {
  if (!userIds.length) return;
  await supabaseAdmin().from("notifications").insert(userIds.map((user_id) => ({ user_id, kind, title, body, link })));
}

// Emite el certificado cuando se cumplen los requisitos. Modo «manual»: queda pendiente hasta que el capacitador/administración lo libere.
export async function maybeIssueCertificate(enrollmentId: string) {
  const s = await academicState(enrollmentId);
  if (!s.eligible || s.cert) return s.cert ?? null;
  const admin = supabaseAdmin();
  const { data: e } = await admin.from("enrollments").select("participant_id").eq("id", enrollmentId).single();
  const { data: c } = await admin.from("courses").select("title, owner_id, slug").eq("id", s.course.id).single();
  const code = `AGT-${c!.slug.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const manual = s.course.certificate_mode === "manual";
  await admin.from("certificates").insert({ enrollment_id: enrollmentId, code, score: s.finalBest ?? 0, status: manual ? "pendiente" : "emitido" });
  if (manual) {
    const { data: coords } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_active", true);
    await notify([c!.owner_id, ...(coords ?? []).map((x) => x.id)], "cert_pending", "Certificado por aprobar", `Un participante cumplió los requisitos de «${c!.title}». Libera o retiene su certificado.`, "/capacitador/cursos");
  } else {
    await admin.from("enrollments").update({ status: "completada" }).eq("id", enrollmentId);
    await notify([e!.participant_id], "cert_issued", "🎓 ¡Tu certificado está listo!", `Aprobaste «${c!.title}». Ya puedes ver y descargar tu certificado.`, "/estudiante/certificados");
  }
  return { code, status: manual ? "pendiente" : "emitido" };
}

export { PLAN_LABEL };
