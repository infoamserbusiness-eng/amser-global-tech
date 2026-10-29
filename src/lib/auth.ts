import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_HOME, USERS, type Role, type User } from "./data";
import { DEMO } from "./mode";
import { supabaseServer } from "./supabase/server";

export const SESSION_COOKIE = "agt_session";

// DEMO: cookie con el id del usuario. Producción: sesión de Supabase Auth + rol en public.profiles.
export async function getSessionUser(): Promise<User | null> {
  if (DEMO) {
    const id = (await cookies()).get(SESSION_COOKIE)?.value;
    if (id?.startsWith("x.")) {
      // Participante habilitado en el demo: la cookie lleva sus datos (solo demo; en producción manda Supabase).
      try {
        const p = JSON.parse(Buffer.from(id.slice(2), "base64").toString("utf8"));
        return { id: String(p.id), name: String(p.name), email: String(p.email), role: p.role === "teacher" ? "teacher" : "student", active: true, docId: p.docId ? String(p.docId) : undefined, mustChange: !!p.mustChange };
      } catch {
        return null;
      }
    }
    return USERS.find((u) => u.id === id) ?? null;
  }
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await sb.from("profiles").select("full_name, role, is_active, must_change_password, doc_id").eq("id", data.user.id).single();
  if (!p?.is_active) return null;
  return { id: data.user.id, name: p.full_name ?? data.user.email ?? "Usuario", email: data.user.email ?? "", role: p.role as Role, active: true, docId: p.doc_id ?? undefined, mustChange: p.must_change_password };
}

// Acepta varios roles (p. ej. administrador y coordinador comparten la revisión de cursos).
export async function requireRoles(roles: Role[]): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");
  if (user.mustChange) redirect("/cambiar-clave");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

export async function requireRole(role: Role): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");
  if (user.mustChange) redirect("/cambiar-clave"); // clave temporal: primero debe cambiarla
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}
