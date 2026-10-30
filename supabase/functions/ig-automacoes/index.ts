// ig-automacoes — comentário no post vira resposta pública + DM (estilo ManyChat), e a pessoa
// entra no CRM. Uma automação = um post (ig_media_id) + palavras-chave (vazio = qualquer
// comentário) + várias respostas públicas (uma é sorteada) + DM em blocos (texto, imagem,
// link com botão, passo a passo).
//
// Como a Meta funciona: o 1º bloco sai como "resposta privada" ao comentário (permitido sem a
// pessoa ter falado com a gente antes). Os blocos seguintes só podem sair se a pessoa já
// respondeu na DM; se a Meta recusar, ficam na fila e saem assim que ela responder.
//
//   GET  ?hub.mode=subscribe&hub.verify_token=…        → verificação do webhook (Meta)
//   POST (object: "instagram")                          → webhook: comentários e mensagens
//   POST { acao: "varrer" }                             → varredura (cron, 1x/min): comentários novos
//                                                         dos posts com automação + fila de DMs
//   POST { acao: "testar", automacao_id, comment_id }   → processa um comentário específico
//   POST { acao: "status" }                             → conta, permissões e assinatura do webhook
//   POST { acao: "assinar" }                            → assina a página/conta no app (webhook)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const V = "v20.0";
const BUCKET = "video-edicao";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

type Bloco =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagem"; url?: string; path?: string; legenda?: string }
  | { tipo: "link"; titulo: string; texto?: string; url: string; botao?: string; imagem?: string }
  | { tipo: "passos"; titulo?: string; passos: string[] };

// ─── Meta ───────────────────────────────────────────────────────────────────
async function segredo(sb: any, nome: string) {
  const { data } = await sb.rpc("get_secret", { secret_name: nome });
  const t = typeof data === "string" ? data : data?.secret;
  return String(t || "").replace(/^"|"$/g, "");
}
async function token(sb: any) {
  const t = (await segredo(sb, "META_ADS_TOKEN")) || Deno.env.get("META_ACCESS_TOKEN") || "";
  if (!t) throw new Error("META_ADS_TOKEN não configurado");
  return t;
}
let igCache = "";
async function contaIg(sb: any, tk: string) {
  if (igCache) return igCache;
  let id = Deno.env.get("IG_USER_ID") || (await segredo(sb, "META_IG_ACCOUNT_ID"));
  if (!id) {
    const j = await graph("GET", "me/accounts", tk, { fields: "instagram_business_account" });
    id =
      (j.data ?? []).find((p: any) => p.instagram_business_account)?.instagram_business_account
        ?.id ?? "";
  }
  if (!id) throw new Error("conta do Instagram não configurada");
  igCache = id;
  return id;
}
async function graph(
  method: "GET" | "POST",
  path: string,
  tk: string,
  params: Record<string, unknown> = {},
) {
  const url = new URL(`https://graph.facebook.com/${V}/${path}`);
  const init: RequestInit = { method, signal: AbortSignal.timeout(25000) };
  if (method === "GET") {
    for (const [k, v] of Object.entries({ ...params, access_token: tk }))
      url.searchParams.set(k, String(v));
  } else {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ ...params, access_token: tk });
  }
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e: any = new Error(j.error?.error_user_msg || j.error?.message || `Meta ${r.status}`);
    e.codigo = j.error?.code;
    e.sub = j.error?.error_subcode;
    throw e;
  }
  return j;
}

