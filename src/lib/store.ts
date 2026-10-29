"use client";

import { useSyncExternalStore } from "react";
import type { Announcement, Certificate, ClassSession, Course, GradeChange, Lead, Quiz, TrainerApp, PayMethod, Payment, Payout, PlanId, Post, Role, Submission, User } from "./data";
import { COURSES, DEFAULT_SHARE, ENROLLMENTS, PASS_PCT, SEED_SESSIONS, SEED_TRAINER_APPS, setCustomCourses, SEED_ANNOUNCEMENTS, SEED_LEADS, SEED_PAYMENTS, SEED_PAYOUTS, SEED_PLANS, SEED_POSTS, SEED_SUBMISSIONS, TEACHER_RATES, USERS, lessonsOf } from "./data";

// Estado del demo: vive en localStorage del navegador. Reemplazable por Supabase sin tocar las vistas
// (las vistas solo usan useDemo() y las funciones de mutación de este archivo).
export type Account = { docId: string; tempPassword: string; hash?: string; mustChange: boolean; expiresAt?: string; changedAt?: string };
export type DemoEmail = { id: string; userId: string; to: string; subject: string; body: string; at: string };
export type AccountLog = { id: string; userId: string; kind: string; note: string; at: string; by: string };

export type DemoState = {
  completed: string[]; // lecciones completadas, clave `${studentId}:${lessonId}`
  certs: Certificate[];
  quiz: Record<string, { score: number; total: number }>; // `${studentId}:${quizId}`
  submissions: Submission[];
  posts: Post[];
  announcements: Announcement[];
  leads: Lead[];
  extraUsers: User[];
  userActive: Record<string, boolean>;
  coursePublished: Record<string, boolean>;
  courseTeacher: Record<string, string>;
  coursePrice: Record<string, number>;
  extraEnrollments: { studentId: string; courseSlug: string }[];
  payments: Payment[];
  payouts: Payout[];
  teacherRate: Record<string, number>;
  plans: Record<string, PlanId>; // plan de pago elegido por matrícula
  customCourses: Course[]; // cursos creados por capacitadores
  trainerApps: TrainerApp[];
  sessions: ClassSession[];
  gradeLog: GradeChange[];
  teacherShare: Record<string, number>; // % de ventas por capacitador (cursos propios)
  accounts: Record<string, Account>; // credenciales demo por usuario habilitado
  outbox: DemoEmail[]; // correos "enviados" (simulados)
  accountLog: AccountLog[]; // bitácora de cuentas
};

const KEY = "agt_demo_v5";

const INITIAL: DemoState = {
  completed: ["u-est1:web-m1-l1", "u-est1:web-m1-l2", "u-est1:cib-m1-l1"],
  certs: [{ code: "AGT-CLO-0001-2026", studentId: "u-est5", courseSlug: "cloud-computing-aws", at: "2026-09-18T15:00:00Z", score: 90 }],
  quiz: {},
  submissions: SEED_SUBMISSIONS,
  posts: SEED_POSTS,
  announcements: SEED_ANNOUNCEMENTS,
  leads: SEED_LEADS,
  extraUsers: [],
  userActive: {},
  coursePublished: {},
  courseTeacher: {},
  coursePrice: {},
  extraEnrollments: [],
  payments: SEED_PAYMENTS,
  payouts: SEED_PAYOUTS,
  teacherRate: {},
  plans: SEED_PLANS,
  customCourses: [],
  trainerApps: SEED_TRAINER_APPS,
  sessions: SEED_SESSIONS,
  gradeLog: [],
  teacherShare: {},
  accounts: {},
  outbox: [],
  accountLog: [],
};

let state: DemoState = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...INITIAL, ...JSON.parse(raw) };
    setCustomCourses(state.customCourses);
  } catch {
    /* almacenamiento bloqueado: se trabaja en memoria */
  }
}

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

export function update(fn: (s: DemoState) => DemoState) {
  load();
  state = autoIssue(fn(state));
  setCustomCourses(state.customCourses);
  emit();
}

export function resetDemo() {
  state = INITIAL;
  setCustomCourses([]);
  emit();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDemo(): DemoState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => INITIAL,
  );
}

