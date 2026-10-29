"use client";

import { useState } from "react";
import { fmtDate, fmtUSD, type Course, type PayMethod, type PlanId } from "@/lib/data";
import { PLAN_LABEL, checkout, plansFor, schedule } from "@/lib/store";

const PLAN_DESC: Record<PlanId, (c: Course) => string> = {
  contado: (c) => `Pagas ${fmtUSD(c.price)} hoy y listo.`,
  anticipo: () => "Pagas el 50% hoy y el 50% restante 30 días antes de que termine el curso.",
  mensual: (c) => `Divides el valor en ${c.months ?? 6} cuotas mensuales, la primera hoy.`,
};

// Pantalla de pago: el participante elige su plan y método antes de acceder al campus.
export function Checkout({ course, studentId }: { course: Course; studentId: string }) {
  const plans = plansFor(course);
  const [plan, setPlan] = useState<PlanId>(plans[plans.length - 1] === "mensual" ? "anticipo" : plans[0]);
  const [method, setMethod] = useState<PayMethod>("tarjeta");
  const [ref, setRef] = useState("");
  const items = schedule(course, plan);
  const today = items[0].amount;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        checkout({ studentId, courseSlug: course.slug, amount: today, method, plan, note: method === "transferencia" ? `Comprobante: ${ref}` : undefined });
      }}
    >
      <div className="card card-pad border-l-4" style={{ borderLeftColor: "var(--green)" }}>
        <h2 className="font-display text-lg font-bold">Completa tu pago para acceder al curso</h2>
        <p className="mt-1 text-sm text-soft">
          {course.kind === "rapido"
            ? "Este es un curso pregrabado: se paga el 100% al instante y el acceso se habilita al confirmarse el pago."
            : "Elige cómo quieres pagar. El acceso se habilita al confirmarse tu primer pago."}
        </p>
      </div>

      <fieldset>
        <legend className="mb-3 font-bold">1. Forma de pago</legend>
        <div className={`grid gap-3 ${plans.length > 1 ? "md:grid-cols-3" : ""}`}>
          {plans.map((p) => {
            const sch = schedule(course, p);
            const on = plan === p;
            return (
              <label key={p} className={`card cursor-pointer p-4 transition ${on ? "!border-blue-bright shadow-[0_0_0_3px_rgba(31,122,224,.18)]" : "hover:bg-surface-2"}`}>
                <input type="radio" name="plan" className="sr-only" checked={on} onChange={() => setPlan(p)} />
                <div className="flex items-center justify-between"><b className="font-display">{PLAN_LABEL[p]}</b>{on && <span className="badge badge-blue">Elegido</span>}</div>
                <p className="mt-1 text-xs text-soft">{PLAN_DESC[p](course)}</p>
                <div className="mt-3 font-display text-xl font-extrabold text-blue">{fmtUSD(sch[0].amount)}<span className="text-xs font-normal text-soft"> hoy</span></div>
                {sch.length > 1 && <div className="text-xs text-soft">{sch.length - 1} pago{sch.length > 2 ? "s" : ""} más</div>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <section className="card card-pad">
        <h3 className="mb-3 font-bold">Calendario de pagos</h3>
        <ul className="divide-y divide-line text-sm">
          {items.map((i) => (
            <li key={i.n} className="flex justify-between py-2"><span>{i.label}<span className="ml-2 text-xs text-soft">{i.due ? `vence ${fmtDate(i.due)}` : "al inscribirte"}</span></span><b>{fmtUSD(i.amount)}</b></li>
          ))}
          <li className="flex justify-between pt-2 font-bold"><span>Total</span><span>{fmtUSD(course.price)}</span></li>
        </ul>
      </section>

      <fieldset>
        <legend className="mb-3 font-bold">2. Método de pago</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {([["tarjeta", "Tarjeta de crédito/débito", "Acceso inmediato al confirmarse."], ["transferencia", "Transferencia bancaria", "Sube tu n.º de comprobante; validamos en menos de 24 h."]] as const).map(([m, t, d]) => (
            <label key={m} className={`card cursor-pointer p-4 ${method === m ? "!border-blue-bright shadow-[0_0_0_3px_rgba(31,122,224,.18)]" : "hover:bg-surface-2"}`}>
              <input type="radio" name="method" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
              <b>{t}</b><p className="mt-1 text-xs text-soft">{d}</p>
            </label>
          ))}
        </div>
        {method === "transferencia" && (
          <div className="card card-pad mt-3 space-y-3">
            <p className="text-sm text-soft">Datos bancarios: <b>(pendientes de definir por la institución)</b></p>
            <div><label className="label" htmlFor="ref">N.º de comprobante</label><input id="ref" className="input" required value={ref} onChange={(e) => setRef(e.target.value)} /></div>
          </div>
        )}
        {method === "tarjeta" && <p className="mt-3 text-xs text-soft">Modo demostración: la pasarela de tarjetas se conectará en la Fase 2; aquí el pago se simula como aprobado.</p>}
      </fieldset>

      <button className="btn btn-green w-full sm:w-auto">{method === "tarjeta" ? `Pagar ${fmtUSD(today)} y acceder` : `Enviar comprobante de ${fmtUSD(today)}`}</button>
    </form>
  );
}
