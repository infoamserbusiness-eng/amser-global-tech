import "server-only";
import { DEMO } from "./mode";
import { supabaseServer } from "./supabase/server";

// Avisos sin leer del usuario actual (producción). La RLS garantiza que solo cuenta los suyos.
export async function unreadCount(): Promise<number> {
  if (DEMO) return 0;
  const { count } = await (await supabaseServer()).from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}