// ---------- consultas derivadas ----------
export const STUDENT_DEMO = "u-est1";
// Participantes que operan en vivo en el demo: la estudiante demo y los habilitados por el admin.
export const isLive = (s: DemoState, id: string) => id === STUDENT_DEMO || s.extraUsers.some((u) => u.id === id && u.role === "student");

export function allUsers(s: DemoState): User[] {
  return [...USERS, ...s.extraUsers].map((u) => ({ ...u, active: s.userActive[u.id] ?? u.active }));
}
export const findUser = (s: DemoState, id: string) => allUsers(s).find((u) => u.id === id);

export function courses(s: DemoState) {
  return COURSES.map((c) => ({
    ...c,
    published: s.coursePublished[c.slug] ?? c.published,
    teacherId: s.courseTeacher[c.slug] ?? c.teacherId,
    price: s.coursePrice[c.slug] ?? c.price,
  }));
}

export function enrollments(s: DemoState) {
  return [...ENROLLMENTS, ...s.extraEnrollments.map((e) => ({ ...e, progress: 0, status: "activo" as const }))];
}

export function progressOf(s: DemoState, studentId: string, courseSlug: string): number {
  const course = COURSES.find((c) => c.slug === courseSlug);
  if (!course) return 0;
  if (isLive(s, studentId)) {
    const ls = lessonsOf(course);
    return ls.length ? Math.round((ls.filter((l) => s.completed.includes(`${studentId}:${l.id}`)).length / ls.length) * 100) : 0;
  }
  return enrollments(s).find((e) => e.studentId === studentId && e.courseSlug === courseSlug)?.progress ?? 0;
}

export function submissionsOf(s: DemoState, studentId?: string) {
  return s.submissions.filter((x) => !studentId || x.studentId === studentId);
}

export function courseOfAssignment(assignmentId: string) {
  return COURSES.find((c) => c.assignments.some((a) => a.id === assignmentId));
}

export function gradeAverage(s: DemoState, studentId: string, courseSlug?: string): number | null {
  const graded = submissionsOf(s, studentId).filter((x) => x.grade != null && (!courseSlug || courseOfAssignment(x.assignmentId)?.slug === courseSlug));
  const quizzes = Object.entries(s.quiz)
    .filter(([k]) => k.startsWith(studentId + ":"))
    .filter(([k]) => !courseSlug || COURSES.find((c) => c.slug === courseSlug)?.quiz.id === k.split(":")[1])
    .map(([, v]) => (v.score / v.total) * 10);
  const all = [...graded.map((g) => g.grade as number), ...quizzes];
  return all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : null;
}

// ---------- mutaciones ----------

export const submitAssignment = (studentId: string, assignmentId: string, text: string, file?: string) =>
  update((s) => ({
    ...s,
    submissions: [
      ...s.submissions.filter((x) => !(x.studentId === studentId && x.assignmentId === assignmentId)),
      { id: `s-${Date.now()}`, studentId, assignmentId, text, file, at: new Date().toISOString() },
    ],
  }));

export const gradeSubmission = (id: string, grade: number, feedback: string) =>
  update((s) => ({ ...s, submissions: s.submissions.map((x) => (x.id === id && x.grade == null ? { ...x, grade, feedback } : x)) }));

export const saveQuiz = (studentId: string, quizId: string, score: number, total: number) =>
  update((s) => ({ ...s, quiz: { ...s.quiz, [`${studentId}:${quizId}`]: { score, total } } }));

export const addPost = (courseSlug: string, authorId: string, text: string) =>
  update((s) => ({ ...s, posts: [{ id: `p-${Date.now()}`, courseSlug, authorId, text, at: new Date().toISOString(), replies: [] }, ...s.posts] }));

export const addReply = (postId: string, authorId: string, text: string) =>
  update((s) => ({
    ...s,
    posts: s.posts.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, { authorId, text, at: new Date().toISOString() }] } : p)),
  }));

export const addAnnouncement = (courseSlug: string, authorId: string, title: string, body: string) =>
  update((s) => ({ ...s, announcements: [{ id: `a-${Date.now()}`, courseSlug, authorId, title, body, at: new Date().toISOString() }, ...s.announcements] }));



export const addUser = (u: { name: string; email: string; role: Role }) =>
  update((s) => ({ ...s, extraUsers: [...s.extraUsers, { ...u, id: `u-${Date.now()}`, active: true }] }));

