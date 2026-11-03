// mads-admin-users — gestão de usuários do IAplicada Ads (só administradores).
//
// Ações (POST JSON { acao, ...payload }):
//   list                       → usuários (mads_v_usuarios) + permissões de cada um
//   create    { email, nome, senha, is_admin?, permissoes? }
//   update    { user_id, nome?, ativo?, is_admin? }
//   set_password { user_id, senha }
//   set_permissoes { user_id, permissoes: { [recurso]: 'none'|'view'|'edit' } }
//   delete    { user_id }
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
const normEmail = (e: string) => (e ?? "").trim().toLowerCase();

async function logAdmin(actorId: string, actorEmail: string | null, detalhes: Record<string, unknown>) {
  try {
    await admin.from("mads_acessos").insert({ user_id: actorId, email: actorEmail, acao: "admin", recurso: "admin", detalhes });
  } catch { /* nunca derruba a ação por causa do log */ }
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
      const [{ data: usuarios, error: e1 }, { data: perms, error: e2 }] = await Promise.all([
        admin.from("mads_v_usuarios").select("*").order("nome", { ascending: true }),
        admin.from("mads_permissoes").select("user_id, recurso, nivel"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const porUsuario: Record<string, Record<string, string>> = {};
      for (const p of perms ?? []) (porUsuario[p.user_id] ??= {})[p.recurso] = p.nivel;
      return json({ ok: true, usuarios: (usuarios ?? []).map((u: any) => ({ ...u, permissoes: porUsuario[u.user_id] ?? {} })) });
    }

    if (acao === "create") {
      const email = normEmail(body.email);
      const nome = String(body.nome ?? "").trim();
      const senha = String(body.senha ?? "");
      if (!email || !email.includes("@")) return json({ error: "E-mail inválido" }, 400);
      if (senha.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres" }, 400);

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

      // 3) perfil (o trigger handle_new_user já criou a linha) + status no Ads + permissões
      await admin.from("profiles").update({ full_name: nome || email.split("@")[0], is_admin: !!body.is_admin }).eq("id", uid);
      await admin.from("mads_usuarios").upsert({ user_id: uid, ativo: true, criado_por: actor.id }, { onConflict: "user_id" });
      const perms = body.permissoes && typeof body.permissoes === "object" ? body.permissoes : {};
      const rows = Object.entries(perms)
        .filter(([, n]) => NIVEIS.has(String(n)))
        .map(([recurso, nivel]) => ({ user_id: uid, recurso, nivel: String(nivel), updated_by: actor.id, updated_at: new Date().toISOString() }));
      if (rows.length) await admin.from("mads_permissoes").upsert(rows, { onConflict: "user_id,recurso" });

      await logAdmin(actor.id, actorProfile.email, { op: "create", alvo: email, is_admin: !!body.is_admin });
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
      const rows = Object.entries(perms)
        .filter(([, n]) => NIVEIS.has(String(n)))
        .map(([recurso, nivel]) => ({ user_id: uid, recurso, nivel: String(nivel), updated_by: actor.id, updated_at: new Date().toISOString() }));
      if (rows.length) {
        const { error } = await admin.from("mads_permissoes").upsert(rows, { onConflict: "user_id,recurso" });
        if (error) throw error;
      }
      await logAdmin(actor.id, actorProfile.email, { op: "set_permissoes", alvo: uid, recursos: rows.length });
      return json({ ok: true });
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
