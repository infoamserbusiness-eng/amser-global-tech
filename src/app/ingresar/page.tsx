import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/data";
import { Logo } from "@/components/site";
import { Globe } from "@/components/Globe";
import { DEMO } from "@/lib/mode";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar — Amser Global Tech" };

export default async function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const sp = await searchParams;
  const next = String(sp.next ?? "");

  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <section className="flex flex-col justify-center bg-white px-6 py-10 md:px-16">
        <Link href="/" className="mb-8 inline-block"><Logo height={120} /></Link>
        <h1 className="text-3xl font-extrabold">Bienvenido al campus</h1>
        <p className="mb-6 mt-2 text-soft">Ingresa con tu usuario (tu cédula) y tu contraseña. Te llevaremos a tu portal según tu rol.</p>
        {!DEMO && <p className="mb-4 max-w-md rounded-xl bg-surface-2 p-3 text-sm text-soft">Los portales de participantes y capacitadores se habilitan después de la admisión. Si ya fuiste admitido, usa el usuario y la contraseña temporal que te enviamos por correo.</p>}
        <div className="max-w-md"><LoginForm next={next} demo={DEMO} changed={sp.clave === "cambiada"} /></div>
        <Link href="/" className="mt-8 text-sm text-soft hover:text-blue">← Volver al sitio</Link>
      </section>
      <section className="relative hidden items-center justify-center overflow-hidden bg-navy md:flex">
        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(50% 50% at 50% 45%, rgba(31,122,224,.45), transparent 70%)" }} />
        <div className="relative w-full max-w-md px-6 text-center text-white">
          <Globe />
          <p className="mt-6 font-display text-xl font-bold">Aprende. Conecta. Transforma.</p>
        </div>
      </section>
    </main>
  );
}