export const setUserActive = (id: string, active: boolean) => update((s) => ({ ...s, userActive: { ...s.userActive, [id]: active } }));
export const setCoursePublished = (slug: string, v: boolean) => update((s) => ({ ...s, coursePublished: { ...s.coursePublished, [slug]: v } }));
export const setCourseTeacher = (slug: string, id: string) => update((s) => ({ ...s, courseTeacher: { ...s.courseTeacher, [slug]: id } }));
export const setCoursePrice = (slug: string, price: number) => update((s) => ({ ...s, coursePrice: { ...s.coursePrice, [slug]: price } }));

// ---------- finanzas ----------
export type PayStatus = "pagado" | "parcial" | "pendiente";
const statusOf = (paid: number, total: number): PayStatus => (paid >= total ? "pagado" : paid > 0 ? "parcial" : "pendiente");

export const PLAN_LABEL: Record<PlanId, string> = { contado: "Pago total", anticipo: "50% + 50%", mensual: "Cuotas mensuales" };

const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400000).toISOString().slice(0, 10);
const courseEnd = (c: Pick<Course, "start" | "weeks">) => addDays(c.start, c.weeks * 7);

export type Installment = { n: number; label: string; due: string | null; amount: number }; // due null = al inscribirse

// Planes disponibles: el curso rápido solo admite pago único; el largo ofrece tres opciones.
export const plansFor = (c: Pick<Course, "kind">): PlanId[] => (c.kind === "rapido" ? ["contado"] : ["contado", "anticipo", "mensual"]);

export function schedule(c: Pick<Course, "kind" | "price" | "start" | "weeks" | "months">, plan: PlanId): Installment[] {
  if (plan === "contado" || c.kind === "rapido") return [{ n: 1, label: "Pago total", due: null, amount: c.price }];
  if (plan === "anticipo") {
    const half = Math.round(c.price / 2);
    return [
      { n: 1, label: "Anticipo 50%", due: null, amount: half },
      { n: 2, label: "Saldo 50% (30 días antes de terminar)", due: addDays(courseEnd(c), -30), amount: c.price - half },
    ];
  }
  const m = Math.max(2, c.months ?? 6);
  const each = Math.floor(c.price / m);
  return Array.from({ length: m }, (_, i) => ({
    n: i + 1,
    label: `Cuota ${i + 1} de ${m}`,
    due: i === 0 ? null : addDays(c.start, 30 * i),
    amount: i === m - 1 ? c.price - each * (m - 1) : each,
  }));
}

const confirmed = (p: Payment) => (p.status ?? "confirmado") === "confirmado";

// Una fila por matrícula: plan elegido, cuotas (pagadas con los pagos confirmados, en orden), saldo y estado.
export function studentAccounts(s: DemoState) {
  const cs = courses(s);
  const today = new Date().toISOString().slice(0, 10);
  return enrollments(s).map((e) => {
    const c = cs.find((x) => x.slug === e.courseSlug)!;
    const key = `${e.studentId}:${e.courseSlug}`;
    const mine = s.payments.filter((p) => p.studentId === e.studentId && p.courseSlug === e.courseSlug);
    const paid = mine.filter(confirmed).reduce((t, p) => t + p.amount, 0);
    const pendingValidation = mine.filter((p) => !confirmed(p)).reduce((t, p) => t + p.amount, 0);
    const plan = s.plans[key] ?? (paid > 0 ? "contado" : undefined);
    let cum = 0;
    const installments = plan
      ? schedule(c, plan).map((i) => {
          cum += i.amount;
          const done = paid >= cum;
          return { ...i, state: done ? ("pagada" as const) : i.due && i.due < today ? ("vencida" as const) : ("pendiente" as const) };
        })
      : [];
    const next = installments.find((i) => i.state !== "pagada");
    const unlocked = installments.length > 0 && installments[0].state === "pagada"; // acceso: primera cuota pagada
    return {
      studentId: e.studentId, courseSlug: e.courseSlug, course: c, plan, installments, next, unlocked, pendingValidation,
      price: c.price, paid, balance: Math.max(0, c.price - paid), status: statusOf(paid, c.price),
      overdue: installments.some((i) => i.state === "vencida"),
      last: mine.filter(confirmed).map((p) => p.at).sort().pop(),
    };
  });
}

