import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/data";

export function Logo({ height = 44 }: { height?: number }) {
  return (
    <Image src="/logo.png" alt="Amser Global Tech — Higher Technological Institute" width={Math.round(height * 1.32)} height={height} priority style={{ height, width: "auto" }} />
  );
}

// Versión compacta para cabeceras: isotipo + wordmark en HTML (legible a cualquier tamaño).
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/logo-mark.png" alt="" width={46} height={44} priority className={light ? "rounded-lg bg-white p-0.5" : ""} />
      <span className="leading-none">
        <span className="block font-display text-[17px] font-extrabold tracking-tight"><span style={{ color: light ? "#6fb2ff" : "var(--blue)" }}>AMSER</span> <span style={{ color: "var(--green)" }}>GLOBAL TECH</span></span>
        <span className={`mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? "text-[var(--on-navy-soft)]" : "text-soft"}`}>Higher Technological Institute</span>
      </span>
    </span>
  );
}

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
      <div className="container-x flex items-center justify-between gap-4 py-2.5">
        <Link href="/" aria-label="Amser Global Tech, inicio"><Brand /></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-soft md:flex">
          <Link href="/#rutas" className="hover:text-blue">Áreas</Link>
          <Link href="/cursos" className="hover:text-blue">Cursos</Link>
          <Link href="/#campus" className="hover:text-blue">Campus virtual</Link>
          <Link href="/capacitadores" className="hover:text-blue">Capacitadores</Link>
          <Link href="/#faq" className="hover:text-blue">Preguntas</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href={ROLE_HOME[user.role]} className="btn btn-primary btn-sm">Mi portal · {ROLE_LABEL[user.role]}</Link>
          ) : (
            <>
              <Link href="/registro" className="btn btn-green btn-sm hidden sm:inline-flex">Registrarme</Link>
              <Link href="/ingresar" className="btn btn-primary btn-sm">Ingresar</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-[var(--on-navy-soft)]">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="inline-block rounded-xl bg-white p-3"><Logo height={110} /></div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Formación tecnológica de calidad, en línea y con acompañamiento real. Amser Global Tech S.A.S.</p>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-bold text-white">Aprende</h4>
          <ul className="space-y-2"><li><Link href="/cursos">Catálogo de cursos</Link></li><li><Link href="/#rutas">Áreas de formación</Link></li><li><Link href="/#campus">Campus virtual</Link></li></ul>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-bold text-white">Comunidad</h4>
          <ul className="space-y-2"><li><Link href="/ingresar">Estudiantes</Link></li><li><Link href="/capacitadores">Ser capacitador</Link></li></ul>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-bold text-white">Contacto</h4>
          <ul className="space-y-2"><li>Escríbenos desde el formulario de preinscripción de cada curso</li><li>Ecuador</li></ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} Amser Global Tech S.A.S. Todos los derechos reservados.</div>
    </footer>
  );
}
