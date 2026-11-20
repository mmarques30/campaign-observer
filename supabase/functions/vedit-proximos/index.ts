// vedit-proximos — Próximos conteúdos.
// Lê o desempenho do que já saiu (posts orgânicos do Instagram da conta e anúncios Meta com o
// resultado no CRM: leads, MQL, vendas), separa o que funcionou do que não funcionou e pede ao
// Claude as próximas pautas, separadas em anúncio e orgânico, cada uma apoiada nos posts que
// performaram e numa referência salva para servir de estrutura.
//   { acao: "gerar" }  → cria a linha (status gerando) e roda em segundo plano
// A tela lê a linha mais recente da empresa ativa direto do banco.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODELO = Deno.env.get("VEDIT_MODELO") || "claude-opus-5";
const V = "v21.0";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function segredo(sb: any, nome: string) {
  try {
    const { data } = await sb.rpc("get_secret", { secret_name: nome });
    return String((typeof data === "string" ? data : data?.secret) || "").replace(/^"|"$/g, "");
  } catch {
    return "";
  }
}
async function graph(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: token })) url.searchParams.set(k, v);
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.message || `Graph ${r.status}`);
  return j;
}

// ─── Orgânico: posts da conta do Instagram com as métricas de cada um ──────────────────────
const METRICAS = [
  ["reach", "views", "saved", "shares", "total_interactions", "follows", "profile_visits"],
  ["reach", "views", "saved", "shares", "total_interactions"],
  ["reach", "saved", "shares", "total_interactions"],
  ["reach", "saved"],
];
async function postsOrganicos(sb: any) {
  const token = (await segredo(sb, "META_ADS_TOKEN")) || Deno.env.get("META_ACCESS_TOKEN") || "";
  let ig = Deno.env.get("IG_USER_ID") || (await segredo(sb, "META_IG_ACCOUNT_ID"));
  if (!token) return { posts: [], erro: "sem acesso à conta do Instagram" };
  if (!ig) {
    const j = await graph("me/accounts", token, { fields: "instagram_business_account", limit: "50" }).catch(() => null);
    ig = (j?.data ?? []).find((p: any) => p.instagram_business_account)?.instagram_business_account?.id ?? "";
  }
  if (!ig) return { posts: [], erro: "conta do Instagram não configurada" };
  const desde = Date.now() - 180 * 864e5;
  const lista: any[] = [];
  let pag: any = await graph(`${ig}/media`, token, {
    fields: "id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count",
    limit: "50",
  });
  while (pag && lista.length < 90) {
    for (const m of pag.data ?? []) if (new Date(m.timestamp).getTime() >= desde) lista.push(m);
    const ultimo = pag.data?.[pag.data.length - 1];
    if (!pag.paging?.next || !ultimo || new Date(ultimo.timestamp).getTime() < desde) break;
    pag = await fetch(pag.paging.next, { signal: AbortSignal.timeout(20000) }).then((r) => r.json()).catch(() => null);
  }
  const medir = async (m: any) => {
    const met: Record<string, number> = { likes: Number(m.like_count ?? 0), comments: Number(m.comments_count ?? 0) };
    for (const c of METRICAS) {
      try {
        const j = await graph(`${m.id}/insights`, token, { metric: c.join(",") });
        for (const d of j.data ?? []) met[d.name] = Number(d.values?.[0]?.value ?? d.total_value?.value ?? 0);
        break;
      } catch {
        /* tenta um conjunto menor (nem todo tipo de post aceita todas) */
      }
    }
    return {
      id: m.id,
      tipo: m.media_product_type === "REELS" ? "reel" : m.media_type === "CAROUSEL_ALBUM" ? "carrossel" : m.media_type === "VIDEO" ? "video" : "post",
      data: String(m.timestamp).slice(0, 10),
      link: m.permalink,
      texto: String(m.caption ?? "").replace(/\s+/g, " ").slice(0, 400),
      metricas: met,
    };
  };
  const posts: any[] = [];
  for (let i = 0; i < lista.length; i += 8) posts.push(...(await Promise.all(lista.slice(i, i + 8).map(medir))));
  // Nota de desempenho: o que espalha (envios, salvamentos, seguidores) pesa mais que curtida.
  for (const p of posts) {
    const m = p.metricas;
    const alc = Math.max(1, Number(m.reach ?? 0));
    p.alcance = Number(m.reach ?? 0);
    p.taxa = ((Number(m.saved ?? 0) * 3 + Number(m.shares ?? 0) * 4 + Number(m.follows ?? 0) * 6 + Number(m.comments ?? 0) * 2 + Number(m.likes ?? 0)) / alc) * 100;
  }
  const alcances = posts.map((p) => p.alcance).sort((a, b) => a - b);
  const medAlc = alcances[Math.floor(alcances.length / 2)] || 1;
  for (const p of posts) p.nota = Math.round((Math.log2(1 + p.alcance / medAlc) * 50 + Math.min(50, p.taxa * 5)) * 10) / 10;
  posts.sort((a, b) => b.nota - a.nota);
  return { posts, erro: null };
}