// ─── utilidades ──────────────────────────────────────────────────────────────
const norm = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
function bate(palavras: string[], texto: string) {
  const ps = (palavras ?? []).map((p) => norm(p).trim()).filter(Boolean);
  if (!ps.length) return true; // sem palavra = qualquer comentário
  const t = norm(texto);
  return ps.some((p) => t.includes(p));
}
const sorteia = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
function preenche(t: string, nome: string) {
  return String(t ?? "").replace(/\{nome\}|\{usuario\}|\{username\}/gi, nome);
}
async function urlPublica(sb: any, b: Bloco & { path?: string; url?: string }) {
  if (b.url) return b.url;
  if (b.path) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(b.path, 7 * 86400);
    return data?.signedUrl ?? null;
  }
  return null;
}
function textoPassos(b: Extract<Bloco, { tipo: "passos" }>, nome: string) {
  const linhas = (b.passos ?? []).map((p, i) => `${i + 1}. ${preenche(p, nome)}`);
  return [b.titulo ? preenche(b.titulo, nome) : "", ...linhas].filter(Boolean).join("\n\n");
}
/** Texto equivalente de um bloco (para a resposta privada, que só aceita texto). */
async function blocoComoTexto(sb: any, b: Bloco, nome: string) {
  if (b.tipo === "texto") return preenche(b.texto, nome);
  if (b.tipo === "passos") return textoPassos(b, nome);
  if (b.tipo === "link")
    return [preenche(b.titulo, nome), b.texto ? preenche(b.texto, nome) : "", b.url]
      .filter(Boolean)
      .join("\n\n");
  if (b.tipo === "imagem") return preenche(b.legenda ?? "", nome) || "";
  return "";
}

/** Mensagem da Meta para um bloco (DM normal, já com conversa aberta). */
async function mensagemDe(sb: any, b: Bloco, nome: string): Promise<Record<string, unknown>[]> {
  if (b.tipo === "texto") return [{ text: preenche(b.texto, nome) }];
  if (b.tipo === "passos") return [{ text: textoPassos(b, nome) }];
  if (b.tipo === "imagem") {
    const url = await urlPublica(sb, b);
    if (!url) return [];
    const msgs: Record<string, unknown>[] = [{ attachment: { type: "image", payload: { url } } }];
    if (b.legenda) msgs.push({ text: preenche(b.legenda, nome) });
    return msgs;
  }
  if (b.tipo === "link") {
    const el: Record<string, unknown> = {
      title: preenche(b.titulo, nome).slice(0, 80),
      buttons: [{ type: "web_url", url: b.url, title: (b.botao || "Abrir").slice(0, 20) }],
    };
    if (b.texto) el.subtitle = preenche(b.texto, nome).slice(0, 80);
    if (b.imagem) el.image_url = b.imagem;
    return [
      {
        attachment: {
          type: "template",
          payload: { template_type: "generic", elements: [el] },
        },
      },
    ];
  }
  return [];
}

async function enviarDm(tk: string, ig: string, destino: Record<string, string>, message: unknown) {
  return await graph("POST", `${ig}/messages`, tk, { recipient: destino, message });
}

// ─── CRM ─────────────────────────────────────────────────────────────────────
async function contatoCrm(
  sb: any,
  from: { id: string; username: string },
  texto: string,
  extra: Record<string, unknown>,
) {
  try {
    const chave = `ig_${from.id}`;
    const { data: ja } = await sb
      .from("contacts")
      .select("id")
      .eq("manychat_id", chave)
      .maybeSingle();
    let id = ja?.id;
    if (!id) {
      const { data: novo } = await sb
        .from("contacts")
        .insert({
          first_name: from.username,
          manychat_id: chave,
          utm_source: "instagram",
          utm_medium: "comment",
          fonte_registro: "instagram_comentario",
          instagram_opt_in: true,
        })
        .select("id")
        .single();
      id = novo?.id;
    }
    if (id)
      await sb.from("activities").insert({
        contact_id: id,
        type: "note",
        direction: "inbound",
        subject: "Comentário no Instagram",
        body: texto,
        metadata: { source: "instagram", username: from.username, ...extra },
      });
    return id ?? null;
  } catch (_) {
    return null;
  }
}

