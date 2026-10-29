import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

// Administrador y coordinador académico abren el material privado de un curso (enlace firmado de 10 minutos).
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "coordinator")) return NextResponse.redirect(new URL("/ingresar", req.url));
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path || path.includes("..")) return new NextResponse("Solicitud no válida", { status: 400 });
  const { data, error } = await (await supabaseServer()).storage.from("course-materials").createSignedUrl(path, 600);
  if (error || !data) return new NextResponse("No se pudo abrir el archivo", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
