// Botón de eliminación con confirmación en dos pasos (se despliega y luego se confirma). Para el administrador.
export function DangerDelete({ action, text, label = "🗑 Eliminar" }: { action: () => Promise<void>; text: string; label?: string }) {
  return (
    <details className="mt-2 rounded-xl border border-line p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-danger">{label}</summary>
      <form className="mt-2">
        <p className="mb-2 text-soft">{text} No se puede deshacer.</p>
        <button formAction={action} className="btn btn-sm" style={{ background: "#c0392b", color: "#fff" }}>Sí, eliminar definitivamente</button>
      </form>
    </details>
  );
}
