"use server";

import { supabaseServer } from "@/lib/supabase/server";

export type TrainerInput = {
  name: string; docId: string; email: string; phone: string; city: string; specialty: string; years: number;
  mode: "pregrabados" | "envivo" | "ambos"; topic: string; link: string; message: string; website?: string;
};

// Postulación pública de capacitador: valida en servidor e inserta con la llave pública (la RLS solo permite INSERT).
export async function submitTrainer(i: TrainerInput): Promise<{ ok: boolean; error?: string }> {
  if (i.website) return { ok: true }; // honeypot
  const name = i.name.trim(), docId = i.docId.trim(), email = i.email.trim().toLowerCase(), phone = i.phone.trim();
  const city = i.city.trim(), specialty = i.specialty.trim(), topic = i.topic.trim(), link = i.link.trim(), message = i.message.trim();
  if (name.length < 2 || name.length > 120) return { ok: false, error: "Revisa tu nombre." };
  if (docId.length < 5 || docId.length > 30) return { ok: false, error: "Revisa tu cédula o documento." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 160) return { ok: false, error: "Revisa tu correo." };
  if (phone.length < 6 || phone.length > 30) return { ok: false, error: "Revisa tu teléfono." };
  if (specialty.length < 2 || specialty.length > 160) return { ok: false, error: "Indica tu especialidad." };
  if (!Number.isFinite(i.years) || i.years < 0 || i.years > 60) return { ok: false, error: "Revisa tus años de experiencia." };
  if (!["pregrabados", "envivo", "ambos"].includes(i.mode)) return { ok: false, error: "Modalidad no válida." };
  if (topic.length < 3 || topic.length > 300) return { ok: false, error: "Cuéntanos qué curso te gustaría ofrecer." };
  if (link && !/^https?:\/\//i.test(link)) return { ok: false, error: "El enlace debe empezar con http:// o https://" };
  if (city.length > 80 || link.length > 300 || message.length > 500) return { ok: false, error: "Alguno de los textos es demasiado largo." };

  const sb = await supabaseServer();
  const { error } = await sb.from("trainer_applications").insert({
    name, doc_id: docId, email, phone, city: city || null, specialty, years: Math.round(i.years), mode: i.mode, topic, link: link || null, message: message || null,
  });
  return error ? { ok: false, error: "No pudimos registrar tu solicitud. Inténtalo de nuevo." } : { ok: true };
}