// ─── núcleo: um comentário ───────────────────────────────────────────────────
async function processarComentario(
  sb: any,
  tk: string,
  ig: string,
  c: { id: string; text: string; from: { id: string; username: string }; media_id: string },
  origem: "webhook" | "varredura",
  automacoes?: any[],
) {
  if (!c.from?.id || c.from.id === ig) return { pulou: "próprio" };
  const lista =
    automacoes ??
    (await sb.from("instagram_automations").select("*").eq("is_active", true)).data ??
    [];
  const auto = lista.find((a: any) => a.post_id === c.media_id && bate(a.palavras, c.text));
  if (!auto) return { pulou: "sem automação" };

  // Reserva o comentário (índice único): se já existe, outra rodada pegou.
  const { data: log, error } = await sb
    .from("instagram_comment_logs")
    .insert({
      automation_id: auto.id,
      comment_id: c.id,
      commenter_username: c.from.username,
      commenter_ig_id: c.from.id,
      comment_text: c.text,
      ig_media_id: c.media_id,
      origem,
      dm_sent: false,
    })
    .select("id")
    .single();
  if (error || !log) return { pulou: "já processado" };

  const nome = c.from.username || "";
  const upd: Record<string, unknown> = {};

  // 1) Resposta pública (sorteada entre as variantes).
  const variantes = (auto.respostas ?? []).filter((x: string) => x?.trim());
  if (!variantes.length && auto.comment_reply) variantes.push(auto.comment_reply);
  if (variantes.length) {
    const texto = preenche(sorteia(variantes), nome);
    try {
      await graph("POST", `${c.id}/replies`, tk, { message: texto });
      upd.resposta_enviada = texto;
    } catch (e) {
      upd.resposta_erro = (e as Error).message;
    }
  }

  // 2) DM: já mandou para essa pessoa nesta automação? Então só a resposta pública.
  const { count: jaDm } = await sb
    .from("instagram_comment_logs")
    .select("id", { count: "exact", head: true })
    .eq("automation_id", auto.id)
    .eq("commenter_ig_id", c.from.id)
    .neq("id", log.id)
    .gt("dm_blocos_enviados", 0);
  let blocos: Bloco[] = Array.isArray(auto.dm) ? auto.dm : [];
  if (!blocos.length && auto.dm_message)
    blocos = [
      { tipo: "texto", texto: `${auto.dm_message}${auto.dm_link ? `\n\n${auto.dm_link}` : ""}` },
    ];
  upd.dm_blocos_total = blocos.length;
  if (jaDm && jaDm > 0) {
    upd.dm_error = "já recebeu a DM desta automação";
    await sb.from("instagram_comment_logs").update(upd).eq("id", log.id);
    return { ok: true, dm: "repetida" };
  }

  let enviados = 0;
  if (blocos.length) {
    // 1º bloco: resposta privada ao comentário (sempre texto).
    try {
      const t = (await blocoComoTexto(sb, blocos[0], nome)) || "Oi! Aqui estão os detalhes:";
      await enviarDm(tk, ig, { comment_id: c.id }, { text: t });
      enviados = 1;
      // Se o 1º bloco era imagem/link, tenta mandar a versão rica logo em seguida.
      if (blocos[0].tipo === "imagem" || blocos[0].tipo === "link") {
        for (const m of await mensagemDe(sb, blocos[0], nome))
          await enviarDm(tk, ig, { id: c.from.id }, m).catch(() => null);
      }
    } catch (e) {
      upd.dm_error = (e as Error).message;
    }
    // Blocos seguintes: só saem se a Meta deixar (conversa aberta); senão ficam na fila.
    if (enviados) {
      const r = await enviarRestante(sb, tk, ig, blocos, enviados, c.from.id, nome);
      enviados = r.enviados;
      if (r.erro && enviados < blocos.length) upd.dm_error = r.erro;
    }
  }
  upd.dm_blocos_enviados = enviados;
  upd.dm_sent = enviados > 0;
  upd.dm_pendente = enviados > 0 && enviados < blocos.length;
  if (enviados >= blocos.length && blocos.length) upd.dm_concluida_em = new Date().toISOString();

  // 3) CRM.
  const contato = await contatoCrm(sb, c.from, c.text, {
    comment_id: c.id,
    media_id: c.media_id,
    automation_id: auto.id,
    dm_blocos: enviados,
  });
  if (contato) upd.contact_id = contato;

  await sb.from("instagram_comment_logs").update(upd).eq("id", log.id);
  await sb.rpc("increment_replies_count", { automation_uuid: auto.id }).catch(() => null);
  await atualizarContadores(sb, auto.id);
  return { ok: true, resposta: upd.resposta_enviada, dm: enviados, pendente: upd.dm_pendente };
}

