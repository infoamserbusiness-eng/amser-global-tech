"use client";

import Link from "next/link";
import { useState } from "react";
import { AREAS, fmtDate, fmtUSD, userById, type Course } from "@/lib/data";
import { courses as withOverrides, useDemo } from "@/lib/store";

export function CourseCard({ c }: { c: Course }) {
  const t = userById(c.teacherId);
  return (
    <Link href={`/cursos/${c.slug}`} className="card lift group flex flex-col overflow-hidden">
      <div className="relative h-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.color}, #0a1730)` }}>
        <svg className="absolute -right-6 -top-6 h-40 w-40 opacity-25" viewBox="0 0 100 100" fill="none" stroke="#fff"><circle cx="50" cy="50" r="40" /><ellipse cx="50" cy="50" rx="40" ry="14" /><ellipse cx="50" cy="50" rx="14" ry="40" /></svg>
        <span className="absolute left-4 top-4 badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>{c.area}</span>
        {c.status === "proximamente" && <span className="badge badge-warn absolute right-4 top-4">Próximamente</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-bold leading-snug group-hover:text-blue">{c.title}</h3>
        <p className="line-clamp-3 text-sm text-soft">{c.summary}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          <span className="badge">{c.level}</span><span className="badge">{c.modality}</span><span className="badge">{c.kind === "rapido" ? `${c.hours} h` : `${c.months} meses`}</span><span className="badge badge-green">{c.kind === "rapido" ? "Pago único" : "Plan de pagos"}</span>
        </div>
        <div className="flex items-end justify-between border-t border-line pt-3 text-sm">
          <div><div className="text-[11px] uppercase tracking-wide text-soft">Inicio</div><div className="font-semibold">{fmtDate(c.start)}</div></div>
          <div className="text-right"><div className="text-[11px] text-soft">{t ? `${t.title ?? ""} ${t.name}`.trim() : c.teacherName}</div><div className="text-xs font-semibold text-blue">Precio al registrarte</div></div>
        </div>
      </div>
    </Link>
  );
}

// `courses`: lista real (producción, desde la base de datos). Sin ella se usan los cursos del demo.
export function CourseGrid({ limit, filters = false, courses }: { limit?: number; filters?: boolean; courses?: Course[] }) {
  const s = useDemo();
  const [area, setArea] = useState("Todos");
  const [q, setQ] = useState("");
  let list = courses ?? withOverrides(s).filter((c) => c.published);
  const none = !!courses && courses.length === 0;
  if (area !== "Todos") list = list.filter((c) => c.area === area);
  if (q.trim()) list = list.filter((c) => (c.title + c.summary + c.area).toLowerCase().includes(q.toLowerCase()));
  if (limit) list = list.slice(0, limit);

  return (
    <div>
      {filters && (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <button key={a} onClick={() => setArea(a)} className={`tab ${area === a ? "on" : "bg-white border border-line"}`}>{a}</button>
            ))}
          </div>
          <input className="input md:max-w-xs" placeholder="Buscar curso…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar curso" />
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => <CourseCard key={c.slug} c={c} />)}
      </div>
      {list.length === 0 && <p className="card card-pad text-center text-soft">{none ? "Muy pronto publicaremos nuestros primeros cursos. Mientras tanto, regístrate y te avisaremos." : "No hay cursos que coincidan con tu búsqueda."}</p>}
    </div>
  );
}
