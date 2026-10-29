import { NextRequest, NextResponse } from "next/server";
import { Fail, OPS } from "@/lib/mother-ops";

// API de administración para la plataforma madre (amserbusiness.com).
// Autenticación: la madre envía su propio token de sesión (Supabase de la madre). Aquí se valida contra ese proyecto y se
// exige rol admin/gerente o los módulos gt-* asignados en `perfiles.modulos_acceso`. Los permisos destructivos requieren rol admin.
// Las claves usadas son públicas (URL y anon key del proyecto de la madre); el acceso lo decide el token del usuario.
const MOTHER_URL = process.env.MOTHER_SUPABASE_URL ?? "https://kvkugyssmqpeehmiobzh.supabase.co";
const MOTHER_ANON = process.env.MOTHER_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a3VneXNzbXFwZWVobWlvYnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTcyODQsImV4cCI6MjA5NzczMzI4NH0.-vL_42fVPZLRudA9SVAttctcfOEwuZ2Cip7OxETRzBs";
const ORIGINS = ["https://amserbusiness.com", "https://www.amserbusiness.com", "http://localhost:5173", "http://localhost:4173"];

const cors = (req: NextRequest) => {
  const o = req.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
};
const reply = (req: NextRequest, body: unknown, status = 200) => NextResponse.json(body, { status, headers: { ...cors(req), "Cache-Control": "no-store" } });

export function OPTIONS(req: NextRequest) { return new NextResponse(null, { status: 204, headers: cors(req) }); }

type Who = { email: string; rol: string; modulos: string[] };

// Módulo de la madre que da acceso a cada operación (el admin los asigna por usuario en Usuarios Empresa).
const GT = ["global-tech-resumen", "gt-participantes", "gt-capacitadores", "gt-cursos", "gt-pagos", "gt-personas", "gt-config"];
function needed(op: string, args: Record<string, unknown>): string[] {
  if (op === "summary" || op === "notifications" || op === "notifications.read") return GT;
  if (op === "admissions" || op.startsWith("admission.")) return [args.kind === "trainer" ? "gt-capacitadores" : "gt-participantes"];
  if (op === "account.reset") return ["gt-participantes", "gt-capacitadores", "gt-personas"];
  if (op.startsWith("course")) return ["gt-cursos"];
  if (op.startsWith("payment") || op === "sales") return ["gt-pagos"];
  if (op.startsWith("bank") || op === "settings") return ["gt-config"];
  return ["gt-personas"]; // people, person.*, doc.setStatus
}

async function caller(token: string): Promise<Who | null> {
  const h = { apikey: MOTHER_ANON, Authorization: `Bearer ${token}` };
  const u = await fetch(`${MOTHER_URL}/auth/v1/user`, { headers: h, cache: "no-store" });
  if (!u.ok) return null;
  const user = (await u.json()) as { id?: string; email?: string };
  if (!user.id) return null;
  const p = await fetch(`${MOTHER_URL}/rest/v1/perfiles?select=rol,activo,modulos_acceso&user_id=eq.${encodeURIComponent(user.id)}`, { headers: h, cache: "no-store" });
  if (!p.ok) return null;
  const rows = (await p.json()) as { rol?: string; activo?: boolean; modulos_acceso?: string[] }[];
  const row = rows[0], rol = row?.rol ?? "";
  if (!row || row.activo === false) return null;
  const modulos = Array.isArray(row.modulos_acceso) ? row.modulos_acceso : [];
  const full = rol === "admin" || rol === "gerente";
  return full || modulos.some((m) => GT.includes(m)) ? { email: user.email ?? "plataforma madre", rol, modulos } : null;
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return reply(req, { ok: false, error: "No autenticado." }, 401);
  const who = await caller(token);
  if (!who) return reply(req, { ok: false, error: "Tu usuario no tiene permiso de administración." }, 403);

  let body: { op?: string; args?: Record<string, unknown> };
  try { body = await req.json(); } catch { return reply(req, { ok: false, error: "Solicitud no válida." }, 400); }
  const op = typeof body.op === "string" ? OPS[body.op] : undefined;
  if (!op) return reply(req, { ok: false, error: "Operación desconocida." }, 400);
  if (who.rol !== "admin" && who.rol !== "gerente" && !needed(body.op!, body.args ?? {}).some((m) => who.modulos.includes(m))) return reply(req, { ok: false, error: "No tienes asignado el módulo para esta acción." }, 403);
  if (op.adminOnly && who.rol !== "admin") return reply(req, { ok: false, error: "Esta acción solo la puede hacer un administrador." }, 403);
  try {
    return reply(req, { ok: true, data: await op.run(body.args ?? {}, who) });
  } catch (e) {
    if (e instanceof Fail) return reply(req, { ok: false, error: e.message });
    console.error("mother-api", body.op, e);
    return reply(req, { ok: false, error: "Error interno al ejecutar la operación." }, 500);
  }
}
