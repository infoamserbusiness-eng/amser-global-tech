import QRCode from "qrcode";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amserglobaltech.com";

// Credencial electrónica: foto, nombre, rol y un QR que lleva a la página pública de verificación (sin documentos ni datos sensibles).
export async function CredentialCard({ name, roleLabel, docId, profession, avatarUrl, token, active }: { name: string; roleLabel: string; docId: string | null; profession: string | null; avatarUrl: string | null; token: string; active: boolean }) {
  const url = `${SITE}/verificar/${token}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 280, errorCorrectionLevel: "M", color: { dark: "#0a1730", light: "#ffffff" } });
  const code = `AGT-${roleLabel.slice(0, 3).toUpperCase()}-${token.slice(0, 8).toUpperCase()}`;
  return (
    <div className="cred mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
      <div className="flex items-center gap-3 px-5 py-3 text-white" style={{ background: "linear-gradient(120deg,#0a1730,#0b57c7)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="h-10 w-10 rounded-lg bg-white p-0.5" />
        <div className="leading-tight"><b className="block font-display text-sm tracking-wide">AMSER GLOBAL TECH</b><span className="text-[10px] uppercase tracking-[0.18em] text-white/70">Higher Technological Institute</span></div>
        <span className="ml-auto rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">{roleLabel}</span>
      </div>
      <div className="flex items-center gap-4 p-5">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={`Foto de ${name}`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue to-green font-display text-4xl font-extrabold text-white">{name.trim()[0]?.toUpperCase()}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-extrabold leading-tight text-[#0a1730]">{name}</h3>
          {profession && <p className="mt-0.5 text-sm text-soft">{profession}</p>}
          <dl className="mt-2 space-y-0.5 text-xs text-soft">
            {docId && <div>C.I. <b className="text-text">{docId}</b></div>}
            <div>ID <b className="font-mono text-text">{code}</b></div>
          </dl>
        </div>
        <div className="shrink-0 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR de verificación de la credencial" className="h-24 w-24" />
          <p className="mt-0.5 text-[9px] uppercase tracking-wide text-soft">Escanea para verificar</p>
        </div>
      </div>
      <div className={`px-5 py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white ${active ? "" : "opacity-80"}`} style={{ background: active ? "linear-gradient(90deg,#22b24c,#0b57c7)" : "#c0392b" }}>
        {active ? "Credencial electrónica · Vigente" : "Credencial no vigente"}
      </div>
    </div>
  );
}
