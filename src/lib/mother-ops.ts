import "server-only";
import { provisionAccount, resetAccountPassword, type AccountKind } from "./accounts";
import { maybeIssueCertificate, notify } from "./learn";
import { supabaseAdmin } from "./supabase/admin";

// Operaciones de administración de Amser Global Tech que ejecuta la plataforma madre (amserbusiness.com).
// Solo se invocan desde /api/mother, que ya verificó que el llamante es administrador/gerente de la madre.
export type Ctx = { email: string; rol: string };
type Args = Record<string, unknown>;
type Op = { run: (a: Args, c: Ctx) => Promise<unknown>; adminOnly?: boolean };

class Fail extends Error {}
const fail = (m: string): never => { throw new Fail(m); };
const str = (a: Args, k: string, n = 500) => String(a[k] ?? "").trim().slice(0, n);
const id = (a: Args, k = "id") => { const v = str(a, k, 60); if (!/^[0-9a-f-]{36}$/i.test(v)) fail("Identificador no válido."); return v; };
const kindOf = (a: Args): AccountKind => (a.kind === "trainer" ? "trainer" : "participant");
const table = (k: AccountKind) => (k === "trainer" ? "trainer_applications" : "leads");
const iso = () => new Date().toISOString();
const MAT = "course-materials", FILES = "profile-files", PROOFS = "payment-proofs";

async function signed(bucket: string, path: string | null | undefined, secs = 3600) {
  if (!path) return null;
  return (await supabaseAdmin().storage.from(bucket).createSignedUrl(path, secs)).data?.signedUrl ?? null;
}
const result = (r: { ok: boolean; message: string }) => { if (!r.ok) fail(r.message); return r.message; };

