import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PORTALS = ["/estudiante", "/capacitador"];
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const under = (path: string, base: string) => path === base || path.startsWith(base + "/");

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // La administración se hace desde la plataforma madre (amserbusiness.com); este sitio es solo para participantes y capacitadores.
  if (under(pathname, "/admin")) return NextResponse.redirect("https://amserbusiness.com");
  const isPortal = PORTALS.some((p) => under(pathname, p));
  const go = (to: string) => {
    const url = req.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // --- Demo: guard por cookie simulada ---
  if (DEMO) {
    if (isPortal && !req.cookies.get("agt_session")) {
      const url = req.nextUrl.clone();
      url.pathname = "/ingresar";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- Producción: sesión Supabase (se refresca aquí) ---
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  if (isPortal) {
    if (!data.user) {
      const url = req.nextUrl.clone();
      url.pathname = "/ingresar";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // Producción: solo operan las rutas que ya usan datos reales; el resto del prototipo se redirige al inicio de cada portal.
    const ok = (base: string, allowed: string[]) => under(pathname, base) && (pathname === base || allowed.some((a) => under(pathname, a)));
    if (under(pathname, "/capacitador") && !ok("/capacitador", ["/capacitador/cursos", "/capacitador/pagos", "/capacitador/avisos", "/capacitador/perfil"])) return go("/capacitador");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
