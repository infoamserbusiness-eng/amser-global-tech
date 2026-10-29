import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";
import { ICONS } from "@/components/ui";
import { DEMO } from "@/lib/mode";
import { unreadCount } from "@/lib/unread";

export default async function Layout({ children }: LayoutProps<"/estudiante">) {
  const user = await requireRole("student");
  const unread = await unreadCount();
  const all = [
    { href: "/estudiante", label: "Inicio", icon: ICONS.home },
    { href: "/estudiante/avisos", label: "Avisos", icon: ICONS.inbox, badge: unread },
    { href: "/estudiante/perfil", label: "Mi perfil", icon: ICONS.users },
    { href: "/estudiante/catalogo", label: "Catálogo", icon: ICONS.tag },
    { href: "/estudiante/cursos", label: "Mis cursos", icon: ICONS.book },
    { href: "/estudiante/calificaciones", label: "Calificaciones", icon: ICONS.grade },
    { href: "/estudiante/pagos", label: "Mis pagos", icon: ICONS.money },
    { href: "/estudiante/certificados", label: "Certificados", icon: ICONS.cap },
  ];
  const nav = DEMO ? all.filter((n) => n.href !== "/estudiante/perfil" && n.href !== "/estudiante/avisos") : all;
  return <PortalShell nav={nav} userName={user.name} roleLabel="Participante" accent="#4da3ff">{children}</PortalShell>;
}
