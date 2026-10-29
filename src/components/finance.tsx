"use client";

import { Fragment, useState } from "react";
import { courseBySlug, fmtDate, fmtUSD, type PayMethod } from "@/lib/data";
import { PLAN_LABEL, addPayment, addPayout, findUser, rateOf, setTeacherRate, setTeacherShare, shareOf, studentAccounts, teacherAccounts, useDemo, validatePayment, type PayStatus } from "@/lib/store";
import { Avatar, Empty, PageTitle, Stat } from "./ui";

const METHODS: PayMethod[] = ["transferencia", "tarjeta", "efectivo"];
const STATUS_BADGE: Record<PayStatus, string> = { pagado: "badge badge-green", parcial: "badge badge-warn", pendiente: "badge badge-red" };
const STATUS_LABEL: Record<PayStatus, string> = { pagado: "Pagado", parcial: "Parcial", pendiente: "Pendiente" };

// Formulario en línea para registrar un pago/abono (cobro a estudiante o pago a capacitador).
function PayForm({ balance, onSave, onClose, label }: { balance: number; onSave: (amount: number, method: PayMethod, note: string) => void; onClose: () => void; label: string }) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState<PayMethod>("transferencia");
  const [note, setNote] = useState("");
  return (
    <form
      className="grid gap-2 bg-surface-2 p-3 sm:grid-cols-[120px_160px_1fr_auto_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.min(balance, Math.max(0, Number(amount)));
        if (n > 0) onSave(n, method, note);
        onClose();
      }}
    >
      <div><label className="label">Monto (USD)</label><input className="input" type="number" min={1} max={balance} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div><label className="label">Método</label><select className="select" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>{METHODS.map((m) => <option key={m} className="capitalize">{m}</option>)}</select></div>
      <div><label className="label">Nota / n.º de comprobante</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <button className="btn btn-green btn-sm">{label}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
    </form>
  );
}

