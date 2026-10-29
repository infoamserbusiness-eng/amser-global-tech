import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  if (!DEMO) await (await supabaseServer()).auth.signOut();
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
