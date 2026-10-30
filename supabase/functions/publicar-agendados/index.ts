// publicar-agendados — publica no Instagram o que está na tabela publicacoes (criativos e vídeos).
//   GET (cron a cada 5 min) ou POST { acao: "processar" } → publica o que já venceu
//   POST { acao: "conta" }                                  → qual perfil publica (nada é publicado)
//   POST { acao: "musicas", busca? }                        → músicas do Instagram (em alta sem busca)
//   POST { acao: "previa", audio_id, titulo?, artista? }    → prévia para ouvir antes de escolher (Instagram ou iTunes)
//   POST { acao: "metricas", ids? }                         → atualiza alcance, curtidas, salvamentos…
//   POST { acao: "agora", id }                              → publica esta agora (botão "Publicar agora")
//   POST { acao: "vincular", simular? }                     → liga anúncios e posts do Instagram publicados fora daqui ao vídeo/criativo
//   POST { acao: "ligar_post", ig_media_id, origem, ref_id } → liga à mão um post do Instagram
//                                                             (o cron também faz isso uma vez por hora)
// O Instagram não agenda pela API: quem agenda é esta fila. Imagem e carrossel saem na hora;
// Reel pode ficar processando e é concluído na rodada seguinte (status "publicando" + container_id).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ligarPost, vincularAnuncios, vincularInstagram } from "./vincular.ts";

const V = "v22.0"; // a API de áudio (músicas em alta) está documentada a partir da v22
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
const BUCKET = "video-edicao";

