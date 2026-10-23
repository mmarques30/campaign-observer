// vedit-pesquisa — Edição → Pesquisa de nicho.
// Acha os Reels que mais viralizaram nos perfis/hashtags do nicho (Instagram Graph API oficial,
// com o token que já publica os Reels), explica por que funcionaram e escreve um roteiro original
// para a IAplicada. Ações:
//   sugerir_perfis {}            → Claude propõe perfis do nicho; só entram os que a API valida
//   perfil { username }          → valida e cadastra um perfil
//   coletar {}                   → business_discovery dos perfis ativos + top_media das hashtags
//   analisar { ids: [] }         → por que funcionou + roteiro original (até 8 por chamada)
//   enviar_marketing { id }      → cria o roteiro em content_items (página de Marketing)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODELO = Deno.env.get("VEDIT_MODELO") || "claude-opus-5";
const V = "v20.0";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function token(sb: any) {
  const { data } = await sb.rpc("get_secret", { secret_name: "META_ADS_TOKEN" });
  const t = data ?? Deno.env.get("META_ACCESS_TOKEN");
  if (!t) throw new Error("META_ADS_TOKEN não encontrado");
  return t as string;
}
async function igUserId(sb: any, tk: string) {
  const fixo = Deno.env.get("IG_USER_ID");
  if (fixo) return fixo;
  const { data } = await sb.rpc("get_secret", { secret_name: "META_IG_ACCOUNT_ID" });
  if (data) return data as string;
  const r = await fetch(
    `https://graph.facebook.com/${V}/me/accounts?fields=instagram_business_account&access_token=${tk}`,
  );
  const j = await r.json();
  const id = (j.data ?? []).find((p: any) => p.instagram_business_account)?.instagram_business_account?.id;
  if (!id) throw new Error("conta Instagram business não encontrada");
  return id as string;
}
async function graph(path: string, params: Record<string, string>, tk: string) {
  const qs = new URLSearchParams({ ...params, access_token: tk });
  const r = await fetch(`https://graph.facebook.com/${V}/${path}?${qs}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error?.message ?? `Graph ${r.status}`);
  return j;
}
const CAMPOS_MEDIA =
  "id,caption,like_count,comments_count,media_type,media_product_type,permalink,timestamp,thumbnail_url,media_url";

async function logUso(sb: any, origem: string, usage: any) {
  try {
    const input = usage?.input_tokens ?? 0,
      output = usage?.output_tokens ?? 0;
    if (!input && !output) return;
    await sb.from("api_usage_log").insert({
      provider: "anthropic",
      origem,
      model: MODELO,
      input_tokens: input,
      output_tokens: output,
      custo_usd: (input * 5 + output * 25) / 1_000_000,
    });
  } catch (_) {
    /* telemetria */
  }
}
async function claude(sb: any, key: string, body: any, origem: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELO, ...body }),
  });
  const txt = await r.text();
  let j: any = null;
  try {
    j = JSON.parse(txt);
  } catch (_) {
    /* */
  }
  await logUso(sb, origem, j?.usage);
  if (!r.ok) throw new Error(`Claude ${r.status}: ${txt.slice(0, 300)}`);
  return j;
}

// ─── perfis ────────────────────────────────────────────────────────────────
async function descobrir(username: string, ig: string, tk: string, limite = 40) {
  const u = username.replace(/^@/, "").trim();
  const j = await graph(
    ig,
    {
      fields: `business_discovery.username(${u}){id,username,name,followers_count,media_count,media.limit(${limite}){${CAMPOS_MEDIA}}}`,
    },
    tk,
  );
  return j.business_discovery as any;
}

async function cadastrarPerfil(sb: any, username: string, origem: "manual" | "sugerido", ig: string, tk: string) {
  const d = await descobrir(username, ig, tk, 1);
  const { data, error } = await sb
    .from("vedit_nicho_perfis")
    .upsert(
      {
        username: d.username,
        nome: d.name ?? null,
        ig_user_id: d.id,
        followers: d.followers_count ?? null,
        media_count: d.media_count ?? null,
        origem,
        ativo: true,
        erro: null,
      },
      { onConflict: "username" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function sugerirPerfis(sb: any, key: string, ig: string, tk: string) {
  const { data: cfg } = await sb.from("vedit_nicho_config").select("*").eq("id", 1).single();
  const { data: atuais } = await sb.from("vedit_nicho_perfis").select("username");
  const j = await claude(
    sb,
    key,
    {
      max_tokens: 1500,
      system:
        "Você conhece criadores de conteúdo brasileiros do Instagram. Sugira perfis (usernames exatos, sem @) de criadores com conteúdo no nicho descrito, com Reels frequentes e boa tração. Prefira contas business/creator conhecidas. Não invente: se não tem certeza do username, não inclua.",
      tools: [
        {
          name: "sugerir",
          input_schema: {
            type: "object",
            properties: { usernames: { type: "array", items: { type: "string" }, maxItems: 20 } },
            required: ["usernames"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "sugerir" },
      messages: [
        {
          role: "user",
          content: `NICHO: ${cfg?.nicho ?? "IA aplicada a negócios no Brasil"}\nPÚBLICO: ${cfg?.publico ?? "donos de empresas"}\nJÁ MONITORADOS (não repetir): ${(atuais ?? []).map((p: any) => p.username).join(", ") || "(nenhum)"}\nSugira até 15 usernames.`,
        },
      ],
    },
    "vedit-pesquisa:sugerir",
  );
  const lista: string[] = j.content?.find((c: any) => c.type === "tool_use")?.input?.usernames ?? [];
  const validos: any[] = [],
    invalidos: string[] = [];
  for (const u of lista.slice(0, 15)) {
    try {
      validos.push(await cadastrarPerfil(sb, u, "sugerido", ig, tk));
    } catch (_) {
      invalidos.push(u);
    }
  }
  return { validos, invalidos };
}

// ─── coleta ────────────────────────────────────────────────────────────────
const mediana = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function coletar(sb: any, ig: string, tk: string) {
  const { data: cfg } = await sb.from("vedit_nicho_config").select("*").eq("id", 1).single();
  const { data: perfis } = await sb.from("vedit_nicho_perfis").select("*").eq("ativo", true);
  const desde = Date.now() - (cfg?.dias_janela ?? 90) * 86400_000;
  let total = 0;
  const erros: string[] = [];
  for (const p of perfis ?? []) {
    try {
      const d = await descobrir(p.username, ig, tk, 50);
      const midias = (d.media?.data ?? []).filter(
        (m: any) => m.media_product_type === "REELS" || m.media_type === "VIDEO",
      );
      const med = mediana(midias.map((m: any) => (m.like_count ?? 0) + (m.comments_count ?? 0)));
      const followers = d.followers_count ?? p.followers ?? 0;
      const linhas = midias
        .filter((m: any) => new Date(m.timestamp).getTime() >= desde)
        .map((m: any) => {
          const eng = (m.like_count ?? 0) + (m.comments_count ?? 0);
          return {
            perfil_id: p.id,
            origem: "perfil",
            ig_media_id: m.id,
            username: d.username,
            permalink: m.permalink,
            caption: m.caption ?? null,
            media_type: m.media_type,
            media_product_type: m.media_product_type,
            thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
            media_url: m.media_url ?? null,
            like_count: m.like_count ?? 0,
            comments_count: m.comments_count ?? 0,
            publicado_em: m.timestamp,
            indice: med ? +(eng / med).toFixed(2) : null,
            taxa: followers ? +(eng / followers).toFixed(5) : null,
            coletado_em: new Date().toISOString(),
          };
        });
      if (linhas.length) {
        const { error } = await sb.from("vedit_nicho_reels").upsert(linhas, { onConflict: "ig_media_id" });
        if (error) throw new Error(error.message);
      }
      total += linhas.length;
      await sb
        .from("vedit_nicho_perfis")
        .update({
          followers,
          media_count: d.media_count ?? p.media_count,
          nome: d.name ?? p.nome,
          mediana_engajamento: med,
          ultima_coleta: new Date().toISOString(),
          erro: null,
        })
        .eq("id", p.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      erros.push(`@${p.username}: ${msg}`);
      await sb.from("vedit_nicho_perfis").update({ erro: msg.slice(0, 300) }).eq("id", p.id);
    }
  }
  // Hashtags: top_media (limite do Meta: 30 hashtags distintas por 7 dias).
  for (const h of (cfg?.hashtags ?? []).slice(0, 10)) {
    try {
      const tag = String(h).replace(/^#/, "").trim();
      if (!tag) continue;
      const s = await graph("ig_hashtag_search", { user_id: ig, q: tag }, tk);
      const hid = s.data?.[0]?.id;
      if (!hid) continue;
      const top = await graph(`${hid}/top_media`, { user_id: ig, fields: CAMPOS_MEDIA + ",username", limit: "30" }, tk);
      const linhas = (top.data ?? [])
        .filter((m: any) => m.media_product_type === "REELS" || m.media_type === "VIDEO")
        .map((m: any) => ({
          origem: "hashtag",
          hashtag: tag,
          ig_media_id: m.id,
          username: m.username ?? null,
          permalink: m.permalink,
          caption: m.caption ?? null,
          media_type: m.media_type,
          media_product_type: m.media_product_type,
          thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
          media_url: m.media_url ?? null,
          like_count: m.like_count ?? 0,
          comments_count: m.comments_count ?? 0,
          publicado_em: m.timestamp,
          coletado_em: new Date().toISOString(),
        }));
      if (linhas.length) {
        // Não sobrescreve perfil_id/indice de reels que já vieram de um perfil monitorado.
        const { error } = await sb
          .from("vedit_nicho_reels")
          .upsert(linhas, { onConflict: "ig_media_id", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      total += linhas.length;
    } catch (e) {
      erros.push(`#${h}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  await sb.from("vedit_nicho_config").update({ ultima_busca: new Date().toISOString() }).eq("id", 1);
  return { coletados: total, erros };
}

// ─── análise + roteiro original ────────────────────────────────────────────
const FERRAMENTA_ANALISE = {
  name: "registrar",
  description: "Para cada reel, por que funcionou e um roteiro original para a IAplicada.",
  input_schema: {
    type: "object",
    properties: {
      itens: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            analise: {
              type: "object",
              properties: {
                resumo: { type: "string", description: "1 frase: o que o reel entrega." },
                gancho: { type: "string", description: "A promessa/gancho inferida da legenda e do título." },
                mecanismo: {
                  type: "string",
                  description: "Por que viralizou: curiosidade, dor, novidade, prova, polêmica, lista, tutorial, etc.",
                },
                estrutura: { type: "string", description: "Como o conteúdo é organizado (gancho → passos → CTA…)." },
                cta: { type: "string" },
                transferivel: {
                  type: "string",
                  description: "O que dá para transferir para a IAplicada e o que não dá.",
                },
              },
              required: ["resumo", "gancho", "mecanismo", "estrutura", "transferivel"],
            },
            roteiro: {
              type: "object",
              properties: {
                titulo: { type: "string", description: "Nome curto do roteiro (sem acento, padrão 'gancho curto')." },
                gancho: { type: "string", description: "Primeiras 1–2 frases faladas (≤ 3 s)." },
                falas: { type: "string", description: "Roteiro falado completo, em primeira pessoa, 30–60 s, parágrafos curtos." },
                cta: { type: "string" },
                palavra_chave: { type: ["string", "null"], description: "Palavra para 'comenta X', se fizer sentido." },
                legenda: { type: "string", description: "Legenda do post, sem emojis." },
                formato: { type: "string", description: "Ex.: falando para a câmera + prints; lista; bastidor." },
                efeitos_sugeridos: {
                  type: "array",
                  items: { type: "string" },
                  description: "Comandos do editor (/titulo, /checklist, /celular…) com o momento.",
                },
                finalidade: { type: "string", enum: ["organico", "anuncio"] },
              },
              required: ["titulo", "gancho", "falas", "cta", "legenda", "formato", "finalidade"],
            },
          },
          required: ["id", "analise", "roteiro"],
        },
      },
    },
    required: ["itens"],
  },
};

