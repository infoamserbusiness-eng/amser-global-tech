import type { ReactNode } from "react";

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-soft">{sub}</p>}</div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "blue" }: { label: string; value: ReactNode; hint?: string; tone?: "blue" | "green" | "amber" | "violet" }) {
  const c = { blue: "#1f7ae0", green: "#22b24c", amber: "#f59e0b", violet: "#7c3aed" }[tone];
  return (
    <div className="card relative overflow-hidden p-4">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: c }} />
      <div className="text-xs font-semibold uppercase tracking-wide text-soft">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-soft">{hint}</div>}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${value}%` }} /></div>;
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue to-green font-display font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>{name[0]}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card card-pad text-center text-sm text-soft">{children}</div>;
}

export const ICONS = {
  home: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zm0 14a2 2 0 012-2h13",
  grade: "M9 12l2 2 4-4M12 3l2.5 2H18v3.5L20 11l-2 2.5V17h-3.5L12 19l-2.5-2H6v-3.5L4 11l2-2.5V5h3.5L12 3z",
  users: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1m17 0v-1a4 4 0 00-3-3.9M14 4.1a4 4 0 010 7.8M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  check: "M5 13l4 4L19 7",
  chart: "M4 19V9m5 10V5m5 14v-7m5 7V8",
  inbox: "M4 13l2-8h12l2 8v6H4v-6zm0 0h5l1 2h4l1-2h5",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 00-2-1.2L14.6 3h-4l-.4 2.6a7.5 7.5 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5a7.4 7.4 0 000 2.4l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  cap: "M2 9l10-5 10 5-10 5L2 9zm4 3v5c0 1 3 3 6 3s6-2 6-3v-5",
  tag: "M3 12V4h8l10 10-8 8L3 12zm5-5h.01",
  money: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  wallet: "M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h15V9H5a2 2 0 01-2-2zm13 5h2",
  mail:"M3 6h18v12H3V6zm0 0l9 7 9-7",
} as const;
