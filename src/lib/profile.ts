import "server-only";
import { supabaseServer } from "./supabase/server";

export type DocKind = "cedula" | "ruc" | "titulo" | "certificado_capacitacion" | "hoja_de_vida" | "certificado_laboral" | "certificado_bancario" | "otro";
export type DocType = [kind: DocKind, label: string, required: boolean, help: string];

// Documentos que se piden a cada rol.
export const DOC_KINDS: Record<"teacher" | "student", DocType[]> = {
  teacher: [
    ["cedula", "Cédula de identidad", true, "Ambos lados, legible"],
    ["ruc", "RUC", false, "Si facturas tus servicios"],
    ["hoja_de_vida", "Hoja de vida", true, "PDF actualizado"],
    ["titulo", "Títulos académicos", true, "Pregrado, posgrado, técnicos"],
    ["certificado_capacitacion", "Certificados de capacitación", false, "Cursos, diplomados, certificaciones"],
    ["certificado_laboral", "Certificados laborales", false, "Experiencia profesional"],
    ["certificado_bancario", "Certificado bancario", true, "Donde recibirás tus pagos"],
    ["otro", "Otros documentos", false, ""],
  ],
  student: [
    ["cedula", "Cédula de identidad", true, "Ambos lados, legible"],
    ["titulo", "Título o certificado de estudios", false, "Si aplica al curso"],
    ["otro", "Otros documentos", false, ""],
  ],
};

export const ROLE_NOUN: Record<string, string> = { teacher: "Capacitador", student: "Participante", coordinator: "Coordinador académico", admin: "Administrador" };

export async function loadProfile(userId: string, create: boolean) {
  const sb = await supabaseServer();
  const { data: profile } = await sb.from("profiles").select("id, full_name, role, doc_id, is_active").eq("id", userId).maybeSingle();
  if (!profile) return null;
  let { data: details } = await sb.from("profile_details").select("*").eq("profile_id", userId).maybeSingle();
  if (!details && create) {
    await sb.from("profile_details").insert({ profile_id: userId }); // genera el token de la credencial
    details = (await sb.from("profile_details").select("*").eq("profile_id", userId).maybeSingle()).data;
  }
  const { data: docs } = await sb.from("profile_documents").select("*").eq("profile_id", userId).order("uploaded_at", { ascending: false });
  const avatarUrl = details?.avatar_path ? (await sb.storage.from("profile-files").createSignedUrl(details.avatar_path, 3600)).data?.signedUrl ?? null : null;
  return { profile, details, docs: docs ?? [], avatarUrl };
}

export type LoadedProfile = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;