async function analisar(sb: any, key: string, ids: string[]) {
  const { data: reels } = await sb.from("vedit_nicho_reels").select("*").in("id", ids.slice(0, 8));
  if (!reels?.length) return json({ error: "nenhum reel" }, 400);
  const { data: cfg } = await sb.from("vedit_nicho_config").select("*").eq("id", 1).single();
  const { data: marca } = await sb.from("vedit_marcas").select("instrucoes").eq("padrao", true).maybeSingle();
  const { data: catalogo } = await sb
    .from("content_items")
    .select("titulo, finalidade, roteiro")
    .not("roteiro", "is", null)
    .order("updated_at", { ascending: false })
    .limit(6);
  const exemplos = (catalogo ?? [])
    .map((c: any) => `- "${c.titulo}" (${c.finalidade}): ${String(c.roteiro).replace(/\s+/g, " ").slice(0, 300)}`)
    .join("\n");
  const lista = reels
    .map(
      (r: any) =>
        `### id ${r.id}\n@${r.username ?? "?"} · ${r.like_count} curtidas · ${r.comments_count} comentários · índice ${r.indice ?? "?"}x acima do normal do perfil · ${r.publicado_em?.slice(0, 10)}\nLEGENDA: ${(r.caption ?? "").slice(0, 900) || "(sem legenda)"}`,
    )
    .join("\n\n");
  const j = await claude(
    sb,
    key,
    {
      max_tokens: 8000,
      system: `Você é estrategista de conteúdo da IAplicada (IA aplicada a negócios, para donos de empresas no Brasil). Recebe Reels que viralizaram no nicho, com legenda e métricas, e faz duas coisas por reel: (1) explica POR QUE funcionou (gancho, mecanismo psicológico, estrutura, CTA) e o que é transferível; (2) escreve um ROTEIRO ORIGINAL para a Mariana gravar — nunca cópia: mesma mecânica, tema e exemplo nossos (IA no dia a dia de empresa: WhatsApp, CRM, vendas, atendimento, automação, Claude). Regras de voz: português do Brasil, direto, sem jargão, sem emojis, nunca a palavra "PME" (use "empresa"), nunca "teu/tua". Orgânico termina pedindo comentário com palavra-chave; anúncio termina chamando para agendar um diagnóstico com a IAplicada. Fale como a Mariana: experiência de executiva, exemplos concretos, números quando houver.
${marca?.instrucoes ? `MARCA: ${marca.instrucoes}` : ""}
NICHO: ${cfg?.nicho ?? "IA aplicada a negócios"} · PÚBLICO: ${cfg?.publico ?? "donos de empresa"}
EXEMPLOS DE ROTEIROS NOSSOS (para o tom):\n${exemplos || "(nenhum)"}`,
      tools: [FERRAMENTA_ANALISE],
      tool_choice: { type: "tool", name: "registrar" },
      messages: [{ role: "user", content: `REELS:\n\n${lista}\n\nAnalise todos e chame registrar.` }],
    },
    "vedit-pesquisa:analisar",
  );
  const itens: any[] = j.content?.find((c: any) => c.type === "tool_use")?.input?.itens ?? [];
  let n = 0;
  for (const it of itens) {
    if (!ids.includes(it.id)) continue;
    const { error } = await sb
      .from("vedit_nicho_reels")
      .update({ analise: it.analise, roteiro: it.roteiro })
      .eq("id", it.id);
    if (!error) n++;
  }
  return json({ ok: true, analisados: n });
}

