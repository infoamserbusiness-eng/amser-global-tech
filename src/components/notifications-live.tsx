import Link from "next/link";
import { markAllRead } from "@/lib/notify-actions";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/data";
import { Empty, PageTitle } from "./ui";

const ICON: Record<string, string> = { sale: "💰", new_participant: "🧑‍🎓", course_sold: "🎉" };

// Avisos automáticos del usuario (ventas, nuevos participantes, pagos). Producción.
export async function NotificationsLive({ path }: { path: string }) {
  const { data } = await (await supabaseServer()).from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <PageTitle title="Avisos" sub="Notificaciones automáticas de tu actividad." action={unread > 0 ? <form action={markAllRead.bind(null, path)}><button className="btn btn-ghost btn-sm">Marcar todo como leído</button></form> : undefined} />
      {(data ?? []).length === 0 && <Empty>No tienes avisos todavía. Aparecerán aquí cuando haya ventas, nuevos participantes o pagos.</Empty>}
      <div className="space-y-2">
        {data?.map((n) => (
          <article key={n.id} className={`card card-pad flex gap-3 ${n.read_at ? "opacity-70" : "border-l-4"}`} style={n.read_at ? undefined : { borderLeftColor: "#f59e0b" }}>
            <span className="text-2xl" aria-hidden>{ICON[n.kind] ?? "🔔"}</span>
            <div className="min-w-0 flex-1">
              <b>{n.title}</b>
              {n.body && <p className="mt-0.5 text-sm text-soft">{n.body}</p>}
              <p className="mt-1 text-xs text-soft">{fmtDate(n.created_at)}{n.link && <> · <Link href={n.link} className="font-semibold text-blue hover:underline">Ver</Link></>}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
