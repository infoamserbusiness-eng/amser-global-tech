"use client";

import { useState } from "react";
import { ROLE_LABEL, fmtDate, fmtUSD, courseBySlug, type Role } from "@/lib/data";
import { addUser, allUsers, courses as withOverrides, enrollments, setCoursePrice, studentAccounts, setCoursePublished, setUserActive, useDemo } from "@/lib/store";
import { Avatar, Empty, PageTitle, Stat } from "./ui";

export function AdminHome() {
  const s = useDemo();
  const users = allUsers(s);
  const cs = withOverrides(s);
  const enr = enrollments(s);
  const accts = studentAccounts(s);
  const collected = accts.reduce((t, a) => t + a.paid, 0);
  const receivable = accts.reduce((t, a) => t + a.balance, 0);
  const newLeads = s.leads.filter((l) => l.status === "nuevo" || l.status === "contactado").length;
  const byRole = (["student", "teacher", "coordinator", "admin"] as Role[]).map((r) => [r, users.filter((u) => u.role === r).length] as const);
  return (
    <>
      <PageTitle title="Panel de administración" sub="Visión general de la institución." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Usuarios" value={users.length} tone="blue" />
        <Stat label="Matrículas" value={enr.length} tone="green" />
        <Stat label="Cobrado" value={fmtUSD(collected)} hint={`${fmtUSD(receivable)} por cobrar`} tone="violet" />
        <Stat label="Registros por atender" value={newLeads} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="mb-3 font-bold">Usuarios por rol</h2>
          <ul className="space-y-2 text-sm">{byRole.map(([r, n]) => <li key={r} className="flex justify-between"><span>{ROLE_LABEL[r]}</span><b>{n}</b></li>)}</ul>
        </section>
        <section className="card card-pad">
          <h2 className="mb-3 font-bold">Cursos publicados en el sitio</h2>
          <ul className="space-y-2 text-sm">{cs.map((c) => <li key={c.slug} className="flex items-center justify-between gap-2"><span className="truncate">{c.title}</span>{c.published ? <span className="badge badge-green">Publicado</span> : <span className="badge">Oculto</span>}</li>)}</ul>
        </section>
      </div>
    </>
  );
}

export function AdminUsers() {
  const s = useDemo();
  const users = allUsers(s);
  const [f, setF] = useState<{ name: string; email: string; role: Role }>({ name: "", email: "", role: "student" });
  return (
    <>
      <PageTitle title="Usuarios y roles" sub="Crea cuentas y controla quién puede ingresar." />
      <form className="card card-pad mb-6 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); addUser(f); setF({ name: "", email: "", role: "student" }); }}>
        <div><label className="label" htmlFor="un">Nombre</label><input id="un" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="ue">Correo</label><input id="ue" type="email" className="input" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label" htmlFor="ur">Rol</label><select id="ur" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
        <button className="btn btn-primary">Crear usuario</button>
      </form>
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><span className="flex items-center gap-2"><Avatar name={u.name} size={28} /><span><b className="block">{u.name}</b><span className="text-xs text-soft">{u.email}</span></span></span></td>
                <td><span className="badge badge-blue">{ROLE_LABEL[u.role]}</span></td>
                <td>{u.active ? <span className="badge badge-green">Activo</span> : <span className="badge badge-red">Desactivado</span>}</td>
                <td className="text-right">{u.role !== "admin" && <button className="btn btn-ghost btn-sm" onClick={() => setUserActive(u.id, !u.active)}>{u.active ? "Desactivar" : "Activar"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminCourses() {
  const s = useDemo();
  return (
    <>
      <PageTitle title="Cursos del sitio" sub="Decide qué cursos se muestran en el sitio web y su precio." />
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Curso</th><th>Inicio</th><th>Precio (USD)</th><th>En el sitio</th></tr></thead>
          <tbody>
            {withOverrides(s).map((c) => (
              <tr key={c.slug}>
                <td className="font-semibold">{c.title}</td>
                <td className="whitespace-nowrap text-soft">{fmtDate(c.start)}</td>
                <td><input type="number" min={0} className="input !w-28" defaultValue={c.price} onBlur={(e) => setCoursePrice(c.slug, Math.max(0, Number(e.target.value)))} aria-label={`Precio de ${c.title}`} /></td>
                <td><button role="switch" aria-checked={c.published} onClick={() => setCoursePublished(c.slug, !c.published)} className={`btn btn-sm ${c.published ? "btn-green" : "btn-ghost"}`}>{c.published ? "Publicado" : "Oculto"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-soft">Los cambios se reflejan al instante en el catálogo público (/cursos).</p>
    </>
  );
}
