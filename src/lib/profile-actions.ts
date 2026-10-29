"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import { ROLE_HOME } from "./data";
import { DOC_KINDS } from "./profile";
import { supabaseServer } from "./supabase/server";

type Res = { ok: boolean; error?: string; url?: string };

async function me() {
  const u = await getSessionUser();
  if (!u) redirect("/ingresar");
  if (u.mustChange) redirect("/cambiar-clave");
  if (u.role !== "teacher" && u.role !== "student") redirect(ROLE_HOME[u.role]);
  return u as typeof u & { role: "teacher" | "student" };
}

// Datos personales (el usuario edita los suyos; la RLS lo garantiza).
export async function saveDetails(form: FormData) {
  const u = await me();
  const back = (ok: boolean, text: string) => redirect(`${ROLE_HOME[u.role]}/perfil?${ok ? "msg" : "err"}=${encodeURIComponent(text)}`);
  const v = (k: string) => String(form.get(k) ?? "").trim();
  const phone = v("phone"), birth = v("birth"), nat = v("nationality"), city = v("city"), address = v("address"), profession = v("profession"), bio = v("bio");
  if (phone && !/^[+\d][\d\s()-]{5,29}$/.test(phone)) back(false, "Revisa el teléfono.");
  if (birth && (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || new Date(birth) > new Date() || new Date(birth).getFullYear() < 1920)) back(false, "Revisa la fecha de nacimiento.");
  if (nat.length > 60 || city.length > 80 || address.length > 200 || profession.length > 120 || bio.length > 1200) back(false, "Alguno de los textos es demasiado largo.");
  const { error } = await (await supabaseServer()).from("profile_details").upsert({
    profile_id: u.id, phone: phone || null, birth_date: birth || null, nationality: nat || null, city: city || null, address: address || null, profession: profession || null, bio: bio || null, updated_at: new Date().toISOString(),
  });
  if (error) back(false, "No se pudo guardar. Inténtalo de nuevo.");
  revalidatePath(`${ROLE_HOME[u.role]}/perfil`);
  back(true, "Datos guardados.");
}

// El navegador ya subió la foto al almacenamiento privado; aquí se registra y se borra la anterior.
export async function saveAvatar(path: string): Promise<Res> {
  const u = await me();
  if (!path.startsWith(`${u.id}/avatar/`) || path.includes("..")) return { ok: false, error: "Archivo no válido." };
  const sb = await supabaseServer();
  const { data: old } = await sb.from("profile_details").select("avatar_path").eq("profile_id", u.id).maybeSingle();
  const { error } = await sb.from("profile_details").upsert({ profile_id: u.id, avatar_path: path, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "No se pudo guardar la foto." };
  if (old?.avatar_path && old.avatar_path !== path) await sb.storage.from("profile-files").remove([old.avatar_path]);
  revalidatePath(`${ROLE_HOME[u.role]}/perfil`);
  return { ok: true };
}

export async function addDocument(i: { kind: string; name: string; path: string; size: number }): Promise<Res> {
  const u = await me();
  if (!DOC_KINDS[u.role].some(([k]) => k === i.kind)) return { ok: false, error: "Tipo de documento no válido." };
  if (!i.path.startsWith(`${u.id}/docs/`) || i.path.includes("..")) return { ok: false, error: "Archivo no válido." };
  const sb = await supabaseServer();
  const { count } = await sb.from("profile_documents").select("id", { count: "exact", head: true }).eq("profile_id", u.id).eq("kind", i.kind);
  if ((count ?? 0) >= 10) return { ok: false, error: "Llegaste al máximo de 10 archivos para este tipo de documento." };
  const { error } = await sb.from("profile_documents").insert({ profile_id: u.id, kind: i.kind, name: i.name.slice(0, 200), storage_path: i.path, size_bytes: Math.max(0, Math.round(i.size)) });
  revalidatePath(`${ROLE_HOME[u.role]}/perfil`);
  return error ? { ok: false, error: "No se pudo registrar el documento." } : { ok: true };
}

export async function removeDocument(id: string): Promise<Res> {
  const u = await me();
  const sb = await supabaseServer();
  const { data: d } = await sb.from("profile_documents").select("storage_path, status").eq("id", id).eq("profile_id", u.id).maybeSingle();
  if (!d) return { ok: false, error: "No encontramos el documento." };
  if (d.status === "verificado") return { ok: false, error: "Un documento verificado por administración no se puede eliminar." };
  await sb.storage.from("profile-files").remove([d.storage_path]);
  await sb.from("profile_documents").delete().eq("id", id);
  revalidatePath(`${ROLE_HOME[u.role]}/perfil`);
  return { ok: true };
}

export async function documentUrl(path: string): Promise<Res> {
  const u = await me();
  if (!path.startsWith(`${u.id}/`) || path.includes("..")) return { ok: false, error: "Archivo no válido." };
  const { data, error } = await (await supabaseServer()).storage.from("profile-files").createSignedUrl(path, 600);
  return error || !data ? { ok: false, error: "No se pudo abrir el archivo." } : { ok: true, url: data.signedUrl };
}
