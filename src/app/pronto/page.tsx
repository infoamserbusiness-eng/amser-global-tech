import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Globe } from "@/components/Globe";

export const metadata = { title: "Campus próximamente — Amser Global Tech" };

export default function Pronto() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center bg-navy text-white">
        <div className="container-x grid items-center gap-6 py-16 md:grid-cols-2">
          <div>
            <span className="badge" style={{ background: "rgba(62,209,106,.15)", color: "#7ee8a0" }}>Campus virtual</span>
            <h1 className="mt-4 text-3xl font-extrabold md:text-5xl">Tu campus abre muy pronto</h1>
            <p className="mt-4 max-w-md text-[var(--on-navy-soft)]">Si ya cambiaste tu contraseña, tu acceso está activo: estamos terminando de cargar los cursos y contenidos de los portales y te avisaremos por correo cuando puedas entrar. Si aún no te has registrado, hazlo desde la sección de cursos.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cursos" className="btn btn-green">Ver cursos</Link>
              <a href="/salir" className="btn btn-ghost-light">Cerrar sesión</a>
            </div>
          </div>
          <Globe />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
