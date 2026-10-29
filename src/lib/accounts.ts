import "server-only";
import { credentialsEmail, sendEmail } from "./email";
import { supabaseAdmin } from "./supabase/admin";

export const TEMP_DAYS = 7;
const MIN_TEMP = 6; // mínimo que exige Supabase Auth

type Result = { ok: boolean; message: string };
type Kind = "created" | "email_sent" | "email_failed" | "password_changed" | "admin_reset" | "manual_password";
export type AccountKind = "participant" | "trainer";

const PORTAL: Record<AccountKind, { portal: string; role: "student" | "teacher"; table: "leads" | "trainer_applications"; who: string; extra?: string }> = {
  participant: { portal: "Portal de participante", role: "student", table: "leads", who: "participante" },
  trainer: { portal: "Portal de capacitador", role: "teacher", table: "trainer_applications", who: "capacitador", extra: "Una vez dentro podrás crear tus cursos y subir tu material (módulos, videos, evaluaciones y tareas) para tus participantes." },
};

const COORD = { portal: "Portal de Coordinación Académica", who: "coordinador académico", extra: "Desde tu portal podrás supervisar los cursos de los capacitadores, aprobar su contenido y llevar el control académico." };

export async function logAccount(profileId: string, kind: Kind, note: string | null, by: string | null) {
  await supabaseAdmin().from("account_events").insert({ profile_id: profileId, kind, note, created_by: by });
}

async function emailCredentials(profileId: string, k: AccountKind | "coordinator", o: { name: string; email: string; username: string; password: string }, by: string): Promise<Result> {
  const mail = credentialsEmail({ name: o.name, username: o.username, password: o.password, validDays: TEMP_DAYS, portal: k === "coordinator" ? COORD.portal : PORTAL[k].portal, extra: k === "coordinator" ? COORD.extra : PORTAL[k].extra });
  const r = await sendEmail({ to: o.email, subject: mail.subject, html: mail.html, text: mail.text });
  await logAccount(profileId, r.ok ? "email_sent" : "email_failed", r.ok ? `Enviado a ${o.email}` : r.error ?? "Error", by);
  return r.ok ? { ok: true, message: `Correo enviado a ${o.email}.` } : { ok: false, message: `La cuenta quedó lista, pero el correo NO se envió: ${r.error}` };
}

// Admite: crea la cuenta (usuario = cédula, clave temporal = cédula, cambio obligatorio) y envía el correo con el acceso.
// Sirve para participantes (tabla leads) y capacitadores (tabla trainer_applications).
export async function provisionAccount(k: AccountKind, sourceId: string, by: string): Promise<Result> {
  const cfg = PORTAL[k];
  const admin = supabaseAdmin();
  const { data: src } = await admin.from(cfg.table).select("*").eq("id", sourceId).single();
  if (!src) return { ok: false, message: "No se encontró el registro." };
  if (src.user_id) return { ok: false, message: `Este ${cfg.who} ya tiene su acceso creado.` };
  const docId = String(src.doc_id ?? "").trim();
  if (docId.length < MIN_TEMP) return { ok: false, message: "La cédula registrada es muy corta para usarla como clave temporal (mínimo 6 caracteres)." };

  const { data: dup } = await admin.from("profiles").select("id").eq("doc_id", docId).maybeSingle();
  if (dup) return { ok: false, message: "Ya existe un usuario con esa cédula (el usuario de acceso es la cédula y debe ser único)." };

  const { data: created, error } = await admin.auth.admin.createUser({ email: src.email, password: docId, email_confirm: true, user_metadata: { full_name: src.name } });
  if (error || !created.user) return { ok: false, message: error?.message?.includes("already") ? "Ya existe una cuenta con ese correo." : `No se pudo crear la cuenta: ${error?.message ?? "error"}` };
  const uid = created.user.id;

  const expires = new Date(Date.now() + TEMP_DAYS * 86400000).toISOString();
  await admin.from("profiles").update({ role: cfg.role, full_name: src.name, doc_id: docId, must_change_password: true, temp_password_expires_at: expires, is_active: true }).eq("id", uid);
  await admin.from(cfg.table).update({ status: "matriculado", user_id: uid, admitted_at: new Date().toISOString() }).eq("id", sourceId);
  await logAccount(uid, "created", `Cuenta de ${cfg.who} creada desde la admisión (usuario: cédula ${docId})`, by);

  return emailCredentials(uid, k, { name: src.name, email: src.email, username: docId, password: docId }, by);
}

