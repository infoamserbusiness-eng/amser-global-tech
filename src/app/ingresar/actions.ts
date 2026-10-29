"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_PASSWORD, ROLE_HOME, USERS, type Role } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { adminConfigured, supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type LoginState = { error?: string };
const GENERIC = "Usuario o contraseña incorrectos.";

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const ident = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");

  if (DEMO) {
    const user = USERS.find((u) => u.email.toLowerCase() === ident.toLowerCase());
    if (!user || password !== DEMO_PASSWORD) return { error: GENERIC };
    if (!user.active) return { error: "Tu cuenta está desactivada. Contacta a administración." };
    (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
    const home = ROLE_HOME[user.role];
    redirect(next.startsWith(home) ? next : home);
  }

  // Usuario = cédula (participantes) o correo (equipo). La cédula se traduce al correo en el servidor, sin exponerlo.
  let email = ident.toLowerCase();
  if (!ident.includes("@")) {
    if (!adminConfigured() || ident.length < 5) return { error: GENERIC };
    const admin = supabaseAdmin();
    const { data: p } = await admin.from("profiles").select("id").eq("doc_id", ident).maybeSingle();
    const { data: u } = p ? await admin.auth.admin.getUserById(p.id) : { data: null };
    if (!u?.user?.email) return { error: GENERIC };
    email = u.user.email;
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: GENERIC };
  const { data: p } = await sb.from("profiles").select("role, is_active, must_change_password, temp_password_expires_at").eq("id", data.user.id).single();
  if (!p?.is_active) {
    await sb.auth.signOut();
    return { error: "Tu cuenta está desactivada. Contacta a administración." };
  }
  if (p.must_change_password) {
    if (p.temp_password_expires_at && new Date(p.temp_password_expires_at) < new Date()) {
      await sb.auth.signOut();
      return { error: "Tu contraseña temporal venció. Pide a administración que la restablezca." };
    }
    redirect("/cambiar-clave");
  }
  const home = ROLE_HOME[p.role as Role];
  redirect(next.startsWith(home) ? next : home);
}
