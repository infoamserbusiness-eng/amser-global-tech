import { SiteFooter, SiteHeader } from "@/components/site";
import { getSiteCourses } from "@/lib/catalog";
import { DEMO } from "@/lib/mode";
import { RegistroForm } from "./RegistroForm";

export const metadata = { title: "Registro de participantes — Amser Global Tech" };

const STEPS = [
  ["Te registras", "Completas este formulario con tus datos y el curso que te interesa."],
  ["Llamada de admisión", "Admisiones te llama para resolver tus dudas sobre el curso y validar tu admisión."],
  ["Habilitamos tu plataforma", "Recibes tus credenciales y entras a tu plataforma de participante."],
  ["Eliges y pagas", "Ves toda la oferta, eliges tu curso y el plan de pago que más te convenga."],
];

export default async function Registro({ searchParams }: PageProps<"/registro">) {
  const curso = String((await searchParams).curso ?? "");
  const options = DEMO ? undefined : (await getSiteCourses()).map((c) => ({ slug: c.slug, title: c.title }));
  return (
    <>
      <SiteHeader />
      <main className="container-x grid flex-1 gap-10 py-12 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="eyebrow">Admisiones</p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Regístrate como participante</h1>
          <p className="mb-8 mt-2 max-w-xl text-soft">El primer paso para estudiar con nosotros. Tu registro lo revisa el equipo de admisiones, que se comunicará contigo por teléfono.</p>
          <RegistroForm curso={curso} options={options} />
        </div>
        <aside className="lg:pt-24">
          <h2 className="font-display text-lg font-bold">¿Cómo funciona?</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-bright to-green text-sm font-bold text-white">{i + 1}</span>
                <span><b className="block text-sm">{t}</b><span className="text-sm text-soft">{d}</span></span>
              </li>
            ))}
          </ol>
        </aside>
      </main>
      <SiteFooter />
    </>
  );
}