export function AdminStudentPayments() {
  const s = useDemo();
  const [filter, setFilter] = useState<"todos" | PayStatus>("todos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const all = studentAccounts(s);
  const billed = all.reduce((t, a) => t + a.price, 0);
  const collected = all.reduce((t, a) => t + a.paid, 0);
  const rows = all
    .filter((a) => filter === "todos" || a.status === filter)
    .filter((a) => !q.trim() || `${findUser(s, a.studentId)?.name ?? ""} ${courseBySlug(a.courseSlug)?.title ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageTitle title="Pagos de estudiantes" sub="Control de cobros por matrícula: lo facturado, lo pagado y el saldo." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Facturado" value={fmtUSD(billed)} hint={`${all.length} matrículas`} tone="blue" />
        <Stat label="Cobrado" value={fmtUSD(collected)} tone="green" />
        <Stat label="Por cobrar" value={fmtUSD(billed - collected)} tone="amber" />
        <Stat label="Cobranza" value={`${billed ? Math.round((collected / billed) * 100) : 0}%`} hint={`${all.filter((a) => a.status === "pendiente").length} sin pago`} tone="violet" />
      </div>

      {s.payments.some((p) => p.status === "por_validar") && (
        <section className="card card-pad mb-6 border-l-4" style={{ borderLeftColor: "#f59e0b" }}>
          <h2 className="mb-3 font-bold">Transferencias por validar</h2>
          <ul className="divide-y divide-line text-sm">
            {s.payments.filter((p) => p.status === "por_validar").map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><b>{findUser(s, p.studentId)?.name}</b> · {courseBySlug(p.courseSlug)?.title}<span className="block text-xs text-soft">{fmtDate(p.at)} · {p.note ?? "sin comprobante"}</span></span>
                <span className="flex items-center gap-3"><b>{fmtUSD(p.amount)}</b><button className="btn btn-green btn-sm" onClick={() => validatePayment(p.id)}>Validar y habilitar</button></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["todos", "pendiente", "parcial", "pagado"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`tab capitalize ${filter === f ? "on" : "border border-line bg-white"}`}>{f}</button>
          ))}
        </div>
        <input className="input md:max-w-xs" placeholder="Buscar estudiante o curso…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
      </div>

      {rows.length === 0 && <Empty>No hay matrículas con ese filtro.</Empty>}
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Estudiante</th><th>Curso</th><th>Precio</th><th>Pagado</th><th>Saldo</th><th>Plan</th><th>Próx. cuota</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {rows.map((a) => {
              const k = `${a.studentId}:${a.courseSlug}`;
              const u = findUser(s, a.studentId);
              return (
                <Fragment key={k}>
                  <tr>
                    <td><span className="flex items-center gap-2"><Avatar name={u?.name ?? "?"} size={26} />{u?.name}</span></td>
                    <td className="min-w-48">{courseBySlug(a.courseSlug)?.title}</td>
                    <td>{fmtUSD(a.price)}</td>
                    <td className="font-semibold">{fmtUSD(a.paid)}</td>
                    <td className={a.balance > 0 ? "font-semibold text-warn" : "text-soft"}>{fmtUSD(a.balance)}</td>
                    <td className="whitespace-nowrap text-soft">{a.plan ? PLAN_LABEL[a.plan] : "Sin elegir"}</td>
                    <td className="whitespace-nowrap text-soft">{a.next ? `${fmtUSD(a.next.amount)} · ${a.next.due ? fmtDate(a.next.due) : "al inscribirse"}` : "—"}{a.overdue && <span className="badge badge-red ml-1">Vencida</span>}</td>
                    <td><span className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</span></td>
                    <td className="text-right">{a.balance > 0 && <button className="btn btn-primary btn-sm" onClick={() => setOpen(open === k ? null : k)}>Registrar pago</button>}</td>
                  </tr>
                  {open === k && (
                    <tr><td colSpan={9} className="!p-0">
                      <PayForm balance={a.balance} label="Guardar cobro" onClose={() => setOpen(null)} onSave={(amount, method, note) => addPayment({ studentId: a.studentId, courseSlug: a.courseSlug, amount, method, note })} />
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 font-bold">Últimos movimientos</h2>
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Estudiante</th><th>Curso</th><th>Método</th><th>Nota</th><th className="text-right">Monto</th></tr></thead>
          <tbody>
            {[...s.payments].filter((p) => p.status !== "por_validar").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8).map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap text-soft">{fmtDate(p.at)}</td>
                <td>{findUser(s, p.studentId)?.name}</td>
                <td>{courseBySlug(p.courseSlug)?.title}</td>
                <td className="capitalize">{p.method}</td>
                <td className="text-soft">{p.note ?? "—"}</td>
                <td className="text-right font-semibold text-ok">+{fmtUSD(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminTeacherPayouts() {
  const s = useDemo();
  const [open, setOpen] = useState<string | null>(null);
  const accts = teacherAccounts(s);
  const commitment = accts.reduce((t, a) => t + a.total, 0);
  const paid = accts.reduce((t, a) => t + a.paid, 0);
  const sa = studentAccounts(s);
  const collected = sa.reduce((t, a) => t + a.paid, 0);
  const billed = sa.reduce((t, a) => t + a.price, 0);
  const teachers = Array.from(new Set(accts.map((a) => a.teacherId)));

  return (
    <>
      <PageTitle title="Pagos a capacitadores" sub="Honorarios por curso = horas dictadas × tarifa por hora acordada con cada capacitador." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Honorarios y comisiones" value={fmtUSD(commitment)} tone="blue" />
        <Stat label="Pagado a capacitadores" value={fmtUSD(paid)} tone="green" />
        <Stat label="Por pagar" value={fmtUSD(commitment - paid)} tone="amber" />
        <Stat label="Flujo de caja" value={fmtUSD(collected - paid)} hint={`cobrado − pagado a capacitadores · proyectado ${fmtUSD(billed - commitment)}`} tone="violet" />
      </div>

      <h2 className="mb-3 font-bold">Tarifa por hora</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teachers.map((id) => {
          const u = findUser(s, id);
          return (
            <div key={id} className="card card-pad">
              <span className="flex items-center gap-2 text-sm font-semibold"><Avatar name={u?.name ?? "?"} size={28} />{u?.title} {u?.name}</span>
              <label className="label mt-3" htmlFor={`r-${id}`}>USD por hora</label>
              <input id={`r-${id}`} type="number" min={0} className="input" defaultValue={rateOf(s, id)} onBlur={(e) => setTeacherRate(id, Math.max(0, Number(e.target.value)))} />
              <label className="label mt-3" htmlFor={`sh-${id}`}>% de ventas (cursos propios)</label>
              <input id={`sh-${id}`} type="number" min={0} max={100} className="input" defaultValue={shareOf(s, id)} onBlur={(e) => setTeacherShare(id, Number(e.target.value))} />
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 font-bold">Honorarios por curso</h2>
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Capacitador</th><th>Curso</th><th>Horas / ventas</th><th>Tarifa / %</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {accts.map((a) => {
              const k = `${a.teacherId}:${a.courseSlug}`;
              const u = findUser(s, a.teacherId);
              return (
                <Fragment key={k}>
                  <tr>
                    <td><span className="flex items-center gap-2"><Avatar name={u?.name ?? "?"} size={26} />{u?.name}</span></td>
                    <td className="min-w-48">{courseBySlug(a.courseSlug)?.title}</td>
                    <td>{a.kind === "comision" ? `Ventas ${fmtUSD(a.sold)}` : `${a.hours} h`}</td>
                    <td>{a.kind === "comision" ? `${a.share}%` : `${fmtUSD(a.rate)}/h`}</td>
                    <td className="font-semibold">{fmtUSD(a.total)}</td>
                    <td>{fmtUSD(a.paid)}</td>
                    <td className={a.balance > 0 ? "font-semibold text-warn" : "text-soft"}>{fmtUSD(a.balance)}</td>
                    <td><span className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</span></td>
                    <td className="text-right">{a.balance > 0 && <button className="btn btn-primary btn-sm" onClick={() => setOpen(open === k ? null : k)}>Registrar pago</button>}</td>
                  </tr>
                  {open === k && (
                    <tr><td colSpan={9} className="!p-0">
                      <PayForm balance={a.balance} label="Guardar pago" onClose={() => setOpen(null)} onSave={(amount, method, note) => addPayout({ teacherId: a.teacherId, courseSlug: a.courseSlug, amount, method, note })} />
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 font-bold">Pagos realizados</h2>
      <div className="card tblwrap">
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Capacitador</th><th>Curso</th><th>Método</th><th>Nota</th><th className="text-right">Monto</th></tr></thead>
          <tbody>
            {s.payouts.length === 0 && <tr><td colSpan={6} className="text-center text-soft">Aún no hay pagos registrados.</td></tr>}
            {[...s.payouts].sort((a, b) => b.at.localeCompare(a.at)).map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap text-soft">{fmtDate(p.at)}</td>
                <td>{findUser(s, p.teacherId)?.name}</td>
                <td>{courseBySlug(p.courseSlug)?.title}</td>
                <td className="capitalize">{p.method}</td>
                <td className="text-soft">{p.note ?? "—"}</td>
                <td className="text-right font-semibold text-danger">−{fmtUSD(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