// ─── Anúncios: métricas da Meta + funil no CRM ────────────────────────────────────────────
async function anuncios(sb: any) {
  const { data: met } = await sb
    .from("mads_v_criativos_metricas")
    .select("ad_uuid, meta_ad_id, ad_nome, campanha_nome, gasto, impressoes, alcance, cliques_link, leads, mql_no_crm, sal_no_crm, ganhos_no_crm, valor_ganho_brl, hook_rate_pct, ctr_real_pct, cpl_brl, cpmql_brl, desde, ate")
    .gt("gasto", 0)
    .limit(300);
  const lista = (met ?? []) as any[];
  const ids = lista.map((a) => a.ad_uuid).filter(Boolean);
  const { data: ads } = ids.length ? await sb.from("mads_ads").select("id, creative_id").in("id", ids) : { data: [] };
  const crIds = (ads ?? []).map((a: any) => a.creative_id).filter(Boolean);
  const { data: crs } = crIds.length
    ? await sb.from("mads_creatives").select("id, formato, titulo, texto_principal").in("id", crIds)
    : { data: [] };
  const crPorAd = new Map((ads ?? []).map((a: any) => [a.id, (crs ?? []).find((c: any) => c.id === a.creative_id)]));
  // O vídeo ou criativo que gerou o anúncio (fala do vídeo, roteiro do criativo).
  const { data: pubs } = await sb.from("publicacoes").select("origem, ref_id, meta_ad_id").not("meta_ad_id", "is", null);
  const pubPorAd = new Map((pubs ?? []).map((p: any) => [String(p.meta_ad_id), p]));
  const vidIds = (pubs ?? []).filter((p: any) => p.origem === "video").map((p: any) => p.ref_id);
  const criIds = (pubs ?? []).filter((p: any) => p.origem !== "video").map((p: any) => p.ref_id);
  const { data: vids } = vidIds.length ? await sb.from("vedit_projetos").select("id, transcricao_texto").in("id", vidIds) : { data: [] };
  const { data: cris } = criIds.length ? await sb.from("cria_projetos").select("id, roteiro, briefing").in("id", criIds) : { data: [] };
  const conteudo = (adId: string) => {
    const p: any = pubPorAd.get(String(adId));
    if (!p) return "";
    if (p.origem === "video") return String((vids ?? []).find((v: any) => v.id === p.ref_id)?.transcricao_texto ?? "").slice(0, 500);
    const c: any = (cris ?? []).find((v: any) => v.id === p.ref_id);
    return String(c?.roteiro || c?.briefing || "").replace(/\s+/g, " ").slice(0, 500);
  };
  const out: any[] = lista.map((a) => {
    const cr: any = crPorAd.get(a.ad_uuid);
    const pub: any = pubPorAd.get(String(a.meta_ad_id));
    return {
      id: String(a.meta_ad_id),
      nome: a.ad_nome,
      campanha: a.campanha_nome,
      formato: pub?.origem === "video" || /video/i.test(cr?.formato ?? "") ? "video" : "criativo",
      texto: [cr?.titulo, cr?.texto_principal].filter(Boolean).join(" — ").replace(/\s+/g, " ").slice(0, 400),
      conteudo: conteudo(a.meta_ad_id),
      gasto: Number(a.gasto ?? 0),
      leads: Number(a.leads ?? 0),
      mql: Number(a.mql_no_crm ?? 0),
      sal: Number(a.sal_no_crm ?? 0),
      vendas: Number(a.ganhos_no_crm ?? 0),
      receita: Number(a.valor_ganho_brl ?? 0),
      cpl: a.cpl_brl != null ? Number(a.cpl_brl) : null,
      cpmql: a.cpmql_brl != null ? Number(a.cpmql_brl) : null,
      gancho: a.hook_rate_pct != null ? Number(a.hook_rate_pct) : null,
      ctr: a.ctr_real_pct != null ? Number(a.ctr_real_pct) : null,
      periodo: `${a.desde ?? ""} a ${a.ate ?? ""}`,
    };
  });
  // Ordem: receita e vendas primeiro, depois MQL (o KPI do Business é custo por MQL), depois leads.
  for (const a of out)
    a.nota = Math.round(
      (a.receita > 0 ? 1000 + a.receita / 100 : 0) + a.vendas * 300 + a.sal * 60 +
        (a.mql ? a.mql * 40 - Math.min(30, (a.cpmql ?? 0) / 20) : 0) + a.leads * 3 + (a.gancho ?? 0) / 5,
    );
  out.sort((x, y) => y.nota - x.nota);
  return out;
}

