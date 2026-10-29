import { SiteFooter, SiteHeader } from "@/components/site";
import { CourseGrid } from "@/components/CourseGrid";
import { getSiteCourses } from "@/lib/catalog";
import { DEMO } from "@/lib/mode";

export const metadata = { title: "Cursos — Amser Global Tech" };

export default async function Cursos() {
  const site = DEMO ? undefined : await getSiteCourses();
  return (
    <>
      <SiteHeader />
      <main className="container-x flex-1 py-12">
        <p className="eyebrow">Catálogo</p>
        <h1 className="mt-2 text-4xl font-extrabold">Cursos y programas</h1>
        <p className="mb-8 mt-2 max-w-2xl text-soft">Filtra por área o busca por tema. Cada curso incluye acceso al campus virtual, laboratorios y certificado.</p>
        <CourseGrid filters courses={site} />
      </main>
      <SiteFooter />
    </>
  );
}