export const rateOf = (s: DemoState, teacherId: string) => s.teacherRate[teacherId] ?? TEACHER_RATES[teacherId] ?? 0;

// Una fila por (capacitador, curso): horas × tarifa = total a pagar.

type NewPayment = { studentId: string; courseSlug: string; amount: number; method: PayMethod; note?: string; status?: Payment["status"] };
export const addPayment = (p: NewPayment) =>
  update((s) => ({ ...s, payments: [{ ...p, id: `pg-${Date.now()}`, at: new Date().toISOString() }, ...s.payments] }));
// El participante elige su plan y paga la primera cuota. Tarjeta se confirma al instante; transferencia queda por validar.
export const checkout = (p: NewPayment & { plan: PlanId }) =>
  update((s) => ({
    ...s,
    plans: { ...s.plans, [`${p.studentId}:${p.courseSlug}`]: p.plan },
    payments: [{ studentId: p.studentId, courseSlug: p.courseSlug, amount: p.amount, method: p.method, note: p.note, id: `pg-${Date.now()}`, at: new Date().toISOString(), status: p.method === "tarjeta" ? "confirmado" : "por_validar" }, ...s.payments],
  }));
export const validatePayment = (id: string) => update((s) => ({ ...s, payments: s.payments.map((p) => (p.id === id ? { ...p, status: "confirmado" } : p)) }));
export const enrollSelf = (studentId: string, courseSlug: string) =>
  update((s) => (enrollments(s).some((e) => e.studentId === studentId && e.courseSlug === courseSlug) ? s : { ...s, extraEnrollments: [...s.extraEnrollments, { studentId, courseSlug }] }));

export const addPayout = (p: { teacherId: string; courseSlug: string; amount: number; method: PayMethod; note?: string }) =>
  update((s) => ({ ...s, payouts: [{ ...p, id: `po-${Date.now()}`, at: new Date().toISOString() }, ...s.payouts] }));
export const setTeacherRate = (id: string, rate: number) => update((s) => ({ ...s, teacherRate: { ...s.teacherRate, [id]: rate } }));

// ---------- admisión de participantes ----------
export const addLead = (lead: Omit<Lead, "id" | "at" | "status">) =>
  update((s) => ({ ...s, leads: [{ ...lead, id: `l-${Date.now()}`, at: new Date().toISOString(), status: "nuevo" }, ...s.leads] }));

// El admin registra la llamada de admisión (obligatoria antes de habilitar).
export const logCall = (leadId: string, note: string) =>
  update((s) => ({ ...s, leads: s.leads.map((l) => (l.id === leadId ? { ...l, status: "contactado", callNote: note, calledAt: new Date().toISOString() } : l)) }));


export const rejectLead = (leadId: string) => update((s) => ({ ...s, leads: s.leads.map((l) => (l.id === leadId ? { ...l, status: "descartado" } : l)) }));

// Login demo de participantes habilitados (el servidor solo conoce a los usuarios semilla).

// ---------- avance académico, evaluación y certificados ----------
export const toggleLesson = (studentId: string, lessonId: string) =>
  update((s) => {
    const k = `${studentId}:${lessonId}`;
    return { ...s, completed: s.completed.includes(k) ? s.completed.filter((x) => x !== k) : [...s.completed, k] };
  });

