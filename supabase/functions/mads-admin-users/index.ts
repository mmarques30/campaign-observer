// mads-admin-users — gestão de usuários e empresas do IAplicada Ads (só administradores).
//
// Ações (POST JSON { acao, ...payload }):
//   list            → usuários (mads_v_usuarios) + permissões por empresa + vínculos + empresas
//   create          { email, nome, senha, is_admin?, empresas?: [{ empresa_id, papel }],
//                     permissoes?: { [recurso]: nivel } | { [empresa_id]: { [recurso]: nivel } } }
//   update          { user_id, nome?, ativo?, is_admin? }
//   set_password    { user_id, senha }
//   set_permissoes  { user_id, empresa_id?, permissoes: { [recurso]: 'none'|'view'|'edit' } }
//                   (sem empresa_id = IAplicada, compatível com a tela antiga)
//   set_empresas    { user_id, empresas: [{ empresa_id, papel: 'admin'|'membro' }] }
//   empresa_save    { id?, nome, slug?, ativo?, recursos?, logo_url?, observacoes? }
//   delete          { user_id }
//
// Autenticação: JWT do usuário no header Authorization (verify_jwt=true) e
// profiles.is_admin = true. Usa a service role só depois dessa checagem.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const NIVEIS = new Set(["none", "view", "edit"]);
const PAPEIS = new Set(["admin", "membro"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normEmail = (e: string) => (e ?? "").trim().toLowerCase();
const slugify = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function logAdmin(actorId: string, actorEmail: string | null, detalhes: Record<string, unknown>) {
  try {
    await admin.from("mads_acessos").insert({ user_id: actorId, email: actorEmail, acao: "admin", recurso: "admin", detalhes });
  } catch { /* nunca derruba a ação por causa do log */ }
}

async function iaplicadaId(): Promise<string> {
  const { data, error } = await admin.from("mads_empresas").select("id").eq("interna", true).maybeSingle();
  if (error || !data) throw new Error("Empresa IAplicada não encontrada");
  return data.id;
}

function linhasPermissao(uid: string, empresaId: string, perms: Record<string, unknown>, actorId: string) {
  return Object.entries(perms ?? {})
    .filter(([, n]) => NIVEIS.has(String(n)))
    .map(([recurso, nivel]) => ({
      user_id: uid, empresa_id: empresaId, recurso, nivel: String(nivel),
      updated_by: actorId, updated_at: new Date().toISOString(),
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método não suportado" }, 405);

  // Quem chama precisa ser admin.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Sessão ausente" }, 401);
  const { data: { user: actor }, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !actor) return json({ error: "Sessão inválida" }, 401);
  const { data: actorProfile } = await admin.from("profiles").select("is_admin, email").eq("id", actor.id).maybeSingle();
  if (!actorProfile?.is_admin) return json({ error: "Apenas administradores" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* vazio */ }
  const acao = String(body?.acao ?? "");

  try {
    if (acao === "list") {
      const [u, p, m, e] = await Promise.all([
        admin.from("mads_v_usuarios").select("*").order("nome", { ascending: true }),
        admin.from("mads_permissoes").select("user_id, empresa_id, recurso, nivel"),
        admin.from("mads_empresa_membros").select("empresa_id, user_id, papel"),
        admin.from("mads_empresas").select("*").order("interna", { ascending: false }).order("nome", { ascending: true }),
      ]);
      for (const r of [u, p, m, e]) if (r.error) throw r.error;
      const ia = (e.data ?? []).find((x: any) => x.interna)?.id;
      // permissoes: IAplicada (compatível com a tela antiga) + por empresa
      const porUsuario: Record<string, Record<string, string>> = {};
      const porEmpresa: Record<string, Record<string, Record<string, string>>> = {};
      for (const r of p.data ?? []) {
        ((porEmpresa[r.user_id] ??= {})[r.empresa_id] ??= {})[r.recurso] = r.nivel;
        if (r.empresa_id === ia) (porUsuario[r.user_id] ??= {})[r.recurso] = r.nivel;
      }
      const vinculos: Record<string, { empresa_id: string; papel: string }[]> = {};
      for (const r of m.data ?? []) (vinculos[r.user_id] ??= []).push({ empresa_id: r.empresa_id, papel: r.papel });
      const membrosPorEmpresa: Record<string, number> = {};
      for (const r of m.data ?? []) membrosPorEmpresa[r.empresa_id] = (membrosPorEmpresa[r.empresa_id] ?? 0) + 1;
      return json({
        ok: true,
        usuarios: (u.data ?? []).map((x: any) => ({
          ...x,
          permissoes: porUsuario[x.user_id] ?? {},
          permissoes_por_empresa: porEmpresa[x.user_id] ?? {},
          vinculos: vinculos[x.user_id] ?? [],
        })),
        empresas: (e.data ?? []).map((x: any) => ({ ...x, membros: membrosPorEmpresa[x.id] ?? 0 })),
      });
    }

    if (acao === "create") {
      const email = normEmail(body.email);
      const nome = String(body.nome ?? "").trim();
      const senha = String(body.senha ?? "");
      if (!email || !email.includes("@")) return json({ error: "E-mail inválido" }, 400);
      if (senha.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres" }, 400);
      const ia = await iaplicadaId();

      const empresas: { empresa_id: string; papel: string }[] = (Array.isArray(body.empresas) ? body.empresas : [])
        .filter((x: any) => UUID.test(String(x?.empresa_id ?? "")))
        .map((x: any) => ({ empresa_id: String(x.empresa_id), papel: PAPEIS.has(x?.papel) ? x.papel : "membro" }));
      if (!empresas.length) empresas.push({ empresa_id: ia, papel: "membro" });

      // 1) autoriza o e-mail (trigger de allowlist bloqueia cadastro fora da lista)
      const { error: alErr } = await admin.from("signup_allowlist").upsert(
        { email, added_by: actor.id, note: "IAplicada Ads · cadastro pelo painel" },
        { onConflict: "email" },
      );
      if (alErr) throw alErr;

      // 2) cria a conta já confirmada, com senha definida pelo admin
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nome || email.split("@")[0] },
      });
      if (cErr) return json({ error: cErr.message === "User already registered" ? "Já existe uma conta com este e-mail" : cErr.message }, 400);
      const uid = created.user!.id;

      // 3) perfil + status no Ads + empresas + permissões
      await admin.from("profiles").update({ full_name: nome || email.split("@")[0], is_admin: !!body.is_admin }).eq("id", uid);
      await admin.from("mads_usuarios").upsert(
        { user_id: uid, ativo: true, criado_por: actor.id, empresa_ativa_id: empresas[0].empresa_id },
        { onConflict: "user_id" },
      );
      await admin.from("mads_empresa_membros").upsert(
        empresas.map((x) => ({ ...x, user_id: uid })), { onConflict: "empresa_id,user_id" });

      const perms = body.permissoes && typeof body.permissoes === "object" ? body.permissoes : {};
      // Aceita { recurso: nivel } (vale para a primeira empresa) ou { empresa_id: { recurso: nivel } }.
      const porEmpresa = Object.keys(perms).some((k) => UUID.test(k));
      const rows = porEmpresa
        ? Object.entries(perms).flatMap(([emp, m]) => (UUID.test(emp) ? linhasPermissao(uid, emp, m as any, actor.id) : []))
        : linhasPermissao(uid, empresas[0].empresa_id, perms, actor.id);
      if (rows.length) {
        const { error } = await admin.from("mads_permissoes").upsert(rows, { onConflict: "user_id,empresa_id,recurso" });
        if (error) throw error;
      }

      await logAdmin(actor.id, actorProfile.email, { op: "create", alvo: email, is_admin: !!body.is_admin, empresas: empresas.length });
      return json({ ok: true, user_id: uid });
    }

    if (acao === "update") {
      const uid = String(body.user_id ?? "");
      if (!uid) return json({ error: "user_id obrigatório" }, 400);
      if (uid === actor.id && body.is_admin === false) return json({ error: "Você não pode remover seu próprio acesso de administrador" }, 400);
      const prof: Record<string, unknown> = {};
      if (typeof body.nome === "string") prof.full_name = body.nome.trim();
      if (typeof body.is_admin === "boolean") prof.is_admin = body.is_admin;
      if (Object.keys(prof).length) {
        const { error } = await admin.from("profiles").update(prof).eq("id", uid);
        if (error) throw error;
      }
      if (typeof body.ativo === "boolean") {
        if (uid === actor.id && !body.ativo) return json({ error: "Você não pode desativar a si mesmo" }, 400);
        const { error } = await admin.from("mads_usuarios").upsert(
          { user_id: uid, ativo: body.ativo, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        if (error) throw error;
      }
      await logAdmin(actor.id, actorProfile.email, { op: "update", alvo: uid, ...prof, ativo: body.ativo });
      return json({ ok: true });
    }

    if (acao === "set_password") {
      const uid = String(body.user_id ?? "");
      const senha = String(body.senha ?? "");
      if (!uid) return json({ error: "user_id obrigatório" }, 400);
      if (senha.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(uid, { password: senha });
      if (error) throw error;
      await logAdmin(actor.id, actorProfile.email, { op: "set_password", alvo: uid });
      return json({ ok: true });
    }

    if (acao === "set_permissoes") {
      const uid = String(body.user_id ?? "");
      const perms = body.permissoes && typeof body.permissoes === "object" ? body.permissoes : null;
      if (!uid || !perms) return json({ error: "user_id e permissoes obrigatórios" }, 400);
      const empresaId = UUID.test(String(body.empresa_id ?? "")) ? String(body.empresa_id) : await iaplicadaId();
      const rows = linhasPermissao(uid, empresaId, perms, actor.id);
      if (rows.length) {
        const { error } = await admin.from("mads_permissoes").upsert(rows, { onConflict: "user_id,empresa_id,recurso" });
        if (error) throw error;
      }
      await logAdmin(actor.id, actorProfile.email, { op: "set_permissoes", alvo: uid, empresa_id: empresaId, recursos: rows.length });
      return json({ ok: true });
    }

    if (acao === "set_empresas") {
      const uid = String(body.user_id ?? "");
      if (!uid) return json({ error: "user_id obrigatório" }, 400);
      const lista: { empresa_id: string; papel: string }[] = (Array.isArray(body.empresas) ? body.empresas : [])
        .filter((x: any) => UUID.test(String(x?.empresa_id ?? "")))
        .map((x: any) => ({ empresa_id: String(x.empresa_id), papel: PAPEIS.has(x?.papel) ? x.papel : "membro" }));
      if (!lista.length) return json({ error: "A pessoa precisa estar em pelo menos uma empresa" }, 400);
      const { data: atuais, error: e1 } = await admin.from("mads_empresa_membros").select("empresa_id").eq("user_id", uid);
      if (e1) throw e1;
      const manter = new Set(lista.map((x) => x.empresa_id));
      const remover = (atuais ?? []).map((x: any) => x.empresa_id).filter((id: string) => !manter.has(id));
      if (remover.length) {
        const { error } = await admin.from("mads_empresa_membros").delete().eq("user_id", uid).in("empresa_id", remover);
        if (error) throw error;
      }
      const { error: e2 } = await admin.from("mads_empresa_membros").upsert(
        lista.map((x) => ({ ...x, user_id: uid })), { onConflict: "empresa_id,user_id" });
      if (e2) throw e2;
      await logAdmin(actor.id, actorProfile.email, { op: "set_empresas", alvo: uid, empresas: lista.length });
      return json({ ok: true });
    }

    if (acao === "empresa_save") {
      const id = UUID.test(String(body.id ?? "")) ? String(body.id) : null;
      const nome = String(body.nome ?? "").trim();
      if (!nome) return json({ error: "Informe o nome da empresa" }, 400);
      const { data: existente } = id
        ? await admin.from("mads_empresas").select("interna").eq("id", id).maybeSingle()
        : { data: null as any };
      const interna = !!existente?.interna;
      const dados: Record<string, unknown> = {
        nome,
        slug: slugify(String(body.slug ?? "") || nome) || null,
        logo_url: body.logo_url ? String(body.logo_url) : null,
        observacoes: body.observacoes ? String(body.observacoes) : null,
        updated_at: new Date().toISOString(),
      };
      // A IAplicada (interna) sempre tem tudo e não pode ser desativada.
      if (!interna) {
        if (Array.isArray(body.recursos)) dados.recursos = body.recursos.map(String);
        if (typeof body.ativo === "boolean") dados.ativo = body.ativo;
      }
      const r = id
        ? await admin.from("mads_empresas").update(dados).eq("id", id).select("id").single()
        : await admin.from("mads_empresas").insert({ ...dados, criado_por: actor.id }).select("id").single();
      if (r.error) {
        const dup = /duplicate key|unique/i.test(r.error.message);
        return json({ error: dup ? "Já existe uma empresa com esse nome/identificador" : r.error.message }, 400);
      }
      await logAdmin(actor.id, actorProfile.email, { op: "empresa_save", alvo: nome, novo: !id });
      return json({ ok: true, id: r.data.id });
    }

    if (acao === "delete") {
      const uid = String(body.user_id ?? "");
      if (!uid) return json({ error: "user_id obrigatório" }, 400);
      if (uid === actor.id) return json({ error: "Você não pode remover a própria conta" }, 400);
      const { data: alvo } = await admin.from("profiles").select("email").eq("id", uid).maybeSingle();
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) throw error;
      if (alvo?.email) await admin.from("signup_allowlist").delete().eq("email", normEmail(alvo.email));
      await logAdmin(actor.id, actorProfile.email, { op: "delete", alvo: alvo?.email ?? uid });
      return json({ ok: true });
    }

    return json({ error: `Ação desconhecida: ${acao}` }, 400);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
