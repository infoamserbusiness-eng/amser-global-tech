"use client";

import { useActionState, useState } from "react";
import { DEMO } from "@/lib/mode";
import { changeDemoPassword } from "@/lib/store";
import { changePassword, type PwState } from "./actions";

export function ChangePasswordForm({ userId, docId, email }: { userId: string; docId?: string; email: string }) {
  const [state, action, pending] = useActionState<PwState, FormData>(changePassword, {});
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoErr, setDemoErr] = useState("");

  // Reglas visibles en vivo: el botón se habilita solo cuando todas se cumplen.
  const rules: [string, boolean][] = [
    ["Mínimo 8 caracteres", pw.length >= 8],
    ["Contiene letras", /[A-Za-z]/.test(pw)],
    ["Contiene números", /\d/.test(pw)],
    ["Es distinta de tu cédula y de tu correo", pw.length > 0 && pw !== (docId ?? "") && pw.toLowerCase() !== email.toLowerCase()],
    ["Las dos contraseñas coinciden", pw.length > 0 && pw === again],
  ];
  const ok = rules.every(([, v]) => v);

  // Modo demo: la clave se guarda (hasheada) en el navegador y se cierra la sesión.
  const submitDemo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    setDemoErr("");
    await changeDemoPassword(userId, pw, userId);
    document.cookie = "agt_session=; path=/; max-age=0";
    window.location.href = "/ingresar?clave=cambiada";
  };

  const err = DEMO ? demoErr : state.error;
  return (
    <form noValidate {...(DEMO ? { onSubmit: submitDemo } : { action })} className="space-y-4">
      <div className="rounded-lg bg-surface-2 p-3 text-sm text-soft">Escribe una contraseña <b className="text-text">nueva</b>. No puedes volver a usar tu cédula: esa era solo la contraseña temporal.</div>
      <div><label className="label" htmlFor="pw">Nueva contraseña</label><input id="pw" name="password" type={show ? "text" : "password"} className="input" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div><label className="label" htmlFor="pw2">Repite la nueva contraseña</label><input id="pw2" name="confirm" type={show ? "text" : "password"} className="input" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm text-soft"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar contraseñas</label>
      <ul className="space-y-1 text-sm" aria-live="polite">
        {rules.map(([t, v]) => <li key={t} className={v ? "text-ok" : "text-soft"}>{v ? "✔" : "○"} {t}</li>)}
      </ul>
      {err && <p role="alert" className="rounded-lg bg-[rgba(192,57,43,.1)] px-3 py-2 text-sm text-danger">{err}</p>}
      <button className="btn btn-primary w-full" disabled={!ok || pending || busy}>{pending || busy ? "Guardando…" : "Guardar contraseña"}</button>
    </form>
  );
}
