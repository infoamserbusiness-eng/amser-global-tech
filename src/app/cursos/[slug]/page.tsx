import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site";
import { getSiteCourse } from "@/lib/catalog";
import { courseBySlug } from "@/lib/data";
import { DEMO } from "@/lib/mode";
import { CourseDetail } from "./CourseDetail";

export async function generateMetadata({ params }: PageProps<"/cursos/[slug]">) {
  const { slug } = await params;
  const c = DEMO ? courseBySlug(slug) : await getSiteCourse(slug);
  return { title: c ? `${c.title} — Amser Global Tech` : "Curso — Amser Global Tech" };
}

// Producción: solo existen los cursos publicados en el sitio (base de datos). Demo: cursos de ejemplo y los creados en el navegador.
export default async function CursoPage({ params }: PageProps<"/cursos/[slug]">) {
  const { slug } = await params;
  let course;
  if (!DEMO) {
    course = (await getSiteCourse(slug)) ?? undefined;
    if (!course) notFound();
  }
  return (
    <>
      <SiteHeader />
      <main className="flex-1"><CourseDetail slug={slug} course={course} /></main>
      <SiteFooter />
    </>
  );
}
