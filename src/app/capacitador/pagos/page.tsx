import { redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { supabaseServer } from "@/lib/supabase/server";
import { saveBank } from "./actions";

// Datos de pago del capacitador (producción): cuenta bancaria donde se le transferirá el valor de sus cursos vendidos.
export default async function Page({ searchParams }: PageProps<"/capacitador/pagos">) {
  const user = await requireRole("teacher");
  if (DEMO) redirect("/capacitador/ventas");
  const sp = await searchParams;
  const { data: b } = await (await supabaseServer()).from("trainer_bank_accounts").select("*").eq("profile_id", user.id).maybeSingle();
  return (
    <>
      <PageTitle title="Datos de pago" sub="Cuenta bancaria donde Amser te transferirá el valor de tus cursos vendidos." />
      {typeof sp.msg === "string" && <p role="status" className="mb-4 rounded-lg bg-[rgba(34,178,76,.12)] p-3 text-sm text-ok">✔ {sp.msg}</p>}
      {typeof sp.err === "string" && <p role="alert" className="mb-4 rounded-lg bg-[rgba(192,57,43,.1)] p-3 text-sm text-danger">⚠ {sp.err}</p>}
      {!b && <p className="mb-4 rounded-lg bg-[rgba(245,158,11,.14)] p-3 text-sm text-warn">Aún no registraste tu cuenta bancaria. La necesitamos para pagarte cuando se venda tu curso.</p>}
      <form action={saveBank} className="card card-pad grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="b-bank">Banco</label><input id="b-bank" name="bank" className="input" required minLength={2} maxLength={80} defaultValue={b?.bank} placeholder="Ej.: Banco Pichincha" /></div>
        <div><label className="label" htmlFor="b-type">Tipo de cuenta</label><select id="b-type" name="type" className="select" defaultValue={b?.account_type ?? "ahorros"}><option value="ahorros">Ahorros</option><option value="corriente">Corriente</option></select></div>
        <div><label className="label" htmlFor="b-num">Número de cuenta</label><input id="b-num" name="number" inputMode="numeric" className="input" required pattern="\d{6,30}" defaultValue={b?.account_number} /></div>
        <div><label className="label" htmlFor="b-holder">Nombre del titular</label><input id="b-holder" name="holder" className="input" required minLength={2} maxLength={120} defaultValue={b?.holder_name} /></div>
        <div><label className="label" htmlFor="b-doc">Cédula o RUC del titular</label><input id="b-doc" name="doc" className="input" required minLength={5} maxLength={30} defaultValue={b?.holder_doc} /></div>
        <div className="sm:col-span-2"><button className="btn btn-primary">Guardar datos de pago</button>
          <p className="mt-3 text-xs text-soft">Por cada venta de tus cursos recibes el valor que propusiste al crearlos. Solo tú y la administración pueden ver estos datos.</p></div>
      </form>
    </>
  );
}
