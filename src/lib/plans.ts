// Planes de pago (funciones puras, usadas en producción por el servidor y por la pantalla de compra).
// Curso pregrabado = pago único; curso largo = contado | 50% + 50% (saldo 30 días antes de terminar) | cuotas mensuales.

export type PlanId = "contado" | "anticipo" | "mensual";
export const PLAN_LABEL: Record<PlanId, string> = { contado: "Pago total", anticipo: "50% + 50%", mensual: "Cuotas mensuales" };

export type Inst = { n: number; label: string; due: string | null; amount: number }; // due null = al inscribirse
type Basis = { kind: "rapido" | "largo"; price: number; start: string; weeks: number; months: number | null };

export const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400000).toISOString().slice(0, 10);
export const plansFor = (kind: "rapido" | "largo"): PlanId[] => (kind === "rapido" ? ["contado"] : ["contado", "anticipo", "mensual"]);
const cents = (n: number) => Math.round(n * 100) / 100;

export function schedule(c: Basis, plan: PlanId): Inst[] {
  if (plan === "contado" || c.kind === "rapido") return [{ n: 1, label: "Pago total", due: null, amount: cents(c.price) }];
  if (plan === "anticipo") {
    const half = cents(c.price / 2);
    return [
      { n: 1, label: "Anticipo 50%", due: null, amount: half },
      { n: 2, label: "Saldo 50% (30 días antes de terminar)", due: addDays(c.start, c.weeks * 7 - 30), amount: cents(c.price - half) },
    ];
  }
  const m = Math.max(2, c.months ?? 6);
  const each = Math.floor((c.price / m) * 100) / 100;
  return Array.from({ length: m }, (_, i) => ({
    n: i + 1,
    label: `Cuota ${i + 1} de ${m}`,
    due: i === 0 ? null : addDays(c.start, 30 * i),
    amount: i === m - 1 ? cents(c.price - each * (m - 1)) : each,
  }));
}

export type InstState = Inst & { state: "pagada" | "pendiente" | "vencida" };
// Los pagos confirmados se imputan a las cuotas en orden.
export function withState(list: Inst[], paid: number, today = new Date().toISOString().slice(0, 10)): InstState[] {
  let cum = 0;
  return list.map((i) => {
    cum = cents(cum + i.amount);
    return { ...i, state: paid + 0.001 >= cum ? "pagada" : i.due && i.due < today ? "vencida" : "pendiente" };
  });
}