// Estado académico de un participante en un curso. Reglas:
//  · Rápido (pregrabado): ver todos los videos → evaluación final → aprobar con ≥ 70% → certificado.
//  · Largo: para rendir la evaluación debe tener el curso pagado al 100%; certificado = pagado + todas las tareas entregadas + evaluación aprobada.
export function courseStatus(s: DemoState, studentId: string, c: Course) {
  const acct = studentAccounts(s).find((a) => a.studentId === studentId && a.courseSlug === c.slug);
  const lessons = lessonsOf(c);
  const done = lessons.filter((l) => s.completed.includes(`${studentId}:${l.id}`)).length;
  const lessonsPct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const paidAll = !!acct && acct.paid >= acct.price;
  const rapido = c.kind === "rapido";
  const tasksTotal = rapido ? 0 : c.assignments.length;
  const tasksDelivered = rapido ? 0 : c.assignments.filter((a) => s.submissions.some((x) => x.studentId === studentId && x.assignmentId === a.id)).length;
  const q = s.quiz[`${studentId}:${c.quiz.id}`];
  const quizPct = q ? Math.round((q.score / q.total) * 100) : null;
  const passed = quizPct != null && quizPct >= PASS_PCT;
  let evalLock: string | null = null;
  const modulesPending = c.modules.filter((m) => m.quiz && !(s.quiz[`${studentId}:${m.quiz.id}`] && (s.quiz[`${studentId}:${m.quiz.id}`].score / s.quiz[`${studentId}:${m.quiz.id}`].total) * 100 >= PASS_PCT)).length;
  if (c.quiz.questions.length === 0) evalLock = "El capacitador aún no ha publicado la evaluación final de este curso.";
  else if (rapido && lessonsPct < 100) evalLock = "Completa todas las lecciones (videos) para habilitar la evaluación final.";
  else if (modulesPending > 0) evalLock = `Aprueba las evaluaciones de módulo pendientes (${modulesPending}) para habilitar la evaluación final.`;
  else if (!rapido && !paidAll) evalLock = "Para rendir la evaluación final debes tener el curso pagado al 100%.";
  const eligible = paidAll && passed && tasksDelivered === tasksTotal && (!rapido || lessonsPct === 100);
  const cert = s.certs.find((x) => x.studentId === studentId && x.courseSlug === c.slug);
  return { acct, lessonsPct, paidAll, rapido, tasksTotal, tasksDelivered, quizPct, passed, evalLock, eligible, cert };
}

// Emite certificados automáticamente cuando un participante cumple las condiciones.
function autoIssue(s: DemoState): DemoState {
  const cs = courses(s);
  const students = [STUDENT_DEMO, ...s.extraUsers.filter((u) => u.role === "student").map((u) => u.id)];
  let certs = s.certs;
  for (const id of students) {
    for (const e of enrollments(s).filter((x) => x.studentId === id)) {
      const c = cs.find((x) => x.slug === e.courseSlug);
      if (!c || certs.some((x) => x.studentId === id && x.courseSlug === c.slug)) continue;
      const st = courseStatus({ ...s, certs }, id, c);
      if (st.eligible) certs = [...certs, { code: `AGT-${c.slug.slice(0, 3).toUpperCase()}-${String(certs.length + 1).padStart(4, "0")}-${new Date().getFullYear()}`, studentId: id, courseSlug: c.slug, at: new Date().toISOString(), score: st.quizPct ?? 0 }];
    }
  }
  return certs === s.certs ? s : { ...s, certs };
}


// ---------- pagos al capacitador ----------
export const shareOf = (s: DemoState, teacherId: string) => s.teacherShare[teacherId] ?? DEFAULT_SHARE;

// Cursos asignados por Amser = honorarios (horas × tarifa). Cursos propios del capacitador = comisión sobre lo cobrado.
export function teacherAccounts(s: DemoState) {
  return courses(s).map((c) => {
    const authored = !!c.authored;
    const rate = rateOf(s, c.teacherId);
    const sold = s.payments.filter((p) => p.courseSlug === c.slug && (p.status ?? "confirmado") === "confirmado").reduce((t, p) => t + p.amount, 0);
    const share = shareOf(s, c.teacherId);
    const total = authored ? Math.round((sold * share) / 100) : rate * c.hours;
    const paid = s.payouts.filter((p) => p.teacherId === c.teacherId && p.courseSlug === c.slug).reduce((t, p) => t + p.amount, 0);
    return { teacherId: c.teacherId, courseSlug: c.slug, kind: authored ? ("comision" as const) : ("honorarios" as const), sold, share, hours: c.hours, rate, total, paid, balance: Math.max(0, total - paid), status: statusOf(paid, total) };
  });
}
export const setTeacherShare = (id: string, pct: number) => update((s) => ({ ...s, teacherShare: { ...s.teacherShare, [id]: Math.min(100, Math.max(0, pct)) } }));

