import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";
import { ICONS } from "@/components/ui";
import { DEMO } from "@/lib/mode";
import { unreadCount } from "@/lib/unread";

export default async function Layout({ children }: LayoutProps<"/capacitador">) {
  const user = await requireRole("teacher");
  const unread = await unreadCount();
  const all = [
    { href: "/capacitador", label: "Inicio", icon: ICONS.home },
    { href: "/capacitador/avisos", label: "Avisos", icon: ICONS.inbox, badge: unread },
    { href: "/capacitador/perfil", label: "Mi perfil", icon: ICONS.users },
    { href: "/capacitador/cursos", label: "Mis cursos", icon: ICONS.book },
    { href: "/capacitador/pagos", label: "Datos de pago", icon: ICONS.wallet },
    { href: "/capacitador/clases", label: "Clases en vivo", icon: ICONS.cap },
    { href: "/capacitador/calificar", label: "Calificar", icon: ICONS.check },
    { href: "/capacitador/ventas", label: "Ventas y pagos", icon: ICONS.money },
  ];
  // Producción: panel, avisos, constructor de cursos y datos de pago. Clases, calificación y ventas se activan con participantes inscritos.
  const PROD = ["/capacitador", "/capacitador/avisos", "/capacitador/perfil", "/capacitador/cursos", "/capacitador/pagos"];
  const ONLY_PROD = ["/capacitador/avisos", "/capacitador/pagos", "/capacitador/perfil"];
  const nav = DEMO ? all.filter((n) => !ONLY_PROD.includes(n.href)) : all.filter((n) => PROD.includes(n.href));
  return <PortalShell nav={nav} userName={`${user.title ?? ""} ${user.name}`.trim()} roleLabel="Capacitador" accent="#3ed16a">{children}</PortalShell>;
}
