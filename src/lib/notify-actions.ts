"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "./auth";
import { supabaseServer } from "./supabase/server";

// Marca como leídos los avisos del usuario actual (la RLS impide tocar los de otros).
export async function markAllRead(path: string) {
  if (!(await getSessionUser())) return;
  await (await supabaseServer()).from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath(path);
}