const SCHEMA_SUGESTAO = {
  type: "object",
  properties: {
    titulo: { type: "string", description: "A pauta em uma frase (o assunto do próximo conteúdo)." },
    formato: { type: "string", enum: ["reel", "carrossel", "post"] },
    gancho: { type: "string", description: "A primeira frase/tela, pronta para usar." },
    estrutura: { type: "string", description: "Como o conteúdo se desenrola, em até 3 frases." },
    por_que: { type: "string", description: "O padrão dos posts que performaram que esta pauta repete, citando números reais deles." },
    baseado_em: { type: "array", items: { type: "string" }, description: "ids dos posts/anúncios que apoiam a pauta." },
    referencia_id: { type: ["string", "null"], description: "id de UMA referência salva da lista (vídeo para reel, carrossel para carrossel/post) cuja estrutura serve; null se nenhuma serve." },
    meta: { type: "string", description: "O que medir para saber se funcionou (ex.: MQL, salvamentos, envios)." },
  },
  required: ["titulo", "formato", "gancho", "estrutura", "por_que", "baseado_em", "meta"],
};
const SCHEMA = {
  type: "object",
  properties: {
    anuncio: {
      type: "object",
      properties: {
        padroes: { type: "array", items: { type: "string" }, description: "3 a 5 padrões do que deu resultado (e do que não deu) nos anúncios, com números." },
        sugestoes: { type: "array", items: SCHEMA_SUGESTAO, description: "5 pautas de anúncio." },
      },
    },
    organico: {
      type: "object",
      properties: {
        padroes: { type: "array", items: { type: "string" } },
        sugestoes: { type: "array", items: SCHEMA_SUGESTAO, description: "5 pautas de orgânico." },
      },
    },
  },
  required: ["anuncio", "organico"],
};

