"use server";

import { getSiteCourse } from "@/lib/catalog";
import { supabaseServer } from "@/lib/supabase/server";

export type RegistroInput = { name: string; docId: string; email: string; phone: string; city: string; courseSlug: string; message: string; website?: string };

// Registro público de participante: valida en servidor e inserta con la llave pública (la RLS solo permite INSERT).
export async function submitRegistro(input: RegistroInput): Promise<{ ok: boolean; error?: string }> {
  if (input.website) return { ok: true }; // honeypot: los bots rellenan este campo oculto
  const name = input.name.trim();
  const docId = input.docId.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const city = input.city.trim();
  const message = input.message.trim();
  if (name.length < 2 || name.length > 120) return { ok: false, error: "Revisa tu nombre." };
  if (docId.length < 5 || docId.length > 30) return { ok: false, error: "Revisa tu cédula o documento." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 160) return { ok: false, error: "Revisa tu correo." };
  if (phone.length < 6 || phone.length > 30) return { ok: false, error: "Revisa tu teléfono." };
  if (city.length > 80 || message.length > 500) return { ok: false, error: "Alguno de los textos es demasiado largo." };
  if (input.courseSlug !== "general" && !(await getSiteCourse(input.courseSlug))) return { ok: false, error: "Curso no válido." };

  const sb = await supabaseServer();
  const { error } = await sb.from("leads").insert({ name, doc_id: docId, email, phone, city: city || null, course_slug: input.courseSlug, message: message || null });
  return error ? { ok: false, error: "No pudimos registrar tu solicitud. Inténtalo de nuevo." } : { ok: true };
}
