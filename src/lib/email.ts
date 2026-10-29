import "server-only";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amserglobaltech.com";
export const emailConfigured = () => !!process.env.RESEND_API_KEY;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Correo con las credenciales de acceso (usuario = cédula; clave temporal). Vale para participantes y capacitadores.
export function credentialsEmail(o: { name: string; username: string; password: string; validDays: number; portal: string; extra?: string }) {
  const link = `${SITE_URL}/ingresar`;
  const subject = `Tu acceso a Amser Global Tech — ${o.portal}`;
  const text = [
    `Hola ${o.name},`,
    ``,
    `¡Felicitaciones! Tu admisión fue aprobada y tu ${o.portal.toLowerCase()} ya está habilitado.`,
    ``,
    `Ingresa aquí: ${link}`,
    `Usuario: ${o.username}`,
    `Contraseña temporal: ${o.password}`,
    ``,
    `Por seguridad, al ingresar deberás crear una contraseña nueva (la temporal vence en ${o.validDays} días). Después de cambiarla, vuelve a ingresar con tu usuario y tu nueva contraseña.`,
    ``,
    ...(o.extra ? [o.extra, ``] : []),
    `Si no esperabas este correo, ignóralo.`,
    `Amser Global Tech`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#12213b">
<h2 style="color:#0b57c7">¡Bienvenido a Amser Global Tech!</h2>
<p>Hola <b>${esc(o.name)}</b>, tu admisión fue aprobada y tu <b>${esc(o.portal.toLowerCase())}</b> ya está habilitado.</p>
<table style="background:#f4f7fb;border-radius:8px;padding:16px;width:100%"><tr><td>Usuario</td><td><b>${esc(o.username)}</b></td></tr><tr><td>Contraseña temporal</td><td><b>${esc(o.password)}</b></td></tr></table>
<p style="margin:24px 0"><a href="${link}" style="background:#0b57c7;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Ingresar a mi portal</a></p>
<p style="font-size:14px">Por seguridad, al ingresar deberás <b>crear una contraseña nueva</b> (la temporal vence en ${o.validDays} días). Después de cambiarla, vuelve a ingresar con tu usuario y tu nueva contraseña.</p>
${o.extra ? `<p style="font-size:14px">${esc(o.extra)}</p>` : ""}
<p style="font-size:12px;color:#56677f">Si no esperabas este correo, ignóralo. — Amser Global Tech</p></div>`;
  return { subject, html, text };
}

export async function sendEmail(o: { to: string; subject: string; html: string; text: string }): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "El servicio de correo no está configurado (falta RESEND_API_KEY)." };
  const from = process.env.EMAIL_FROM ?? "Amser Global Tech <admissions@amserglobaltech.com>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [o.to], subject: o.subject, html: o.html, text: o.text }),
    });
    if (!r.ok) return { ok: false, error: `El proveedor de correo respondió ${r.status}: ${(await r.text()).slice(0, 160)}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo contactar al proveedor de correo." };
  }
}
