"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

const back = (ok: boolean, text: string) => redirect(`/capacitador/pagos?${ok ? "msg" : "err"}=${encodeURIComponent(text)}`);

// Cuenta bancaria donde Amser transfiere los pagos del capacitador. La RLS permite solo la propia.
export async function saveBank(form: FormData) {
  const user = await requireRole("teacher");
  const v = (k: string) => String(form.get(k) ?? "").trim();
  const bank = v("bank"), type = v("type"), number = v("number").replace(/\s+/g, ""), holder = v("holder"), doc = v("doc");
  if (bank.length < 2 || bank.length > 80) back(false, "Indica el banco.");
  if (!["ahorros", "corriente"].includes(type)) back(false, "Elige el tipo de cuenta.");
  if (!/^\d{6,30}$/.test(number)) back(false, "El número de cuenta debe tener solo dígitos (6 a 30).");
  if (holder.length < 2 || holder.length > 120) back(false, "Indica el nombre del titular.");
  if (doc.length < 5 || doc.length > 30) back(false, "Indica la cédula o RUC del titular.");
  const { error } = await (await supabaseServer()).from("trainer_bank_accounts").upsert({ profile_id: user.id, bank, account_type: type, account_number: number, holder_name: holder, holder_doc: doc, updated_at: new Date().toISOString() });
  if (error) back(false, "No se pudo guardar. Inténtalo de nuevo.");
  back(true, "Datos de pago guardados.");
}