async function enviarMarketing(sb: any, id: string) {
  const { data: r } = await sb.from("vedit_nicho_reels").select("*").eq("id", id).single();
  if (!r?.roteiro) return json({ error: "analise o reel antes" }, 400);
  const ro = r.roteiro;
  const texto = `GANCHO: ${ro.gancho}\n\n${ro.falas}\n\nCTA: ${ro.cta}`;
  const { data: ci, error } = await sb
    .from("content_items")
    .insert({
      titulo: ro.titulo,
      descricao: `Inspirado em @${r.username} (${r.permalink}). Por que funcionou: ${r.analise?.mecanismo ?? ""} — ${r.analise?.resumo ?? ""}`,
      tipo_video: "reel",
      categoria: "reels",
      plataforma: "instagram",
      plataformas: ["instagram"],
      status: "backlog",
      finalidade: ro.finalidade ?? "organico",
      produto: "business",
      link_referencia: r.permalink,
      roteiro: texto,
      legenda: ro.legenda ?? null,
      auto_resposta_palavra_chave: ro.palavra_chave ?? null,
      auto_resposta_ativa: !!ro.palavra_chave,
      recomendacoes_edicao: [ro.formato, ...(ro.efeitos_sugeridos ?? [])].filter(Boolean).join("\n"),
    })
    .select("id")
    .single();
  if (error) return json({ error: error.message }, 500);
  await sb.from("vedit_nicho_reels").update({ content_item_id: ci.id }).eq("id", id);
  return json({ ok: true, content_item_id: ci.id });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const { acao } = body as { acao?: string };
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY") || "";
    if (acao === "analisar") return await analisar(sb, key, body.ids ?? []);
    if (acao === "enviar_marketing") return await enviarMarketing(sb, body.id);
    const tk = await token(sb);
    const ig = await igUserId(sb, tk);
    if (acao === "perfil") return json(await cadastrarPerfil(sb, body.username, "manual", ig, tk));
    if (acao === "sugerir_perfis") return json(await sugerirPerfis(sb, key, ig, tk));
    if (acao === "coletar") return json(await coletar(sb, ig, tk));
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
