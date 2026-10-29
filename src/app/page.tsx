import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Globe } from "@/components/Globe";
import { CountUp, Reveal } from "@/components/Reveal";
import { CourseGrid } from "@/components/CourseGrid";
import { DEMO } from "@/lib/mode";
import { getSiteCourses } from "@/lib/catalog";

const AREAS_INFO = [
  { t: "Desarrollo", d: "Web, móvil y APIs", i: "M8 9l-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12" },
  { t: "Seguridad", d: "Hacking ético y defensa", i: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" },
  { t: "Datos e IA", d: "Machine learning y analítica", i: "M4 19V9m5 10V5m5 14v-7m5 7V8" },
  { t: "Cloud", d: "AWS y arquitectura", i: "M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18H7z" },
  { t: "Redes", d: "CCNA y conectividad", i: "M12 5v4m0 6v4M5 12h4m6 0h4M12 9a3 3 0 100 6 3 3 0 000-6z" },
  { t: "Negocios digitales", d: "Marketing y analítica", i: "M3 17l6-6 4 4 8-8M15 7h6v6" },
];

const ROLES = [
  { t: "Estudiante", d: "Cursa, entrega tareas, rinde evaluaciones y sigue tu avance en tiempo real.", c: "#1f7ae0" },
  { t: "Capacitador", d: "Publica contenido, anuncia, califica entregas y acompaña a cada grupo.", c: "#22b24c" },
];

const FAQ = [
  ["¿Cómo accedo al campus virtual?", "Primero te registras como participante. Admisiones te llama para resolver tus dudas y, al validar tu admisión, habilita tu plataforma y te envía tus credenciales. Entras desde «Ingresar»."],
  ["¿Las clases son en vivo o grabadas?", "Depende del curso: hay modalidades en vivo, híbridas y autogestionadas. Todas dejan las sesiones y materiales disponibles en el campus."],
  ["¿Entregan certificado?", "Sí. En los cursos pregrabados ves los videos y apruebas la evaluación final con 70% o más. En los cursos largos pagas el 100%, entregas las tareas y apruebas la evaluación. El certificado se emite automáticamente."],
  ["¿Puedo pagar en cuotas?", "En los cursos largos sí: eliges entre pago total, 50% + 50% (el saldo 30 días antes de terminar) o cuotas mensuales. Los cursos pregrabados se pagan al 100% al inscribirte."],
];

export default async function Home() {
  // Producción: cursos publicados desde la base de datos (los de ejemplo del demo no se muestran).
  const site = DEMO ? undefined : await getSiteCourses();
  return (
    <>
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-navy text-white">
          <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(60% 50% at 80% 30%, rgba(31,122,224,.45), transparent 70%), radial-gradient(40% 40% at 10% 90%, rgba(34,178,76,.25), transparent 70%)" }} />
          <div className="container-x relative grid items-center gap-8 py-14 md:grid-cols-[1.1fr_.9fr] md:py-20">
            <div style={{ animation: "rise .7s both" }}>
              <span className="badge" style={{ background: "rgba(62,209,106,.15)", color: "#7ee8a0" }}>● Registro de participantes abierto</span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] md:text-6xl">
                Tecnología que te <span className="bg-gradient-to-r from-[#4da3ff] to-[#3ed16a] bg-clip-text text-transparent">conecta con el mundo</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-[var(--on-navy-soft)]">
                Instituto tecnológico superior en línea: cursos prácticos, capacitadores en ejercicio y un campus virtual donde aprendes, entregas y creces con acompañamiento real.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/registro" className="btn btn-green">Registrarme como participante →</Link>
                <Link href="/cursos" className="btn btn-ghost-light">Ver cursos</Link>
                <Link href="/ingresar" className="btn btn-ghost-light">Ingresar</Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
                {[[6, "", "Áreas de formación"], [96, "%", "Práctica en laboratorio"], [4, "", "Portales por rol"]].map(([n, s, l]) => (
                  <div key={String(l)}>
                    <dt className="font-display text-3xl font-extrabold"><CountUp to={n as number} suffix={s as string} /></dt>
                    <dd className="mt-1 text-xs text-[var(--on-navy-soft)]">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Globe />
          </div>
        </section>

        {/* ÁREAS */}
        <section id="rutas" className="container-x py-20">
          <Reveal>
            <p className="eyebrow">Áreas de formación</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold md:text-4xl">Elige tu ruta. Construye un perfil que el mercado busca.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS_INFO.map((a, i) => (
              <Reveal key={a.t} delay={i * 60}>
                <Link href="/cursos" className="card lift flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue to-blue-bright text-white">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={a.i} /></svg>
                  </span>
                  <span><b className="block font-display">{a.t}</b><span className="text-sm text-soft">{a.d}</span></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CURSOS */}
        <section className="bg-white py-20">
          <div className="container-x">
            <Reveal>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div><p className="eyebrow">Próximos lanzamientos</p><h2 className="mt-2 text-3xl font-extrabold md:text-4xl">Cursos que abren pronto</h2></div>
                <Link href="/cursos" className="btn btn-ghost">Ver todo el catálogo</Link>
              </div>
            </Reveal>
            <CourseGrid limit={3} courses={site} />
          </div>
        </section>

        {/* CAMPUS / ROLES */}
        <section id="campus" className="container-x py-20">
          <Reveal>
            <p className="eyebrow">Campus virtual</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold md:text-4xl">Un solo ingreso. Cada rol, su propia plataforma.</h2>
            <p className="mt-3 max-w-2xl text-soft">Entras con tus credenciales y el sistema te lleva a tu espacio de trabajo. Estudiantes y capacitadores interactúan dentro del campus de cada curso.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r, i) => (
              <Reveal key={r.t} delay={i * 70}>
                <div className="card relative h-full overflow-hidden p-5">
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: r.c }} />
                  <h3 className="font-display text-lg font-bold">{r.t}</h3>
                  <p className="mt-2 text-sm text-soft">{r.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PASOS */}
        <section className="bg-navy py-20 text-white">
          <div className="container-x">
            <Reveal><h2 className="max-w-xl text-3xl font-extrabold md:text-4xl">Empezar es simple</h2></Reveal>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {["Regístrate como participante", "Admisiones te llama, valida tu admisión y habilita tu plataforma", "Elige tu curso, paga con el plan que prefieras y empieza a aprender"].map((t, i) => (
                <Reveal key={t} delay={i * 90}>
                  <li className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-bright to-green font-display font-bold">{i + 1}</span>
                    <span className="pt-1.5 text-[var(--on-navy)]">{t}</span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

{/* CONVOCATORIA CAPACITADORES */}        <section className="container-x pb-4">          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue to-[#0a8f3c] p-8 text-white md:flex-row md:items-center">            <div><h2 className="text-2xl font-extrabold md:text-3xl">¿Eres experto en tecnología? Sé parte de nuestro equipo</h2><p className="mt-2 max-w-2xl text-white/85">Crea y vende tus cursos pregrabados o dicta cursos en vivo por Zoom o Meet desde tu propio portal de capacitador.</p></div>            <Link href="/capacitadores" className="btn shrink-0 bg-white text-blue">Postular como capacitador →</Link>          </div>        </section>
        {/* FAQ */}
        <section id="faq" className="container-x py-20">
          <Reveal><h2 className="text-3xl font-extrabold md:text-4xl">Preguntas frecuentes</h2></Reveal>
          <div className="mt-8 max-w-3xl space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display font-semibold">{q}<span className="text-blue transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm text-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
