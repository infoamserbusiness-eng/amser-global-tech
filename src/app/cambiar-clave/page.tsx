import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/data";
import { Logo } from "@/components/site";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Crea tu contraseña — Amser Global Tech" };

export default async function CambiarClave() {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");
  if (!user.mustChange) redirect(ROLE_HOME[user.role]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-6"><Logo height={90} /></div>
      <h1 className="text-2xl font-extrabold">Crea tu contraseña</h1>
      <p className="mb-6 mt-2 text-sm text-soft">Hola, {user.name.split(" ")[0]}. Por seguridad debes reemplazar la contraseña temporal antes de entrar a tu portal. Después te pediremos ingresar de nuevo con tu usuario y tu nueva contraseña.</p>
      <ChangePasswordForm userId={user.id} docId={user.docId} email={user.email} />
      <a href="/salir" className="mt-6 text-center text-sm text-soft hover:text-blue">Cancelar y salir</a>
    </main>
  );
}