export const provisionParticipant = (leadId: string, by: string) => provisionAccount("participant", leadId, by);
export const provisionTrainer = (appId: string, by: string) => provisionAccount("trainer", appId, by);

// Restablece la clave: por defecto vuelve a la cédula (o una temporal manual), obliga a cambiarla y reenvía el correo.
export async function resetAccountPassword(profileId: string, by: string, manual?: string): Promise<Result> {
  const admin = supabaseAdmin();
  const { data: p } = await admin.from("profiles").select("full_name, doc_id, role").eq("id", profileId).single();
  const { data: u } = await admin.auth.admin.getUserById(profileId);
  if (!p || !u.user?.email) return { ok: false, message: "No se encontró la cuenta." };
  const password = (manual ?? p.doc_id ?? "").trim();
  if (password.length < (manual ? 8 : MIN_TEMP)) return { ok: false, message: manual ? "La clave temporal manual debe tener al menos 8 caracteres." : "La cédula es muy corta para usarla como clave temporal." };

  const { error } = await admin.auth.admin.updateUserById(profileId, { password });
  if (error) return { ok: false, message: `No se pudo cambiar la clave: ${error.message}` };
  await admin.from("profiles").update({ must_change_password: true, temp_password_expires_at: new Date(Date.now() + TEMP_DAYS * 86400000).toISOString(), password_changed_at: null }).eq("id", profileId);
  await logAccount(profileId, manual ? "manual_password" : "admin_reset", manual ? "El admin asignó una clave temporal manual" : "El admin restableció la clave a la cédula", by);
  const k: AccountKind | "coordinator" = p.role === "teacher" ? "trainer" : p.role === "coordinator" ? "coordinator" : "participant";
  return emailCredentials(profileId, k, { name: p.full_name ?? (k === "coordinator" ? COORD.who : PORTAL[k].who), email: u.user.email, username: p.doc_id ?? u.user.email, password }, by);
}
export const resetParticipantPassword = resetAccountPassword;

// Alta directa de personal (sin pasar por admisión): hoy Coordinador Académico. Usuario = cédula, clave temporal = cédula, cambio obligatorio.
export async function createStaffAccount(i: { name: string; docId: string; email: string }, by: string): Promise<Result> {
  const admin = supabaseAdmin();
  const name = i.name.trim(), docId = i.docId.trim(), email = i.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 120) return { ok: false, message: "Revisa el nombre." };
  if (docId.length < MIN_TEMP || docId.length > 30) return { ok: false, message: "La cédula debe tener entre 6 y 30 caracteres (es el usuario y la clave temporal)." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Revisa el correo." };
  const { data: dup } = await admin.from("profiles").select("id").eq("doc_id", docId).maybeSingle();
  if (dup) return { ok: false, message: "Ya existe un usuario con esa cédula (debe ser única)." };

  const { data: created, error } = await admin.auth.admin.createUser({ email, password: docId, email_confirm: true, user_metadata: { full_name: name } });
  if (error || !created.user) return { ok: false, message: error?.message?.includes("already") ? "Ya existe una cuenta con ese correo." : `No se pudo crear la cuenta: ${error?.message ?? "error"}` };
  const uid = created.user.id;
  await admin.from("profiles").update({ role: "coordinator", full_name: name, doc_id: docId, must_change_password: true, temp_password_expires_at: new Date(Date.now() + TEMP_DAYS * 86400000).toISOString(), is_active: true }).eq("id", uid);
  await logAccount(uid, "created", `Cuenta de Coordinador Académico creada por el administrador (usuario: cédula ${docId})`, by);
  return emailCredentials(uid, "coordinator", { name, email, username: docId, password: docId }, by);
}