// ---------- calificaciones: el capacitador califica una sola vez; solo coordinación corrige (con motivo y bitácora) ----------
export const coordinatorRegrade = (submissionId: string, to: number, reason: string, by: string) =>
  update((s) => {
    const x = s.submissions.find((y) => y.id === submissionId);
    if (!x || x.grade == null) return s;
    return {
      ...s,
      submissions: s.submissions.map((y) => (y.id === submissionId ? { ...y, grade: to } : y)),
      gradeLog: [{ id: `gl-${Date.now()}`, submissionId, from: x.grade, to, by, reason, at: new Date().toISOString() }, ...s.gradeLog],
    };
  });

// ---------- solicitudes de capacitador ----------
export const addTrainerApp = (a: Omit<TrainerApp, "id" | "at" | "status">) =>
  update((s) => ({ ...s, trainerApps: [{ ...a, id: `t-${Date.now()}`, at: new Date().toISOString(), status: "nuevo" }, ...s.trainerApps] }));
export const logTrainerCall = (id: string, note: string) =>
  update((s) => ({ ...s, trainerApps: s.trainerApps.map((t) => (t.id === id ? { ...t, status: "contactado", callNote: note, calledAt: new Date().toISOString() } : t)) }));
export const rejectTrainerApp = (id: string) => update((s) => ({ ...s, trainerApps: s.trainerApps.map((t) => (t.id === id ? { ...t, status: "descartado" } : t)) }));

// ---------- clases (Zoom/Meet) ----------
export const addSession = (x: Omit<ClassSession, "id" | "status">) =>
  update((s) => ({ ...s, sessions: [{ ...x, id: `c-${Date.now()}`, status: "programada" }, ...s.sessions] }));
export const setSessionStatus = (id: string, status: ClassSession["status"]) =>
  update((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, status } : x)) }));

// ---------- creación de cursos por el capacitador ----------
const AREA_COLOR: Record<Course["area"], string> = { Desarrollo: "#1f7ae0", Seguridad: "#16a34a", "Datos e IA": "#7c3aed", Cloud: "#f59e0b", Redes: "#0891b2", "Negocios digitales": "#e11d48" };
const slugify = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export type NewCourse = { title: string; area: Course["area"]; level: Course["level"]; kind: Course["kind"]; hours: number; months?: number; price: number; summary: string; outcomes: string[] };

export function createCourse(teacherId: string, n: NewCourse): string {
  const slug = `${slugify(n.title)}-${Math.random().toString(36).slice(2, 6)}`;
  const start = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const course: Course = {
    slug, title: n.title, area: n.area, level: n.level, modality: n.kind === "rapido" ? "Pregrabado" : "Virtual en vivo",
    weeks: n.kind === "rapido" ? Math.max(1, Math.round(n.hours / 8)) : (n.months ?? 6) * 4, kind: n.kind, months: n.kind === "largo" ? (n.months ?? 6) : undefined,
    hours: n.hours, price: n.price, start, status: "abierto", published: false, teacherId, summary: n.summary, outcomes: n.outcomes,
    modules: [], assignments: [], quiz: { id: `${slug}-qf`, title: "Evaluación final", questions: [] }, color: AREA_COLOR[n.area], authored: true, review: "borrador",
  };
  update((s) => ({ ...s, customCourses: [...s.customCourses, course] }));
  return slug;
}

// Edita un curso propio; cualquier cambio en uno publicado/rechazado lo devuelve a borrador para nueva revisión.
export const editCourse = (slug: string, fn: (c: Course) => Course) =>
  update((s) => ({
    ...s,
    customCourses: s.customCourses.map((c) => {
      if (c.slug !== slug) return c;
      const next = fn(c);
      return next.review === "publicado" || next.review === "rechazado" ? { ...next, review: "borrador" as const, published: false } : next;
    }),
  }));

export const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
export const mkQuiz = (id: string, title: string, questions: Quiz["questions"]): Quiz => ({ id, title, questions });

// Requisitos mínimos para enviar un curso a revisión académica.
export function courseReadiness(c: Course): [string, boolean][] {
  const lessons = c.modules.flatMap((m) => m.lessons);
  return [
    ["Datos generales y objetivos (mínimo 2)", c.title.length > 3 && c.summary.length > 10 && c.outcomes.length >= 2],
    ["Al menos 1 módulo con 1 lección", c.modules.length > 0 && lessons.length > 0],
    ["Cada lección tiene su material cargado", lessons.length > 0 && lessons.every((l) => !!l.material)],
    ["Evaluación final con mínimo 3 preguntas", c.quiz.questions.length >= 3],
    ...(c.kind === "largo" ? ([["Al menos 1 tarea para los participantes", c.assignments.length > 0]] as [string, boolean][]) : []),
  ];
}

