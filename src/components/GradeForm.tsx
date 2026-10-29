"use client";

import { useState } from "react";
import { gradeSubmission } from "@/lib/store";

// El capacitador registra la nota UNA sola vez. Después queda bloqueada: solo la administración puede corregirla.
export function GradeForm({ id, max, grade, feedback }: { id: string; max: number; grade?: number; feedback?: string }) {
  const [g, setG] = useState("");
  const [f, setF] = useState("");
  const [confirm, setConfirm] = useState(false);

  if (grade != null) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-3 text-sm">
        <span aria-hidden>🔒</span>
        <span><b>Nota registrada: {grade}/{max}</b>{feedback && <span className="text-soft"> · {feedback}</span>}</span>
        <span className="w-full text-xs text-soft sm:w-auto sm:ml-auto">Solo la administración puede modificarla.</span>
      </div>
    );
  }

  return (
    <form
      className="mt-3 grid gap-2 sm:grid-cols-[100px_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm) { setConfirm(true); return; }
        gradeSubmission(id, Math.min(max, Math.max(0, Number(g))), f);
      }}
    >
      <input className="input" type="number" min={0} max={max} step="0.5" required placeholder={`0–${max}`} value={g} onChange={(e) => { setG(e.target.value); setConfirm(false); }} aria-label="Nota" />
      <input className="input" placeholder="Retroalimentación para el participante" value={f} onChange={(e) => setF(e.target.value)} aria-label="Retroalimentación" />
      <button className={`btn btn-sm ${confirm ? "btn-primary" : "btn-green"}`}>{confirm ? "Confirmar: no se podrá editar" : "Calificar"}</button>
    </form>
  );
}
