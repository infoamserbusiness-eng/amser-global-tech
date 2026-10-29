import { SiteFooter, SiteHeader } from "@/components/site";
import { TrainerForm } from "./TrainerForm";

export const metadata = { title: "Conviértete en capacitador — Amser Global Tech" };

const MODELS = [
  ["🎬", "Vende tus cursos pregrabados", "Crea tu curso con módulos, videos, material y evaluaciones. Lo publicamos en nuestra plataforma y lo vendemos por ti; recibes un porcentaje de cada venta."],
  ["📹", "Dicta cursos en vivo", "Imparte cursos de larga duración por Zoom o Google Meet. Programas tus clases desde tu portal y cobras por las horas dictadas."],
  ["📊", "Control total desde tu portal", "Indicadores de ventas y participantes, clases dictadas, entregas por calificar y el estado de tus pagos, todo en un solo lugar."],
];

const STEPS = ["Completas tu postulación", "Te llamamos para conocerte y verificar tu identidad", "Habilitamos tu portal de capacitador", "Creas tu primer curso y la administración lo revisa y publica"];

export default function Capacitadores() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-navy text-white">
          <div className="container-x py-14">
            <p className="eyebrow !text-[#7ee8a0]">Convocatoria abierta</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold md:text-5xl">Enseña lo que sabes. Llega a todo el país.</h1>
            <p className="mt-4 max-w-2xl text-[var(--on-navy-soft)]">Buscamos capacitadores expertos para crear y dictar cursos tecnológicos en Amser Global Tech. Tú pones el conocimiento; nosotros, la plataforma, los participantes y la gestión de cobros.</p>
          </div>
        </section>
        <section className="container-x grid gap-4 py-12 md:grid-cols-3">
          {MODELS.map(([i, t, d]) => <div key={t} className="card card-pad"><div className="text-3xl">{i}</div><h2 className="mt-2 font-display font-bold">{t}</h2><p className="mt-1 text-sm text-soft">{d}</p></div>)}
        </section>
        <section className="container-x grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-2xl font-extrabold">Postula como capacitador</h2>
            <p className="mb-6 mt-1 text-sm text-soft">Revisamos cada postulación personalmente. Te llamaremos antes de habilitar tu acceso.</p>
            <TrainerForm />
          </div>
          <aside className="lg:pt-14">
            <h3 className="font-display text-lg font-bold">¿Cómo funciona?</h3>
            <ol className="mt-4 space-y-4">
              {STEPS.map((t, i) => (
                <li key={t} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-bright to-green text-sm font-bold text-white">{i + 1}</span><span className="pt-1 text-sm text-soft">{t}</span></li>
              ))}
            </ol>
          </aside>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