/** Prévia de 30 s (m4a) da faixa no iTunes, pelo título + artista. null se não achar. */
async function previaItunes(titulo: string, artista: string): Promise<string | null> {
  const limpa = (t: string) =>
    t
      .replace(/\(.*?\)|\[.*?\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const termos = [`${limpa(titulo)} ${artista.split(",")[0]}`, limpa(titulo)];
  for (const termo of termos) {
    for (const pais of ["BR", "US"]) {
      try {
        const r = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(termo)}&entity=song&limit=5&country=${pais}`,
          { signal: AbortSignal.timeout(6000) },
        );
        const j = await r.json();
        const achou = (j.results ?? []).find((x: any) => x.previewUrl);
        if (achou) return achou.previewUrl;
      } catch (_) {
        /* tenta o próximo */
      }
    }
  }
  return null;
}

async function tokenMeta(sb: any): Promise<string> {
  const { data } = await sb.rpc("get_secret", { secret_name: "META_ADS_TOKEN" });
  const t = typeof data === "string" ? data : data?.secret;
  return String(t || Deno.env.get("META_ACCESS_TOKEN") || "").replace(/^"|"$/g, "");
}

async function graph(
  method: string,
  path: string,
  token: string,
  params: Record<string, string> = {},
) {
  const url = new URL(`https://graph.facebook.com/${V}/${path}`);
  const init: RequestInit = { method };
  if (method === "GET")
    for (const [k, v] of Object.entries({ ...params, access_token: token }))
      url.searchParams.set(k, v);
  else {
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    init.body = new URLSearchParams({ ...params, access_token: token }).toString();
  }
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error)
    throw new Error(`Instagram: ${j.error?.error_user_msg || j.error?.message || r.status}`);
  return j;
}

/** Leitura na API de anúncios (o ids=... em lote usa o caminho vazio). */
const graphMeta = (token: string) => (path: string, params: Record<string, string>) =>
  graph("GET", path, token, params);

let igCache: string | null = null;
async function contaInstagram(sb: any, token: string) {
  if (igCache) return igCache;
  let id = Deno.env.get("IG_USER_ID") || "";
  if (!id) {
    const { data } = await sb.rpc("get_secret", { secret_name: "META_IG_ACCOUNT_ID" });
    id = String((typeof data === "string" ? data : data?.secret) || "").replace(/^"|"$/g, "");
  }
  if (!id) {
    const j = await graph("GET", "me/accounts", token, {
      fields: "instagram_business_account",
      limit: "50",
    }).catch(() => null);
    id =
      (j?.data ?? []).find((p: any) => p.instagram_business_account)?.instagram_business_account
        ?.id ?? "";
  }
  if (!id) {
    const { data: c } = await sb
      .from("mads_creatives")
      .select("meta_instagram_actor_id")
      .not("meta_instagram_actor_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    id = c?.meta_instagram_actor_id ?? "";
  }
  if (!id) throw new Error("conta do Instagram não configurada (IG_USER_ID)");
  igCache = id;
  return id;
}

async function assinar(sb: any, path: string) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 3);
  if (error || !data) throw new Error(`arquivo não encontrado: ${path}`);
  return data.signedUrl as string;
}

async function esperar(token: string, container: string, tentativas: number) {
  for (let i = 0; i < tentativas; i++) {
    const st = await graph("GET", container, token, { fields: "status_code,status" });
    if (st.status_code === "FINISHED") return "FINISHED";
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED")
      throw new Error(`o Instagram recusou a mídia (${st.status || st.status_code})`);
    await new Promise((ok) => setTimeout(ok, 4000));
  }
  return "IN_PROGRESS";
}

async function concluir(sb: any, p: any, token: string, ig: string, container: string) {
  const pub = await graph("POST", `${ig}/media_publish`, token, { creation_id: container });
  const info = await graph("GET", pub.id, token, { fields: "permalink" }).catch(() => ({}));
  const agora = new Date().toISOString();
  await sb
    .from("publicacoes")
    .update({
      status: "publicado",
      ig_media_id: pub.id,
      permalink: info.permalink ?? null,
      publicado_em: agora,
      erro: null,
    })
    .eq("id", p.id);
  if (p.origem === "video")
    await sb
      .from("vedit_projetos")
      .update({ ig_media_id: pub.id, publicado_em: agora, status: "publicado" })
      .eq("id", p.ref_id);
  return { publicado: true, permalink: info.permalink ?? null };
}

async function publicar(sb: any, p: any) {
  const token = await tokenMeta(sb);
  const ig = await contaInstagram(sb, token);
  try {
    // Reel que ficou processando na rodada anterior.
    if (p.container_id) {
      const st = await esperar(token, p.container_id, 3);
      if (st !== "FINISHED") return { publicado: false, processando: true };
      return await concluir(sb, p, token, ig, p.container_id);
    }
    const urls = await Promise.all((p.midias ?? []).map((m: string) => assinar(sb, m)));
    if (!urls.length) throw new Error("sem mídia para publicar");
    let container: string;
    if (p.tipo === "reel") {
      container = (
        await graph("POST", `${ig}/media`, token, {
          media_type: "REELS",
          video_url: urls[0],
          caption: p.legenda ?? "",
          share_to_feed: "true",
          // Música do Instagram (em alta ou buscada): só Reels aceitam pela API.
          ...(p.audio?.audio_id
            ? {
                audio_configuration: JSON.stringify({
                  audio_id: String(p.audio.audio_id),
                  audio_volume: Math.round(Number(p.audio.audio_volume ?? 100)),
                  video_volume: Math.round(Number(p.audio.video_volume ?? 100)),
                }),
              }
            : {}),
        })
      ).id;
    } else if (p.tipo === "carrossel" && urls.length > 1) {
      if (urls.length > 10) throw new Error("o Instagram aceita no máximo 10 slides por carrossel");
      const filhos: string[] = [];
      for (const u of urls)
        filhos.push(
          (await graph("POST", `${ig}/media`, token, { image_url: u, is_carousel_item: "true" }))
            .id,
        );
      for (const f of filhos) await esperar(token, f, 10);
      container = (
        await graph("POST", `${ig}/media`, token, {
          media_type: "CAROUSEL",
          children: filhos.join(","),
          caption: p.legenda ?? "",
        })
      ).id;
    } else {
      container = (
        await graph("POST", `${ig}/media`, token, { image_url: urls[0], caption: p.legenda ?? "" })
      ).id;
    }
    await sb
      .from("publicacoes")
      .update({ container_id: container, container_em: new Date().toISOString() })
      .eq("id", p.id);
    const st = await esperar(token, container, p.tipo === "reel" ? 20 : 15);
    if (st !== "FINISHED") return { publicado: false, processando: true };
    return await concluir(sb, p, token, ig, container);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb
      .from("publicacoes")
      .update({ status: "erro", erro: msg.slice(0, 500) })
      .eq("id", p.id);
    throw e;
  }
}

// ---------- métricas ----------
const CONJUNTOS = [
  ["reach", "views", "likes", "comments", "shares", "saved", "total_interactions"],
  ["reach", "likes", "comments", "shares", "saved", "total_interactions"],
  ["reach", "likes", "comments", "saved"],
];
async function medirUma(sb: any, token: string, p: any) {
  const base = await graph("GET", p.ig_media_id, token, {
    fields: "like_count,comments_count,permalink,media_type,thumbnail_url,media_url",
  }).catch(() => ({}));
  const m: Record<string, number> = {};
  const extras = p.tipo === "reel" ? ["ig_reels_avg_watch_time"] : [];
  for (const c of CONJUNTOS) {
    try {
      const j = await graph("GET", `${p.ig_media_id}/insights`, token, {
        metric: [...c, ...extras].join(","),
      });
      for (const d of j.data ?? [])
        m[d.name] = Number(d.values?.[0]?.value ?? d.total_value?.value ?? 0);
      break;
    } catch (_) {
      if (extras.length) extras.length = 0; // tenta de novo sem as de Reel
    }
  }
  if (m.likes === undefined && base.like_count !== undefined) m.likes = base.like_count;
  if (m.comments === undefined && base.comments_count !== undefined)
    m.comments = base.comments_count;
  const upd: Record<string, unknown> = { metricas: m, metricas_em: new Date().toISOString() };
  if (base.permalink && !p.permalink) upd.permalink = base.permalink;
  if (!p.thumb && (base.thumbnail_url || base.media_url))
    upd.thumb = base.thumbnail_url || base.media_url;
  await sb.from("publicacoes").update(upd).eq("id", p.id);
  return m;
}

/** Atualiza as métricas do Instagram das publicações (as pedidas, ou as mais desatualizadas). */
async function atualizarMetricas(sb: any, ids?: string[]) {
  const token = await tokenMeta(sb);
  let q = sb
    .from("publicacoes")
    .select("id, ig_media_id, tipo, permalink, thumb")
    .eq("status", "publicado")
    .eq("destino", "instagram")
    .not("ig_media_id", "is", null);
  if (ids?.length) q = q.in("id", ids);
  else
    q = q
      .gte("publicado_em", new Date(Date.now() - 90 * 86400000).toISOString())
      .or(`metricas_em.is.null,metricas_em.lt.${new Date(Date.now() - 3 * 3600000).toISOString()}`)
      .order("metricas_em", { ascending: true, nullsFirst: true })
      .limit(15);
  const { data } = await q;
  let n = 0;
  for (const p of data ?? []) {
    await medirUma(sb, token, p).catch(() => null);
    n++;
  }
  return n;
}

/** Pega a publicação para si (evita publicar duas vezes se duas rodadas se cruzarem). */
async function pegar(sb: any, id: string) {
  const { data } = await sb
    .from("publicacoes")
    .update({ status: "publicando", erro: null })
    .eq("id", id)
    .in("status", ["agendado", "erro"])
    .select("*")
    .maybeSingle();
  return data;
}

async function processar(sb: any) {
  const agora = new Date().toISOString();
  const { data: vencidas } = await sb
    .from("publicacoes")
    .select("id")
    .eq("status", "agendado")
    .lte("agendado_para", agora)
    .order("agendado_para")
    .limit(5);
  // Reels que ficaram processando.
  const { data: pendentes } = await sb
    .from("publicacoes")
    .select("*")
    .eq("status", "publicando")
    .not("container_id", "is", null)
    // Só as que ninguém está esperando agora (a chamada que criou o container espera até ~80s).
    .lt("container_em", new Date(Date.now() - 3 * 60 * 1000).toISOString())
    .limit(5);
  const res: unknown[] = [];
  for (const v of vencidas ?? []) {
    const p = await pegar(sb, v.id);
    if (!p) continue;
    res.push(await publicar(sb, p).catch((e) => ({ erro: String(e?.message ?? e) })));
  }
  for (const p of pendentes ?? []) {
    await sb
      .from("publicacoes")
      .update({ tentativas: (p.tentativas ?? 0) + 1 })
      .eq("id", p.id);
    if ((p.tentativas ?? 0) > 12) {
      await sb
        .from("publicacoes")
        .update({ status: "erro", erro: "o Instagram não terminou de processar o vídeo" })
        .eq("id", p.id);
      continue;
    }
    res.push(await publicar(sb, p).catch((e) => ({ erro: String(e?.message ?? e) })));
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    if (req.method === "GET") {
      const resultados = await processar(sb);
      // Métricas: a cada rodada, as mais desatualizadas (cada uma é revista a cada ~3 h).
      const medidas = await atualizarMetricas(sb).catch(() => 0);
      // Uma vez por hora: liga anúncios publicados direto na Meta ao vídeo/criativo de origem.
      // e posts publicados direto no Instagram ao vídeo/criativo de origem.
      let vinculos: unknown = null;
      if (new Date().getUTCMinutes() < 5) {
        const tk = await tokenMeta(sb);
        vinculos = {
          anuncios: await vincularAnuncios(sb, graphMeta(tk)).catch((e) => ({ erro: String(e) })),
          instagram: await contaInstagram(sb, tk)
            .then((ig) => vincularInstagram(sb, graphMeta(tk), ig))
            .catch((e) => ({ erro: String(e) })),
        };
      }
      return json({ ok: true, resultados, medidas, vinculos });
    }
    const b = await req.json().catch(() => ({}));
    if (b.acao === "conta") {
      // Para a tela mostrar em qual perfil vai sair (nada é publicado).
      const token = await tokenMeta(sb);
      const ig = await contaInstagram(sb, token);
      const info = await graph("GET", ig, token, { fields: "username" });
      return json({ ok: true, ig_user_id: ig, username: info.username ?? null });
    }
    if (b.acao === "musicas") {
      // Sem busca = músicas em alta. Só as liberadas para uso por terceiros aparecem.
      const token = await tokenMeta(sb);
      const ig = await contaInstagram(sb, token);
      const busca = String(b.busca ?? "").trim();
      const j = await graph("GET", "ig_audio", token, {
        audio_type: "music",
        user_id: ig,
        ...(busca ? { search_query: busca } : {}),
        limit: "50",
      });
      // A API não dá contagem de uso: a ordem da lista sem busca é a posição em alta.
      const musicas = (j.audio ?? j.data ?? []).map((a: any, i: number) => ({
        posicao: busca ? null : i + 1,
        anuncio: a.is_ads_eligible ?? null,
        audio_id: String(a.audio_id ?? a.id),
        titulo: a.title ?? "",
        artista: a.display_artist ?? "",
        duracao: a.duration_in_ms ? Math.round(a.duration_in_ms / 1000) : null,
        capa: a.cover_artwork_thumbnail_uri ?? a.cover_artwork_thumbnail_url ?? null,
        previa: a.download_url ?? null,
      }));
      return json({ ok: true, musicas });
    }
    if (b.acao === "previa") {
      // Prévia (link temporário) e capa de uma música, para ouvir antes de escolher.
      // deno-lint-ignore no-explicit-any
      let a: any = {};
      try {
        const token = await tokenMeta(sb);
        const ig = await contaInstagram(sb, token);
        a = await graph("GET", String(b.audio_id ?? ""), token, { user_id: ig });
      } catch (_) {
        /* sem os dados do Instagram, tenta a prévia só pelo título e artista */
      }
      // O Instagram quase nunca libera o arquivo: busca a prévia de 30 s da mesma faixa no iTunes.
      let previa: string | null = a.download_url ?? null;
      if (!previa && (b.titulo || a.title))
        previa = await previaItunes(
          String(b.titulo ?? a.title ?? ""),
          String(b.artista ?? a.display_artist ?? ""),
        );
      return json({
        ok: true,
        previa,
        capa: a.cover_artwork_thumbnail_url ?? a.cover_artwork_thumbnail_uri ?? null,
        link: a.on_platform_audio_preview_link ?? null,
      });
    }
    if (b.acao === "metricas")
      return json({
        ok: true,
        medidas: await atualizarMetricas(sb, Array.isArray(b.ids) ? b.ids : undefined),
      });
    if (b.acao === "vincular") {
      const tk = await tokenMeta(sb);
      const anuncios = await vincularAnuncios(sb, graphMeta(tk), 45, !!b.simular);
      const instagram = await contaInstagram(sb, tk)
        .then((ig) => vincularInstagram(sb, graphMeta(tk), ig, 60, !!b.simular))
        .catch((e) => ({ ligados: [], pendentes: [], erro: String(e) }));
      // Métricas dos posts recém-ligados já na mesma chamada.
      if (!b.simular && instagram.ligados.length) await atualizarMetricas(sb).catch(() => 0);
      return json({
        ok: true,
        ligados: anuncios.ligados,
        pendentes: anuncios.pendentes,
        instagram,
      });
    }
    if (b.acao === "ligar_post") {
      const r = await ligarPost(sb, graphMeta(await tokenMeta(sb)), b);
      await atualizarMetricas(sb, [r.id]).catch(() => 0);
      return json(r);
    }
    if (b.acao === "agora") {
      const p = await pegar(sb, String(b.id ?? ""));
      if (!p) return json({ error: "publicação não encontrada ou já publicada" }, 409);
      return json({ ok: true, ...(await publicar(sb, p)) });
    }
    return json({ ok: true, resultados: await processar(sb) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
