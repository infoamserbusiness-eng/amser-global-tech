"use client";

import { useActionState, useRef, useState } from "react";
import { login, type LoginState } from "./actions";
import { participantLogin } from "@/lib/store";

const QUICK = [
  { role: "Estudiante", email: "estudiante@amserglobal.tech", c: "#1f7ae0" },
  { role: "Capacitador", email: "capacitador@amserglobal.tech", c: "#22b24c" },
];

export function LoginForm({ next, demo, changed }: { next: string; demo: boolean; changed?: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [busy, setBusy] = useState(false);
  const bypass = useRef(false);
  const err = localErr || state.error;

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={async (e) => {
        // Demo: participantes/capacitadores habilitados por el admin (se guardan en el navegador, no en el servidor).
        if (!demo || bypass.current) return;
        e.preventDefault();
        const form = e.currentTarget;
        setLocalErr("");
        setBusy(true);
        const r = await participantLogin(email, password);
        setBusy(false);
        if (!r) {
          bypass.current = true; // no es un usuario del demo: sigue el login normal del servidor
          form.requestSubmit();
          bypass.current = false;
          return;
        }
        if (r.error || !r.user) return setLocalErr(r.error ?? "Usuario o contraseña incorrectos.");
        const u = r.user;
        document.cookie = `agt_session=x.${btoa(unescape(encodeURIComponent(JSON.stringify({ id: u.id, name: u.name, email: u.email, role: u.role, docId: u.docId, mustChange: r.mustChange }))))}; path=/; max-age=43200`;
        window.location.href = r.mustChange ? "/cambiar-clave" : u.role === "teacher" ? "/capacitador" : "/estudiante";
      }}
    >
      <input type="hidden" name="next" value={next} />
      {changed && <p role="status" className="rounded-lg bg-[rgba(34,178,76,.12)] px-3 py-2 text-sm text-ok">✔ Contraseña actualizada. Ingresa de nuevo con tu usuario y tu nueva contraseña.</p>}
      <div>
        <label className="label" htmlFor="email">Usuario (tu cédula) o correo</label>
        <input id="email" name="email" type="text" inputMode="email" className="input" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" className="input" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <p role="alert" className="rounded-lg bg-[rgba(192,57,43,.1)] px-3 py-2 text-sm text-danger">{err}</p>}
      <button className="btn btn-primary w-full" disabled={pending || busy}>{pending || busy ? "Ingresando…" : "Ingresar"}</button>

      {demo && (
      <div className="rounded-xl border border-dashed border-line p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Modo demostración · acceso rápido</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK.map((q) => (
            <button key={q.role} type="button" onClick={() => { setEmail(q.email); setPassword("demo1234"); }} className="btn btn-ghost btn-sm justify-start" style={{ borderLeft: `4px solid ${q.c}` }}>{q.role}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-soft">Pulsa un rol para rellenar el formulario y luego «Ingresar».</p>
      </div>
      )}
    </form>
  );
}
