"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { resetDemo } from "@/lib/store";
import { DEMO } from "@/lib/mode";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

export function PortalShell({ nav, userName, roleLabel, accent, children }: { nav: NavItem[]; userName: string; roleLabel: string; accent: string; children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === nav[0].href ? path === href : path === href || path.startsWith(href + "/"));

  return (
    <div className="portal">
      <aside className="portal-side">
        <div className="portal-brand mb-3 flex items-center gap-3 px-1">
          <Link href="/" className="rounded-lg bg-white p-1" aria-label="Ir al sitio"><Image src="/logo-mark.png" alt="Amser Global Tech" width={44} height={42} /></Link>
          <div className="leading-tight"><b className="block font-display text-sm text-white">Amser Global Tech</b><span className="text-xs" style={{ color: accent }}>{roleLabel}</span></div>
        </div>
        <nav className="portal-nav flex flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`portal-link ${isActive(n.href) ? "active" : ""}`} aria-current={isActive(n.href) ? "page" : undefined}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={n.icon} /></svg>
              {n.label}
              {!!n.badge && <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-navy" aria-label={`${n.badge} sin leer`}>{n.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="portal-foot mt-auto space-y-2 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className="grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold text-navy" style={{ background: accent }}>{userName[0]}</span>
            <span className="min-w-0 truncate text-sm text-white">{userName}</span>
          </div>
          <a href="/salir" className="portal-link">Cerrar sesión</a>
          {DEMO && <button onClick={() => { if (confirm("¿Restablecer los datos de demostración?")) resetDemo(); }} className="portal-link w-full text-left text-xs opacity-70">Restablecer demo</button>}
        </div>
        <a href="/salir" className="portal-link portal-exit">Salir</a>
      </aside>
      <main className="portal-main">{children}</main>
    </div>
  );
}