async function enviarRestante(
  sb: any,
  tk: string,
  ig: string,
  blocos: Bloco[],
  desde: number,
  igsid: string,
  nome: string,
) {
  let enviados = desde;
  for (let i = desde; i < blocos.length; i++) {
    try {
      const msgs = await mensagemDe(sb, blocos[i], nome);
      for (const m of msgs) await enviarDm(tk, ig, { id: igsid }, m);
      enviados = i + 1;
      await new Promise((r) => setTimeout(r, 700)); // ordem garantida e sem parecer rajada
    } catch (e) {
      return { enviados, erro: (e as Error).message };
    }
  }
  return { enviados, erro: null as string | null };
}

async function atualizarContadores(sb: any, automacaoId: string) {
  const { count: dms } = await sb
    .from("instagram_comment_logs")
    .select("id", { count: "exact", head: true })
    .eq("automation_id", automacaoId)
    .gt("dm_blocos_enviados", 0);
  const { count: pend } = await sb
    .from("instagram_comment_logs")
    .select("id", { count: "exact", head: true })
    .eq("automation_id", automacaoId)
    .eq("dm_pendente", true);
  await sb
    .from("instagram_automations")
    .update({
      dms_enviadas: dms ?? 0,
      dms_pendentes: pend ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", automacaoId);
}

/** A pessoa respondeu na DM: solta os blocos que ficaram na fila. */
async function continuarFila(sb: any, tk: string, ig: string, igsid: string, username?: string) {
  let q = sb
    .from("instagram_comment_logs")
    .select("id, automation_id, commenter_ig_id, commenter_username, dm_blocos_enviados")
    .eq("dm_pendente", true);
  q = username
    ? q.or(`commenter_ig_id.eq.${igsid},commenter_username.eq.${username}`)
    : q.eq("commenter_ig_id", igsid);
  const { data: pend } = await q;
  let n = 0;
  for (const l of pend ?? []) {
    const { data: auto } = await sb
      .from("instagram_automations")
      .select("dm")
      .eq("id", l.automation_id)
      .single();
    const blocos: Bloco[] = Array.isArray(auto?.dm) ? auto.dm : [];
    const r = await enviarRestante(
      sb,
      tk,
      ig,
      blocos,
      l.dm_blocos_enviados,
      igsid,
      l.commenter_username ?? "",
    );
    await sb
      .from("instagram_comment_logs")
      .update({
        dm_blocos_enviados: r.enviados,
        dm_pendente: r.enviados < blocos.length,
        dm_error: r.erro,
        commenter_ig_id: igsid,
        dm_concluida_em: r.enviados >= blocos.length ? new Date().toISOString() : null,
      })
      .eq("id", l.id);
    await atualizarContadores(sb, l.automation_id);
    n++;
  }
  return n;
}

// ─── varredura (fallback do webhook) ─────────────────────────────────────────
async function varrer(sb: any) {
  const tk = await token(sb);
  const ig = await contaIg(sb, tk);
  const { data: autos } = await sb
    .from("instagram_automations")
    .select("*")
    .eq("is_active", true)
    .not("post_id", "is", null);
  const res: Record<string, unknown> = { comentarios: 0, novos: 0, fila: 0, erros: [] as string[] };
  const porPost = new Map<string, any[]>();
  for (const a of autos ?? []) porPost.set(a.post_id, [...(porPost.get(a.post_id) ?? []), a]);
  for (const [mediaId, lista] of porPost) {
    const desde = Math.min(...lista.map((a: any) => Date.parse(a.created_at)));
    try {
      const j = await graph("GET", `${mediaId}/comments`, tk, {
        fields:
          "id,text,timestamp,username,from{id,username},replies{id,text,timestamp,username,from{id,username}}",
        limit: 50,
      });
      const todos: any[] = [];
      for (const c of j.data ?? []) {
        todos.push(c);
        for (const r of c.replies?.data ?? []) todos.push(r);
      }
      for (const c of todos) {
        if (Date.parse(c.timestamp) < desde - 60000) continue;
        (res.comentarios as number)++;
        const from = c.from ?? { id: "", username: c.username };
        const r = await processarComentario(
          sb,
          tk,
          ig,
          { id: c.id, text: c.text ?? "", from, media_id: mediaId },
          "varredura",
          lista,
        );
        if ((r as any).ok) (res.novos as number)++;
      }
      await sb
        .from("instagram_automations")
        .update({ varrido_em: new Date().toISOString(), ultimo_erro: null })
        .in(
          "id",
          lista.map((a: any) => a.id),
        );
    } catch (e) {
      const msg = (e as Error).message;
      (res.erros as string[]).push(`${mediaId}: ${msg}`);
      await sb
        .from("instagram_automations")
        .update({ ultimo_erro: msg, varrido_em: new Date().toISOString() })
        .in(
          "id",
          lista.map((a: any) => a.id),
        );
    }
  }
  // Fila: quem respondeu na DM desde a última varredura.
  const { count: pendentes } = await sb
    .from("instagram_comment_logs")
    .select("id", { count: "exact", head: true })
    .eq("dm_pendente", true);
  if (pendentes) {
    try {
      const j = await graph("GET", `${ig}/conversations`, tk, {
        platform: "instagram",
        fields: "participants,updated_time,messages.limit(1){from,created_time}",
        limit: 50,
      });
      for (const conv of j.data ?? []) {
        const outro = (conv.participants?.data ?? []).find((p: any) => p.id !== ig);
        const ultima = conv.messages?.data?.[0];
        if (!outro || !ultima || ultima.from?.id === ig) continue;
        if (Date.now() - Date.parse(ultima.created_time) > 36 * 3600000) continue;
        (res.fila as number) += await continuarFila(sb, tk, ig, outro.id, outro.username);
      }
    } catch (e) {
      (res.erros as string[]).push(`fila: ${(e as Error).message}`);
    }
  }
  return res;
}

// ─── webhook ─────────────────────────────────────────────────────────────────
async function webhook(sb: any, body: any) {
  const tk = await token(sb);
  const ig = await contaIg(sb, tk);
  const out: unknown[] = [];
  for (const entry of body.entry ?? []) {
    for (const ch of entry.changes ?? []) {
      if (ch.field !== "comments" || !ch.value?.id) continue;
      const v = ch.value;
      out.push(
        await processarComentario(
          sb,
          tk,
          ig,
          {
            id: v.id,
            text: v.text ?? "",
            from: { id: v.from?.id ?? "", username: v.from?.username ?? "" },
            media_id: v.media?.id ?? "",
          },
          "webhook",
        ),
      );
    }
    for (const m of entry.messaging ?? []) {
      if (!m.message || m.message.is_echo || !m.sender?.id || m.sender.id === ig) continue;
      await sb
        .from("instagram_dm_eventos")
        .insert({
          ig_user_id: m.sender.id,
          mid: m.message.mid ?? null,
          texto: m.message.text ?? null,
          tipo: m.message.attachments?.length ? "anexo" : "texto",
          bruto: m,
        })
        .then(
          () => null,
          () => null,
        );
      let username: string | undefined;
      try {
        username = (await graph("GET", m.sender.id, tk, { fields: "username" })).username;
      } catch (_) {
        /* perfil pode não estar acessível */
      }
      out.push({
        dm_de: m.sender.id,
        fila: await continuarFila(sb, tk, ig, m.sender.id, username),
      });
    }
  }
  return out;
}

async function status(sb: any) {
  const tk = await token(sb);
  const ig = await contaIg(sb, tk);
  const conta = await graph("GET", ig, tk, { fields: "username" }).catch((e) => ({
    erro: e.message,
  }));
  const dbg = await graph("GET", "debug_token", tk, { input_token: tk }).catch(() => null);
  const scopes: string[] = dbg?.data?.scopes ?? [];
  let assinatura: unknown = null;
  try {
    const pages = await graph("GET", "me/accounts", tk, {
      fields: "id,name,instagram_business_account,subscribed_apps{subscribed_fields}",
    });
    assinatura = (pages.data ?? []).map((p: any) => ({
      pagina: p.name,
      ig: p.instagram_business_account?.id,
      campos: (p.subscribed_apps?.data ?? []).flatMap((s: any) => s.subscribed_fields ?? []),
    }));
  } catch (e) {
    assinatura = { erro: (e as Error).message };
  }
  const { count: ativas } = await sb
    .from("instagram_automations")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return {
    conta,
    permissoes: {
      comentarios: scopes.includes("instagram_manage_comments"),
      mensagens: scopes.includes("instagram_manage_messages"),
    },
    verify_token: (
      await sb
        .from("instagram_config")
        .select("verify_token, webhook_recebido_em")
        .eq("id", 1)
        .maybeSingle()
    ).data,
    webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/ig-automacoes`,
    assinatura,
    automacoes_ativas: ativas ?? 0,
  };
}

async function assinar(sb: any) {
  // Tenta com o token de página (o webhook de comentários é assinado no nível da página).
  const tkPagina = (await segredo(sb, "INSTAGRAM_ACCESS_TOKEN")) || (await token(sb));
  return await graph("POST", "me/subscribed_apps", tkPagina, {
    subscribed_fields: "feed",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    const u = new URL(req.url);
    const { data: cfg } = await sb
      .from("instagram_config")
      .select("verify_token")
      .eq("id", 1)
      .maybeSingle();
    const esperado = cfg?.verify_token || Deno.env.get("INSTAGRAM_VERIFY_TOKEN");
    if (
      u.searchParams.get("hub.mode") === "subscribe" &&
      esperado &&
      u.searchParams.get("hub.verify_token") === esperado
    ) {
      await sb
        .from("instagram_config")
        .update({ webhook_recebido_em: new Date().toISOString() })
        .eq("id", 1);
      return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("ok", { status: 200 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    if (body.object === "instagram" || body.object === "page") {
      await sb
        .from("instagram_config")
        .update({ webhook_recebido_em: new Date().toISOString() })
        .eq("id", 1);
      // Responde rápido à Meta e processa em segundo plano.
      // @ts-ignore EdgeRuntime existe no runtime do Supabase
      EdgeRuntime.waitUntil(webhook(sb, body).catch((e) => console.error("webhook", e)));
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
    if (body.acao === "varrer") return json(await varrer(sb));
    if (body.acao === "status") return json(await status(sb));
    if (body.acao === "assinar") return json(await assinar(sb));
    if (body.acao === "testar") {
      const tk = await token(sb);
      const ig = await contaIg(sb, tk);
      const c = await graph("GET", String(body.comment_id), tk, {
        fields: "id,text,media,from{id,username},username",
      });
      const { data: auto } = await sb
        .from("instagram_automations")
        .select("*")
        .eq("id", body.automacao_id)
        .single();
      if (!auto) return json({ error: "automação não encontrada" }, 404);
      return json(
        await processarComentario(
          sb,
          tk,
          ig,
          {
            id: c.id,
            text: c.text ?? "",
            from: c.from ?? { id: "", username: c.username },
            media_id: auto.post_id,
          },
          "varredura",
          [{ ...auto, palavras: [] }],
        ),
      );
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