// Elimina la cuenta de acceso solo si no hay historial (matrículas) que se perdería.
async function dropAccount(userId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { count: asStudent } = await db.from("enrollments").select("id", { count: "exact", head: true }).eq("participant_id", userId);
  if (asStudent) return `tiene ${asStudent} matrícula(s) con historial de pagos`;
  const { data: owned } = await db.from("courses").select("id").eq("owner_id", userId);
  if (owned?.length) {
    const { count } = await db.from("enrollments").select("id", { count: "exact", head: true }).in("course_id", owned.map((c) => c.id));
    if (count) return `sus cursos tienen ${count} matrícula(s) de participantes`;
  }
  const { error } = await db.auth.admin.deleteUser(userId);
  return error ? "no se pudo eliminar la cuenta de acceso" : null;
}

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export const OPS: Record<string, Op> = {
  // ───────── Lecturas ─────────
  summary: {
    run: async () => {
      const db = supabaseAdmin();
      const head = { count: "exact", head: true } as const;
      const [leadsNew, leadsCall, appsOpen, toReview, toPublish, toValidate, sales, people, unread] = await Promise.all([
        count(db.from("leads").select("id", head).eq("status", "nuevo")),
        count(db.from("leads").select("id", head).eq("status", "contactado")),
        count(db.from("trainer_applications").select("id", head).in("status", ["nuevo", "contactado"])),
        count(db.from("courses").select("id", head).eq("review", "revision")),
        count(db.from("courses").select("id", head).eq("review", "publicado").eq("site_published", false)),
        count(db.from("payments").select("id", head).eq("status", "por_validar")),
        count(db.from("enrollments").select("id", head).in("status", ["activa", "completada"])),
        count(db.from("profiles").select("id", head)),
        count(db.from("notifications").select("id", head).is("read_at", null)),
      ]);
      return { leadsNew, leadsCall, appsOpen, toReview, toPublish, toValidate, sales, people, unread };
    },
  },

  admissions: {
    run: async (a) => {
      const k = kindOf(a), db = supabaseAdmin();
      const { data: items } = await db.from(table(k)).select("*").order("created_at", { ascending: false });
      const uids = (items ?? []).map((x) => x.user_id).filter((x): x is string => !!x);
      const { data: profs } = uids.length ? await db.from("profiles").select("id, must_change_password, temp_password_expires_at, password_changed_at, doc_id, is_active").in("id", uids) : { data: [] };
      const { data: events } = uids.length ? await db.from("account_events").select("*").in("profile_id", uids).order("created_at", { ascending: false }) : { data: [] };
      return (items ?? []).map((x) => ({ ...x, account: profs?.find((p) => p.id === x.user_id) ?? null, events: (events ?? []).filter((e) => e.profile_id === x.user_id) }));
    },
  },

  payments: {
    run: async () => {
      const db = supabaseAdmin();
      const { data: pays } = await db.from("payments").select("*").order("created_at", { ascending: false }).limit(200);
      const eids = Array.from(new Set((pays ?? []).map((p) => p.enrollment_id)));
      const { data: es } = eids.length ? await db.from("enrollments").select("id, course_id, participant_id, sale_price").in("id", eids) : { data: [] };
      const { data: cs } = es?.length ? await db.from("courses").select("id, title").in("id", es.map((e) => e.course_id)) : { data: [] };
      const { data: ps } = es?.length ? await db.from("profiles").select("id, full_name, doc_id").in("id", es.map((e) => e.participant_id)) : { data: [] };
      return Promise.all((pays ?? []).map(async (p) => {
        const e = es?.find((x) => x.id === p.enrollment_id);
        return { ...p, course: cs?.find((c) => c.id === e?.course_id)?.title ?? "—", who: ps?.find((x) => x.id === e?.participant_id) ?? null, proof_url: await signed(PROOFS, p.proof_path, 1800) };
      }));
    },
  },

  courses: {
    run: async () => {
      const db = supabaseAdmin();
      const { data: courses } = await db.from("courses").select("*").neq("review", "borrador").order("updated_at", { ascending: false });
      const ids = (courses ?? []).map((c) => c.id);
      const owners = Array.from(new Set((courses ?? []).map((c) => c.owner_id)));
      const { data: profs } = owners.length ? await db.from("profiles").select("id, full_name").in("id", owners) : { data: [] };
      const { data: banks } = owners.length ? await db.from("trainer_bank_accounts").select("profile_id").in("profile_id", owners) : { data: [] };
      const { data: mods } = ids.length ? await db.from("course_modules").select("id, course_id, title, quiz").in("course_id", ids).order("position") : { data: [] };
      const { data: ls } = ids.length ? await db.from("course_lessons").select("*").in("course_id", ids).order("position") : { data: [] };
      const { data: asg } = ids.length ? await db.from("course_assignments").select("id, course_id").in("course_id", ids) : { data: [] };
      return Promise.all((courses ?? []).map(async (c) => {
        const lessons = await Promise.all((ls ?? []).filter((l) => l.course_id === c.id).map(async (l) => ({ id: l.id, module_id: l.module_id, title: l.title, type: l.type, minutes: l.minutes, material_name: l.material_name, material_url: l.material_url, file_url: await signed(MAT, l.material_path, 3600) })));
        return {
          id: c.id, slug: c.slug, title: c.title, summary: c.summary, kind: c.kind, hours: c.hours, months: c.months, price: Number(c.price), review: c.review, review_note: c.review_note,
          site_published: c.site_published, site_status: c.site_status, start_date: c.start_date, commission_pct: c.commission_pct, sale_price: c.sale_price == null ? null : Number(c.sale_price),
          outcomes: c.outcomes ?? [], quiz_count: Array.isArray(c.final_quiz) ? c.final_quiz.length : 0, certificate_mode: c.certificate_mode,
          owner: profs?.find((p) => p.id === c.owner_id)?.full_name ?? "—", has_bank: (banks ?? []).some((b) => b.profile_id === c.owner_id),
          modules: (mods ?? []).filter((m) => m.course_id === c.id).map((m) => ({ id: m.id, title: m.title, has_quiz: !!m.quiz })), lessons, assignments: (asg ?? []).filter((x) => x.course_id === c.id).length,
        };
      }));
    },
  },

  sales: {
    run: async () => {
      const db = supabaseAdmin();
      const { data: es } = await db.from("enrollments").select("*").in("status", ["activa", "completada"]).order("created_at", { ascending: false });
      const cids = Array.from(new Set((es ?? []).map((s) => s.course_id)));
      const { data: cs } = cids.length ? await db.from("courses").select("id, title, owner_id").in("id", cids) : { data: [] };
      const pids = Array.from(new Set([...(es ?? []).map((s) => s.participant_id), ...(cs ?? []).map((c) => c.owner_id)]));
      const { data: ps } = pids.length ? await db.from("profiles").select("id, full_name").in("id", pids) : { data: [] };
      const { data: banks } = (cs ?? []).length ? await db.from("trainer_bank_accounts").select("profile_id").in("profile_id", (cs ?? []).map((c) => c.owner_id)) : { data: [] };
      return (es ?? []).map((s) => {
        const c = cs?.find((x) => x.id === s.course_id);
        return { id: s.id, created_at: s.created_at, status: s.status, course: c?.title ?? "—", participant: ps?.find((p) => p.id === s.participant_id)?.full_name ?? "—", trainer: ps?.find((p) => p.id === c?.owner_id)?.full_name ?? "—", has_bank: (banks ?? []).some((b) => b.profile_id === c?.owner_id), sale_price: Number(s.sale_price), trainer_amount: Number(s.trainer_amount) };
      });
    },
  },

  people: {
    run: async (a) => {
      const db = supabaseAdmin();
      const roles = a.group === "trainers" ? ["teacher"] : a.group === "participants" ? ["student"] : ["teacher", "student"];
      const { data } = await db.from("profiles").select("id, full_name, role, doc_id, is_active, must_change_password, temp_password_expires_at, password_changed_at, created_at").in("role", roles).order("created_at", { ascending: false });
      return data ?? [];
    },
  },

  person: {
    run: async (a) => {
      const pid = id(a), db = supabaseAdmin();
      const { data: profile } = await db.from("profiles").select("id, full_name, role, doc_id, is_active").eq("id", pid).maybeSingle();
      if (!profile) return fail("No se encontró el perfil.");
      const { data: details } = await db.from("profile_details").select("*").eq("profile_id", pid).maybeSingle();
      const { data: docs } = await db.from("profile_documents").select("*").eq("profile_id", pid).order("uploaded_at", { ascending: false });
      return {
        profile, details: details ? { ...details, avatar_url: await signed(FILES, details.avatar_path) } : null,
        docs: await Promise.all((docs ?? []).map(async (d) => ({ ...d, url: await signed(FILES, d.storage_path, 1800) }))),
      };
    },
  },

  settings: { run: async () => ({ bank_info: (await supabaseAdmin().from("site_settings").select("value").eq("key", "bank_info").maybeSingle()).data?.value ?? "" }) },

  notifications: {
    run: async () => {
      const db = supabaseAdmin();
      const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
      if (!admins?.length) return [];
      const { data } = await db.from("notifications").select("id, kind, title, body, created_at, read_at").in("user_id", admins.map((x) => x.id)).order("created_at", { ascending: false }).limit(60);
      return data ?? [];
    },
  },

  // ───────── Admisiones (participantes y capacitadores) ─────────
  "admission.call": {
    run: async (a) => {
      const note = str(a, "note", 1000); if (!note) fail("Escribe el resultado de la llamada.");
      await supabaseAdmin().from(table(kindOf(a))).update({ status: "contactado", call_note: note, called_at: iso() }).eq("id", id(a));
      return "Llamada registrada.";
    },
  },
  "admission.reject": { run: async (a) => { await supabaseAdmin().from(table(kindOf(a))).update({ status: "descartado" }).eq("id", id(a)); return "Registro rechazado."; } },
  "admission.admit": { run: async (a, c) => result(await provisionAccount(kindOf(a), id(a), c.email)) },
  "admission.edit": {
    run: async (a) => {
      const k = kindOf(a), db = supabaseAdmin(), rid = id(a);
      const name = str(a, "name", 120), email = str(a, "email", 160).toLowerCase(), phone = str(a, "phone", 30);
      if (!name || !email || !phone) fail("Nombre, correo y teléfono son obligatorios.");
      const { data: row } = await db.from(table(k)).select("user_id").eq("id", rid).maybeSingle();
      const patch: Record<string, string | number | null> = { name, email, phone, city: str(a, "city", 80) || null, message: str(a, "message", 1000) || null };
      if (k === "trainer") {
        patch.specialty = str(a, "specialty", 120); patch.topic = str(a, "topic", 200);
        const years = Number(a.years); if (Number.isFinite(years) && years >= 0 && years < 80) patch.years = Math.round(years);
      }
      if (!row?.user_id) patch.doc_id = str(a, "doc_id", 20) || null;
      const { error } = await db.from(table(k)).update(patch).eq("id", rid);
      if (error) fail("No se pudo guardar (¿la cédula ya existe?).");
      if (row?.user_id) await db.from("profiles").update({ full_name: name }).eq("id", row.user_id);
      return "Datos actualizados.";
    },
  },
  "admission.delete": {
    adminOnly: true,
    run: async (a) => {
      const k = kindOf(a), db = supabaseAdmin(), rid = id(a);
      const { data: row } = await db.from(table(k)).select("user_id, name").eq("id", rid).maybeSingle();
      if (!row) return fail("El registro ya no existe.");
      if (row.user_id) { const why = await dropAccount(row.user_id); if (why) fail(`No se puede eliminar a ${row.name}: ${why}.`); }
      await db.from(table(k)).delete().eq("id", rid);
      return "Registro eliminado.";
    },
  },

  // ───────── Cuentas ─────────
  "account.reset": { run: async (a, c) => result(await resetAccountPassword(id(a, "profileId"), c.email, str(a, "manual", 60) || undefined)) },
  "person.setActive": {
    run: async (a) => {
      const pid = id(a, "profileId"), db = supabaseAdmin();
      const { data: p } = await db.from("profiles").select("role").eq("id", pid).maybeSingle();
      if (!p || p.role === "admin") fail("No se puede cambiar el estado de este usuario.");
      await db.from("profiles").update({ is_active: !!a.active }).eq("id", pid);
      return a.active ? "Cuenta activada." : "Cuenta desactivada.";
    },
  },
  "person.edit": {
    run: async (a) => {
      const pid = id(a, "profileId"), name = str(a, "name", 120); if (!name) fail("El nombre es obligatorio.");
      const db = supabaseAdmin(), { data: p } = await db.from("profiles").select("role").eq("id", pid).maybeSingle();
      if (!p || p.role === "admin") fail("No se puede editar a este usuario.");
      await db.from("profiles").update({ full_name: name }).eq("id", pid);
      return "Nombre actualizado.";
    },
  },
  "person.delete": {
    adminOnly: true,
    run: async (a) => {
      const pid = id(a, "profileId"), db = supabaseAdmin();
      const { data: p } = await db.from("profiles").select("role, full_name").eq("id", pid).maybeSingle();
      if (!p) return fail("El usuario ya no existe.");
      if (p.role === "admin") fail("No se puede eliminar a un administrador.");
      const why = await dropAccount(pid); if (why) fail(`No se puede eliminar a ${p.full_name}: ${why}.`);
      return "Usuario eliminado.";
    },
  },
  "doc.setStatus": {
    run: async (a) => {
      const status = str(a, "status", 20), note = str(a, "note", 500);
      if (!["verificado", "observado", "pendiente"].includes(status)) fail("Estado no válido.");
      if (status === "observado" && !note) fail("Indica la observación.");
      await supabaseAdmin().from("profile_documents").update({ status, note: status === "verificado" ? null : note || null }).eq("id", id(a, "docId"));
      return "Documento actualizado.";
    },
  },

  // ───────── Pagos ─────────
  "payment.confirm": {
    run: async (a, c) => {
      const db = supabaseAdmin(), pid = id(a);
      // El trigger de la base activa la matrícula y avisa; luego se evalúa el certificado.
      const { data: adm } = await db.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
      await db.from("payments").update({ status: "confirmado", reviewed_by: adm?.id ?? null, reviewed_at: iso(), note: `Validado desde la plataforma madre por ${c.email}` }).eq("id", pid).eq("status", "por_validar");
      const { data: p } = await db.from("payments").select("enrollment_id").eq("id", pid).maybeSingle();
      if (p) await maybeIssueCertificate(p.enrollment_id);
      return "Pago confirmado.";
    },
  },
  "payment.reject": {
    run: async (a) => {
      const db = supabaseAdmin(), pid = id(a), note = str(a, "note", 500);
      if (!note) fail("El motivo es obligatorio para rechazar.");
      const { data: p } = await db.from("payments").select("enrollment_id, amount").eq("id", pid).eq("status", "por_validar").maybeSingle();
      if (!p) return fail("El pago ya fue procesado.");
      await db.from("payments").update({ status: "rechazado", note, reviewed_at: iso() }).eq("id", pid);
      const { data: e } = await db.from("enrollments").select("participant_id").eq("id", p.enrollment_id).single();
      await notify([e!.participant_id], "payment_rejected", "Tu pago fue observado", `No pudimos validar tu transferencia de $${Number(p.amount).toFixed(2)}: ${note}. Vuelve a informarla desde Mis pagos.`, "/estudiante/pagos");
      return "Pago rechazado y participante avisado.";
    },
  },
  "payment.delete": {
    adminOnly: true,
    run: async (a) => {
      const db = supabaseAdmin(), pid = id(a), { data: p } = await db.from("payments").select("status").eq("id", pid).maybeSingle();
      if (!p) return fail("El pago ya no existe.");
      if (p.status === "confirmado") fail("Un pago confirmado no se elimina (es parte del historial contable).");
      await db.from("payments").delete().eq("id", pid);
      return "Pago eliminado.";
    },
  },
  "bank.save": {
    run: async (a) => {
      const value = str(a, "value", 1000); if (!value) fail("Escribe los datos bancarios.");
      await supabaseAdmin().from("site_settings").upsert({ key: "bank_info", value, updated_at: iso() });
      return "Datos bancarios guardados.";
    },
  },

  // ───────── Cursos ─────────
  "course.approve": {
    run: async (a) => { await supabaseAdmin().from("courses").update({ review: "publicado", review_note: null, updated_at: iso() }).eq("id", id(a)).eq("review", "revision"); return "Curso aprobado."; },
  },
  "course.return": {
    run: async (a) => {
      const note = str(a, "note", 1000); if (!note) fail("Indica las observaciones para devolver.");
      await supabaseAdmin().from("courses").update({ review: "rechazado", review_note: note, updated_at: iso() }).eq("id", id(a)).eq("review", "revision");
      return "Curso devuelto al capacitador.";
    },
  },
  "course.publish": {
    run: async (a) => {
      const db = supabaseAdmin(), cid = id(a), pct = Number(a.commission), start = str(a, "start", 10), status = str(a, "status", 20) || "abierto";
      if (!(pct >= 0 && pct <= 500)) fail("La comisión debe estar entre 0% y 500%.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) fail("Indica la fecha de inicio del curso.");
      if (!["abierto", "proximamente"].includes(status)) fail("Estado no válido.");
      const { data: c } = await db.from("courses").select("id, owner_id, price, review").eq("id", cid).maybeSingle();
      if (!c || c.review !== "publicado") return fail("Solo se pueden publicar cursos aprobados.");
      const sale = Math.round(Number(c.price) * (1 + pct / 100) * 100) / 100;
      const { data: prof } = await db.from("profiles").select("full_name").eq("id", c.owner_id).maybeSingle();
      const { data: app } = await db.from("trainer_applications").select("specialty, years").eq("user_id", c.owner_id).maybeSingle();
      const { error } = await db.from("courses").update({ site_published: true, site_status: status, start_date: start, commission_pct: pct, sale_price: sale, teacher_name: prof?.full_name ?? null, teacher_bio: app ? `${app.specialty} · ${app.years} años de experiencia` : null, published_at: iso() }).eq("id", cid);
      if (error) fail("No se pudo publicar el curso.");
      return `Publicado. Precio de venta $${sale.toFixed(2)} (el capacitador recibe $${Number(c.price).toFixed(2)}).`;
    },
  },
  "course.unpublish": { run: async (a) => { await supabaseAdmin().from("courses").update({ site_published: false }).eq("id", id(a)); return "El curso se quitó del sitio."; } },
  "course.setCertMode": {
    run: async (a) => {
      const mode = a.mode === "manual" ? "manual" : "auto";
      await supabaseAdmin().from("courses").update({ certificate_mode: mode }).eq("id", id(a));
      return mode === "manual" ? "Los certificados de este curso se aprobarán manualmente." : "Los certificados de este curso se emitirán automáticamente.";
    },
  },
  "course.edit": {
    run: async (a) => {
      const db = supabaseAdmin(), cid = id(a), title = str(a, "title", 160), price = Number(a.price);
      if (!title || !(price >= 0 && price < 100000)) fail("Título y un precio válido son obligatorios.");
      const { data: c } = await db.from("courses").select("commission_pct").eq("id", cid).maybeSingle();
      if (!c) return fail("El curso ya no existe.");
      const patch: Record<string, string | number> = { title, summary: str(a, "summary", 1500), price, updated_at: iso() };
      if (c.commission_pct != null) patch.sale_price = Math.round(price * (1 + Number(c.commission_pct) / 100) * 100) / 100;
      const { error } = await db.from("courses").update(patch).eq("id", cid);
      if (error) fail("No se pudo guardar el curso.");
      return "Curso actualizado.";
    },
  },
  "course.delete": {
    adminOnly: true,
    run: async (a) => {
      const db = supabaseAdmin(), cid = id(a), { data: c } = await db.from("courses").select("title").eq("id", cid).maybeSingle();
      if (!c) return fail("El curso ya no existe.");
      const { count: n } = await db.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", cid);
      if (n) fail(`«${c.title}» tiene ${n} matrícula(s); no se puede eliminar. Puedes quitarlo del sitio.`);
      const { error } = await db.from("courses").delete().eq("id", cid);
      if (error) fail("No se pudo eliminar el curso.");
      return "Curso eliminado.";
    },
  },

  "notifications.read": {
    run: async () => {
      const db = supabaseAdmin(), { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
      if (admins?.length) await db.from("notifications").update({ read_at: iso() }).in("user_id", admins.map((x) => x.id)).is("read_at", null);
      return "Avisos marcados como leídos.";
    },
  },
};

export { Fail };