export const submitForReview = (slug: string) =>
  update((s) => ({ ...s, customCourses: s.customCourses.map((c) => (c.slug === slug && courseReadiness(c).every(([, ok]) => ok) ? { ...c, review: "revision" as const, reviewNote: undefined } : c)) }));

// Coordinación académica aprueba (publica en el catálogo) o devuelve el curso con observaciones.
export const reviewCourse = (slug: string, approve: boolean, note: string) =>
  update((s) => ({ ...s, customCourses: s.customCourses.map((c) => (c.slug === slug ? { ...c, review: approve ? ("publicado" as const) : ("rechazado" as const), published: approve, reviewNote: note || undefined } : c)) }));

// ---------- cuentas de acceso (demo): usuario = cédula, clave temporal = cédula, cambio obligatorio ----------
const TEMP_DAYS = 7;

export async function sha256(text: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function credentialsMail(name: string, email: string, username: string, password: string, trainer = false) {
  const portal = trainer ? "Portal de capacitador" : "Portal de participante";
  return {
    to: email,
    subject: `Tu acceso a Amser Global Tech — ${portal}`,
    body: [
      `Hola ${name},`, ``,
      `¡Felicitaciones! Tu admisión fue aprobada y tu ${portal.toLowerCase()} ya está habilitado.`, ``,
      `Ingresa aquí: https://amserglobaltech.com/ingresar`,
      `Usuario: ${username}`,
      `Contraseña temporal: ${password}`, ``,
      `Por seguridad, al ingresar deberás crear una contraseña nueva (la temporal vence en ${TEMP_DAYS} días). Después de cambiarla, vuelve a ingresar con tu usuario y tu nueva contraseña.`, ``,
      ...(trainer ? [`Una vez dentro podrás crear tus cursos y subir tu material (módulos, videos, evaluaciones y tareas) para tus participantes.`, ``] : []),
      `Amser Global Tech`,
    ].join("\n"),
  };
}

const withLog = (s: DemoState, userId: string, kind: string, note: string, by: string): DemoState => ({
  ...s,
  accountLog: [{ id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, userId, kind, note, at: new Date().toISOString(), by }, ...s.accountLog],
});

// Habilita la plataforma: crea la cuenta (usuario = cédula; clave temporal = cédula) y "envía" el correo con el acceso.
export const enableLead = (leadId: string) =>
  update((s) => {
    const l = s.leads.find((x) => x.id === leadId);
    if (!l || l.status === "matriculado") return s;
    const userId = `u-${Date.now()}`;
    const docId = (l.docId ?? l.phone).trim(); // los registros semilla antiguos no traen cédula
    const mail = credentialsMail(l.name, l.email, docId, docId);
    let n: DemoState = {
      ...s,
      extraUsers: [...s.extraUsers, { id: userId, name: l.name, email: l.email.toLowerCase(), role: "student", docId, active: true }],
      accounts: { ...s.accounts, [userId]: { docId, tempPassword: docId, mustChange: true, expiresAt: new Date(Date.now() + TEMP_DAYS * 86400000).toISOString() } },
      outbox: [{ id: `em-${Date.now()}`, userId, at: new Date().toISOString(), ...mail }, ...s.outbox],
      leads: s.leads.map((x) => (x.id === leadId ? { ...x, status: "matriculado", userId } : x)),
    };
    n = withLog(n, userId, "created", `Cuenta creada desde la admisión (usuario: cédula ${docId})`, "Administración");
    return withLog(n, userId, "email_sent", `Correo enviado a ${l.email}`, "Administración");
  });

// El admin restablece la clave (a la cédula o a una temporal manual), se obliga a cambiarla y se reenvía el correo.
export const resetDemoAccount = (userId: string, manual?: string) =>
  update((s) => {
    const u = s.extraUsers.find((x) => x.id === userId);
    const a = s.accounts[userId];
    if (!u || !a) return s;
    const temp = (manual ?? a.docId).trim();
    const mail = credentialsMail(u.name, u.email, a.docId, temp, u.role === "teacher");
    const n: DemoState = {
      ...s,
      accounts: { ...s.accounts, [userId]: { ...a, tempPassword: temp, hash: undefined, mustChange: true, changedAt: undefined, expiresAt: new Date(Date.now() + TEMP_DAYS * 86400000).toISOString() } },
      outbox: [{ id: `em-${Date.now()}`, userId, at: new Date().toISOString(), ...mail }, ...s.outbox],
    };
    return withLog(withLog(n, userId, manual ? "manual_password" : "admin_reset", manual ? "El admin asignó una clave temporal manual" : "El admin restableció la clave a la cédula", "Administración"), userId, "email_sent", `Correo reenviado a ${u.email}`, "Administración");
  });

// El participante cambia su clave temporal: se guarda solo el hash.
export async function changeDemoPassword(userId: string, password: string, by: string) {
  const hash = await sha256(password);
  update((s) => {
    const a = s.accounts[userId];
    if (!a) return s;
    return withLog({ ...s, accounts: { ...s.accounts, [userId]: { ...a, hash, mustChange: false, expiresAt: undefined, changedAt: new Date().toISOString() } } }, userId, "password_changed", "El usuario cambió su contraseña temporal", by === userId ? s.extraUsers.find((x) => x.id === userId)?.name ?? "Usuario" : by);
  });
}

// Login demo de participantes/capacitadores habilitados (el servidor solo conoce a los usuarios semilla).
// Devuelve null si no es un usuario del demo (entonces se usa el login normal).
export async function participantLogin(ident: string, password: string): Promise<{ user?: User; mustChange?: boolean; error?: string } | null> {
  load();
  const i = ident.trim().toLowerCase();
  const u = state.extraUsers.find((x) => x.email.toLowerCase() === i || state.accounts[x.id]?.docId.toLowerCase() === i);
  if (!u) return null;
  if (!(state.userActive[u.id] ?? u.active)) return { error: "Tu cuenta está desactivada. Contacta a administración." };
  const bad = { error: "Usuario o contraseña incorrectos." };
  const a = state.accounts[u.id];
  if (a) {
    const ok = a.hash ? (await sha256(password)) === a.hash : password === a.tempPassword;
    if (!ok) return bad;
    if (a.mustChange && a.expiresAt && new Date(a.expiresAt) < new Date()) return { error: "Tu contraseña temporal venció. Pide a administración que la restablezca." };
    return { user: u, mustChange: a.mustChange };
  }
  // Cuentas anteriores (capacitadores habilitados con clave temporal aleatoria)
  const legacy = state.leads.find((x) => x.userId === u.id)?.tempPassword ?? state.trainerApps.find((x) => x.userId === u.id)?.tempPassword;
  return legacy && legacy === password ? { user: u, mustChange: false } : bad;
}

// Verifica al capacitador y habilita su portal: mismo esquema que el participante (usuario = cédula, clave temporal = cédula, cambio obligatorio).
export const enableTrainer = (id: string) =>
  update((s) => {
    const t = s.trainerApps.find((x) => x.id === id);
    if (!t || t.status === "matriculado") return s;
    const userId = `u-${Date.now()}`;
    const docId = t.docId.trim();
    const mail = credentialsMail(t.name, t.email, docId, docId, true);
    let n: DemoState = {
      ...s,
      extraUsers: [...s.extraUsers, { id: userId, name: t.name, email: t.email.toLowerCase(), role: "teacher", bio: t.specialty, docId, active: true }],
      accounts: { ...s.accounts, [userId]: { docId, tempPassword: docId, mustChange: true, expiresAt: new Date(Date.now() + TEMP_DAYS * 86400000).toISOString() } },
      outbox: [{ id: `em-${Date.now()}`, userId, at: new Date().toISOString(), ...mail }, ...s.outbox],
      trainerApps: s.trainerApps.map((x) => (x.id === id ? { ...x, status: "matriculado", userId } : x)),
    };
    n = withLog(n, userId, "created", `Cuenta de capacitador creada (usuario: cédula ${docId})`, "Administración");
    return withLog(n, userId, "email_sent", `Correo enviado a ${t.email}`, "Administración");
  });