async function gerar(sb: any, linhaId: string, empresa: any) {
  const [org, ads] = await Promise.all([
    empresa.interna ? postsOrganicos(sb).catch((e) => ({ posts: [], erro: (e as Error).message })) : Promise.resolve({ posts: [], erro: "Instagram da empresa não conectado" }),
    empresa.interna ? anuncios(sb) : Promise.resolve([]),
  ]);
  const { data: marca } = await sb.from("vedit_marcas").select("*").eq("empresa_id", empresa.id).order("padrao", { ascending: false }).limit(1).maybeSingle();
  const { data: refsV } = await sb
    .from("vedit_referencias")
    .select("id, autor, titulo, analise")
    .eq("status", "pronta")
    .not("palavras", "is", null)
    .order("created_at", { ascending: false })
    .limit(40);
  const { data: refsC } = await sb.from("cria_referencias").select("id, autor, analise").eq("status", "pronta").order("created_at", { ascending: false }).limit(25);
  const refs = [
    ...(refsV ?? []).map((r: any) => ({ id: r.id, tipo: "video", txt: `${r.autor ? "@" + r.autor : ""} ${r.titulo ?? ""} — ${r.analise?.estilo?.nome ?? ""}: ${String(r.analise?.resumo ?? "").slice(0, 160)}` })),
    ...(refsC ?? []).map((r: any) => ({ id: r.id, tipo: "carrossel", txt: `${r.autor ? "@" + r.autor : ""} — ${typeof r.analise?.estilo === "string" ? r.analise.estilo : ""} ${String(r.analise?.resumo ?? "").slice(0, 160)}` })),
  ];
  const dados = {
    organico: { erro: org.erro, total: org.posts.length, melhores: org.posts.slice(0, 8), piores: org.posts.slice(-4).reverse() },
    anuncio: { total: ads.length, melhores: ads.slice(0, 8), piores: ads.filter((a: any) => a.gasto >= 30).slice(-4).reverse() },
  };
  await sb.from("vedit_proximos").update({ dados }).eq("id", linhaId);
  if (!org.posts.length && !ads.length) {
    await sb.from("vedit_proximos").update({ status: "sem_dados", erro: org.erro ?? "sem posts nem anúncios com resultado" }).eq("id", linhaId);
    return;
  }
  const perfil = marca
    ? [marca.o_que_faz && `O que faz: ${marca.o_que_faz}`, marca.nicho && `Nicho: ${marca.nicho}`, marca.publico && `Público: ${marca.publico}`, marca.objetivo && `Objetivo: ${marca.objetivo}`].filter(Boolean).join("\n")
    : "";
  const linhaOrg = (p: any) =>
    `[${p.id}] ${p.tipo} ${p.data} · alcance ${p.alcance} · salv ${p.metricas.saved ?? 0} · envios ${p.metricas.shares ?? 0} · seguidores ${p.metricas.follows ?? "?"} · coment ${p.metricas.comments ?? 0} · curt ${p.metricas.likes ?? 0} · nota ${p.nota}\n   "${p.texto.slice(0, 260)}"`;
  const linhaAd = (a: any) =>
    `[${a.id}] ${a.formato} "${a.nome}" · gasto R$${a.gasto.toFixed(0)} · leads ${a.leads} · MQL ${a.mql}${a.cpmql ? ` (R$${a.cpmql.toFixed(0)}/MQL)` : ""} · SAL ${a.sal} · vendas ${a.vendas}${a.receita ? ` (R$${a.receita.toFixed(0)})` : ""} · gancho ${a.gancho != null ? a.gancho.toFixed(0) + "%" : "?"} · CTR ${a.ctr != null ? a.ctr.toFixed(2) + "%" : "?"}\n   texto: "${a.texto.slice(0, 220)}"${a.conteudo ? `\n   conteúdo: "${a.conteudo.slice(0, 300)}"` : ""}`;
  const prompt = `${perfil ? `EMPRESA:\n${perfil}\n\n` : ""}ORGÂNICO (Instagram, últimos 6 meses, ${org.posts.length} posts; nota = alcance relativo + salvamentos/envios/seguidores por alcance):\n${org.posts.length ? `MELHORES:\n${org.posts.slice(0, 12).map(linhaOrg).join("\n")}\nPIORES:\n${org.posts.slice(-6).map(linhaOrg).join("\n")}` : `(sem dados: ${org.erro})`}\n\nANÚNCIOS (Meta, com o funil no CRM; ordenados por vendas, depois MQL, depois leads):\nMELHORES:\n${ads.slice(0, 12).map(linhaAd).join("\n") || "(nenhum)"}\nPIORES (gasto ≥ R$30):\n${ads.filter((a: any) => a.gasto >= 30).slice(-6).map(linhaAd).join("\n") || "(nenhum)"}\n\nREFERÊNCIAS SALVAS (estruturas disponíveis):\n${refs.map((r) => `${r.id} (${r.tipo}) ${r.txt}`).join("\n") || "(nenhuma)"}\n\nCrie as próximas pautas. Regras:\n- Anúncio e orgânico são separados: anúncio é julgado por MQL, vendas e custo por MQL (não por curtida); orgânico por alcance, salvamentos, envios e seguidores.\n- Cada pauta repete um padrão que os números mostram (assunto, ângulo, tipo de gancho, formato) e o por_que cita os números reais dos posts que apoiam. Nada de número inventado; se a amostra é pequena, diga.\n- Evite repetir o que foi mal (use os piores para saber o que não fazer).\n- Pautas novas: não repita o tema de um post existente, desdobre o que funcionou.\n- Português do Brasil, direto, sem emojis, nunca a sigla PME (use "empresa"), sem tom de anúncio genérico.\n- referencia_id só de um id da lista acima (vídeo para reel; carrossel para carrossel/post).\nResponda SOMENTE com JSON válido neste schema:\n${JSON.stringify(SCHEMA)}`;
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 8000,
      system: "Você é estrategista de conteúdo e mídia paga. Lê números reais de desempenho e transforma o que funcionou em próximas pautas concretas. Só afirma o que os dados mostram.",
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(140000),
  });
  const j = await r.json().catch(() => null);
  try {
    const u = j?.usage;
    if (u)
      await sb.from("api_usage_log").insert({
        provider: "anthropic",
        empresa_id: empresa.id,
        origem: "vedit-proximos",
        model: MODELO,
        input_tokens: u.input_tokens ?? 0,
        output_tokens: u.output_tokens ?? 0,
        custo_usd: ((u.input_tokens ?? 0) * 5 + (u.output_tokens ?? 0) * 25) / 1_000_000,
      });
  } catch {
    /* telemetria não derruba */
  }
  if (!r.ok) throw new Error(`Claude ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const txt = (j?.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  const sug = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
  const idsRef = new Set(refs.map((x) => x.id));
  for (const lado of ["anuncio", "organico"])
    for (const s of sug?.[lado]?.sugestoes ?? []) if (s.referencia_id && !idsRef.has(s.referencia_id)) s.referencia_id = null;
  await sb.from("vedit_proximos").update({ sugestoes: sug, status: "pronta", erro: null }).eq("id", linhaId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const body = await req.json().catch(() => ({}));
  let empresa: any = null;
  // Chamada interna (agendamento no banco, com a chave de serviço): empresa vem no corpo.
  const ehServico = async () => {
    if (!jwt) return false;
    if (jwt === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
    try {
      const claims = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (claims?.role !== "service_role") return false;
      // Confere a assinatura de verdade: só a chave de serviço consegue listar usuários.
      const { error } = await createClient(Deno.env.get("SUPABASE_URL")!, jwt).auth.admin.listUsers({ perPage: 1 });
      return !error;
    } catch {
      return false;
    }
  };
  if (await ehServico()) {
    const q = sb.from("mads_empresas").select("id, interna");
    ({ data: empresa } = await (body.empresa_id ? q.eq("id", body.empresa_id) : q.eq("interna", true)).limit(1).maybeSingle());
  } else {
    const { data: u } = jwt ? await sb.auth.getUser(jwt) : { data: null };
    const uid = (u as any)?.user?.id;
    if (!uid) return json({ error: "faça login de novo" }, 401);
    const { data: empId } = await sb.rpc("mads_empresa_ativa_de", { _uid: uid });
    ({ data: empresa } = await sb.from("mads_empresas").select("id, interna").eq("id", empId).maybeSingle());
  }
  if (!empresa) return json({ error: "empresa não encontrada" }, 400);
  if (body.acao !== "gerar") return json({ error: "ação desconhecida" }, 400);
  const { data: linha, error } = await sb.from("vedit_proximos").insert({ empresa_id: empresa.id, status: "gerando" }).select("id").single();
  if (error) return json({ error: error.message }, 500);
  const tarefa = gerar(sb, linha.id, empresa).catch(async (e) => {
    await sb.from("vedit_proximos").update({ status: "erro", erro: (e as Error).message.slice(0, 400) }).eq("id", linha.id);
  });
  // @ts-ignore EdgeRuntime existe no runtime do Supabase
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(tarefa);
  else await tarefa;
  return json({ ok: true, id: linha.id });
});
