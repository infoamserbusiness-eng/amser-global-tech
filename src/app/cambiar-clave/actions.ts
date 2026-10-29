"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logAccount } from "@/lib/accounts";
import { ROLE_HOME } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type PwState = { error?: string };

// Primer ingreso: el usuario reemplaza la clave temporal. Luego se cierra la sesión y debe ingresar de nuevo.
// Solo aplica a quien está pendiente de cambio (ya se autenticó con su clave temporal). El cambio lo hace el servidor con
// autorización administrativa: así funciona aunque Supabase exija «contraseña actual» (la temporal puede ser una clave manual).
export async function changePassword(_prev: PwState, form: FormData): Promise<PwState> {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");
  if (!user.mustChange) redirect(ROLE_HOME[user.role]); // ya cambió su clave: no se puede usar esta ruta para saltarse el login

  const pw = String(form.get("password") ?? "");
  const again = String(form.get("confirm") ?? "");
  if (pw.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return { error: "Usa letras y números en tu contraseña." };
  if (pw !== again) return { error: "Las contraseñas no coinciden." };
  if (pw === user.docId || pw.toLowerCase() === user.email.toLowerCase()) return { error: "La nueva contraseña no puede ser tu cédula ni tu correo." };

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: pw });
  if (error) {
    const code = (error as { code?: string }).code ?? "";
    if (code === "weak_password" || /weak|pwned|compromised|leaked/i.test(error.message)) return { error: "Esa contraseña es muy común o aparece en filtraciones públicas. Elige otra más segura (mezcla letras, números y símbolos)." };
    if (code === "same_password" || /different|same/i.test(error.message)) return { error: "La nueva contraseña debe ser distinta de la temporal." };
    return { error: `No se pudo cambiar la contraseña (${error.message}). Inténtalo de nuevo.` };
  }

  await admin.from("profiles").update({ must_change_password: false, temp_password_expires_at: null, password_changed_at: new Date().toISOString() }).eq("id", user.id);
  await logAccount(user.id, "password_changed", "El usuario cambió su contraseña temporal", user.name);
  await (await supabaseServer()).auth.signOut();
  redirect("/ingresar?clave=cambiada");
}
