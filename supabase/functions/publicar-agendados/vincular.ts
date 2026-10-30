// Liga anúncios publicados direto na Meta (fora do sistema) ao vídeo ou criativo que os gerou,
// para acompanhar a evolução em "Publicados" como se tivessem saído daqui.
//   Vídeo: a duração do vídeo do anúncio bate com a de um render pronto antes dele (±0,25 s);
//          o texto (nome, título, legenda) desempata entre projetos de mesma duração.
//   Criativo (imagem/carrossel): o texto do anúncio bate com o roteiro e os slides do criativo,
//          e o número de cartões do carrossel bate com o de slides.
// Só liga quando a escolha é clara; o resto volta em "pendentes" para ligar à mão.

type Graph = (path: string, params: Record<string, string>) => Promise<any>;

const PARADAS = new Set(
  "para pela pelo como mais quando voce voces isso essa esse esta este sobre entre depois antes ainda porque cada todo toda todos todas muito muita mesmo mesma onde quem aqui seus suas nosso nossa minha meus minhas dele dela eles elas fazer tudo nada novo nova with that this your from what have will just they them their about into than then there here".split(
    " ",
  ),
);
function palavras(t: string): Set<string> {
  return new Set(
    String(t ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length >= 4 && !PARADAS.has(w)),
  );
}
/** Quanto das palavras do anúncio aparece no projeto (0–1). */
function cobertura(ad: Set<string>, proj: Set<string>) {
  if (!ad.size) return 0;
  let n = 0;
  for (const w of ad) if (proj.has(w)) n++;
  return n / ad.size;
}
function textoDe(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(textoDe).join(" ");
  if (typeof v === "object")
    return Object.values(v as object)
      .map(textoDe)
      .join(" ");
  return "";
}
function duracaoDe(tl: any, fonte: number | null): number | null {
  const cortes = Array.isArray(tl?.cortes) ? tl.cortes : [];
  if (!cortes.length) return fonte ? Number(fonte) : null;
  return cortes.reduce(
    (s: number, c: any) => s + Math.max(0, Number(c.ate) - Number(c.de)) / (Number(c.vel) || 1),
    0,
  );
}

const CAMPOS_CRIATIVO =
  "name,created_time,creative{title,body,thumbnail_url,video_id,object_story_spec{video_data{video_id,title,message},link_data{name,message,description,child_attachments{name,description}}},asset_feed_spec{videos,bodies,titles}}";

export async function vincularAnuncios(sb: any, graph: Graph, dias = 45, simular = false) {
  // Anúncios sincronizados que ainda não estão ligados a nada em "Publicados".
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const { data: ads } = await sb
    .from("mads_ads")
    .select("meta_ad_id, nome, created_at")
    .not("meta_ad_id", "is", null)
    .gte("created_at", desde);
  const { data: ligados } = await sb
    .from("publicacoes")
    .select("meta_ad_id")
    .not("meta_ad_id", "is", null);
  const jaLigado = new Set((ligados ?? []).map((p: any) => p.meta_ad_id));
  const novos = (ads ?? []).filter((a: any) => !jaLigado.has(a.meta_ad_id));
  if (!novos.length) return { ligados: [], pendentes: [] };

  // Criativo de cada anúncio (em lotes de 50).
  const info: Record<string, any> = {};
  for (let i = 0; i < novos.length; i += 50) {
    const ids = novos
      .slice(i, i + 50)
      .map((a: any) => a.meta_ad_id)
      .join(",");
    Object.assign(info, await graph("", { ids, fields: CAMPOS_CRIATIVO }).catch(() => ({})));
  }
  // Duração dos vídeos dos anúncios.
  const vidDe = (ad: any) =>
    ad?.creative?.object_story_spec?.video_data?.video_id ??
    ad?.creative?.video_id ??
    ad?.creative?.asset_feed_spec?.videos?.[0]?.video_id ??
    null;
  const vids = [...new Set(Object.values(info).map(vidDe).filter(Boolean))] as string[];
  const videos: Record<string, any> = {};
  for (let i = 0; i < vids.length; i += 50)
    Object.assign(
      videos,
      await graph("", { ids: vids.slice(i, i + 50).join(","), fields: "length,title" }).catch(
        () => ({}),
      ),
    );

  // Candidatos de vídeo: cada render pronto (o arquivo que pode ter subido para a Meta), com a
  // duração daquela versão e a hora em que ficou pronto (o anúncio só pode ser posterior).
  const { data: renders } = await sb
    .from("vedit_renders")
    .select("projeto_id, props, created_at")
    .eq("status", "pronto")
    .gte("created_at", desde);
  const idsV = [...new Set((renders ?? []).map((r: any) => r.projeto_id))];
  const { data: projs } = idsV.length
    ? await sb
        .from("vedit_projetos")
        .select("id, nome, fonte_duracao, transcricao_texto")
        .in("id", idsV)
    : { data: [] };
  const projPorId = new Map((projs ?? []).map((p: any) => [p.id, p]));
  const rendersOk = (renders ?? [])
    .map((r: any) => ({
      p: projPorId.get(r.projeto_id),
      dur: duracaoDe(r.props?.timeline, Number(r.props?.duracaoFonte) || null),
      em: Date.parse(r.created_at),
    }))
    .filter((r: any) => r.p && r.dur);
  const { data: crias } = await sb
    .from("cria_projetos")
    .select("id, nome, roteiro, design, created_at, updated_at")
    .gte("updated_at", desde);

  const ligadosOk: any[] = [];
  const pendentes: any[] = [];
  for (const a of novos) {
    const ad = info[a.meta_ad_id];
    if (!ad) continue;
    const c = ad.creative ?? {};
    const oss = c.object_story_spec ?? {};
    const textoAd = palavras(
      [
        ad.name,
        c.title,
        c.body,
        textoDe(oss.video_data?.title),
        textoDe(oss.video_data?.message),
        textoDe(oss.link_data),
        textoDe(c.asset_feed_spec?.bodies),
        textoDe(c.asset_feed_spec?.titles),
      ].join(" "),
    );
    const vid = vidDe(ad);
    let escolha: { origem: "video" | "criativo"; id: string; nome: string; tipo: string } | null =
      null;
    let motivo = "";

    const quando = ad.created_time ? new Date(ad.created_time).toISOString() : a.created_at;
    if (vid) {
      const len = Number(videos[vid]?.length);
      // Melhor render de cada projeto: duração dentro de ±0,25 s e pronto antes do anúncio.
      const porProj = new Map<string, { p: any; delta: number; txt: number }>();
      for (const r of rendersOk) {
        if (!Number.isFinite(len) || r.em > Date.parse(quando)) continue;
        const delta = Math.abs(r.dur - len);
        if (delta > 0.25) continue;
        const atual = porProj.get(r.p.id);
        if (atual && atual.delta <= delta) continue;
        const txt = cobertura(
          textoAd,
          palavras(`${r.p.nome} ${r.p.transcricao_texto ?? ""} ${videos[vid]?.title ?? ""}`),
        );
        porProj.set(r.p.id, { p: r.p, delta, txt });
      }
      const cands = [...porProj.values()].sort((x, y) => y.txt - x.txt || x.delta - y.delta);
      if (cands.length === 1 || (cands.length > 1 && cands[0].txt - cands[1].txt >= 0.08))
        escolha = { origem: "video", id: cands[0].p.id, nome: cands[0].p.nome, tipo: "reel" };
      else if (cands.length > 1)
        motivo = `${cands.length} vídeos com a mesma duração (${len.toFixed(1)} s)`;
      else motivo = `nenhum vídeo renderizado com ${Number.isFinite(len) ? len.toFixed(1) : "?"} s`;
    } else {
      const cartoes = oss.link_data?.child_attachments?.length ?? 1;
      const cands = (crias ?? [])
        .filter((p: any) => Date.parse(p.created_at) <= Date.parse(quando))
        .map((p: any) => {
          const slides = Array.isArray(p.design?.slides) ? p.design.slides.length : 0;
          const txt = cobertura(
            textoAd,
            palavras(`${p.nome} ${p.roteiro ?? ""} ${textoDe(p.design?.slides)}`),
          );
          return { p, txt: txt - (slides && slides !== cartoes ? 0.2 : 0) };
        })
        .sort((x: any, y: any) => y.txt - x.txt);
      const [b1, b2] = cands;
      if (b1 && b1.txt >= 0.3 && (!b2 || b1.txt - b2.txt >= 0.08))
        escolha = {
          origem: "criativo",
          id: b1.p.id,
          nome: b1.p.nome,
          tipo: cartoes > 1 ? "carrossel" : "imagem",
        };
      else motivo = b1 ? "mais de um criativo parecido" : "nenhum criativo candidato";
    }

    if (!escolha) {
      pendentes.push({ meta_ad_id: a.meta_ad_id, anuncio: ad.name, motivo });
      continue;
    }
    if (simular) {
      ligadosOk.push({ meta_ad_id: a.meta_ad_id, anuncio: ad.name, projeto: escolha.nome });
      continue;
    }
    const { error } = await sb.from("publicacoes").insert({
      origem: escolha.origem,
      ref_id: escolha.id,
      nome: ad.name,
      tipo: escolha.tipo,
      destino: "anuncio",
      midias: [],
      legenda: c.body ?? oss.video_data?.message ?? oss.link_data?.message ?? null,
      status: "publicado",
      publicado_em: quando,
      meta_ad_id: a.meta_ad_id,
      thumb: c.thumbnail_url ?? null,
    });
    if (error)
      pendentes.push({ meta_ad_id: a.meta_ad_id, anuncio: ad.name, motivo: error.message });
    else ligadosOk.push({ meta_ad_id: a.meta_ad_id, anuncio: ad.name, projeto: escolha.nome });
  }
  return { ligados: ligadosOk, pendentes };
}

// ─── Posts publicados direto no Instagram (fora do sistema) ─────────────────
// Reel: a duração do arquivo (lida do cabeçalho do MP4) bate com um render pronto antes do post;
//       a legenda desempata entre vídeos de mesma duração.
// Imagem/carrossel: a legenda bate com o texto do criativo e o nº de cartões com o de slides.

/** Duração de um MP4 lendo só o átomo mvhd (baixa 2 MB do início e, se preciso, do fim). */
async function duracaoMp4(url: string): Promise<number | null> {
  const ler = (buf: Uint8Array) => {
    for (let k = 0; k + 32 < buf.length; k++) {
      if (buf[k] !== 0x6d || buf[k + 1] !== 0x76 || buf[k + 2] !== 0x68 || buf[k + 3] !== 0x64)
        continue;
      const dv = new DataView(buf.buffer, buf.byteOffset + k + 4);
      const versao = dv.getUint8(0);
      const escala = versao === 1 ? dv.getUint32(20) : dv.getUint32(12);
      const dur = versao === 1 ? Number(dv.getBigUint64(24)) : dv.getUint32(16);
      if (escala > 0 && dur > 0) return dur / escala;
    }
    return null;
  };
  for (const range of ["bytes=0-2097151", "bytes=-2097152"]) {
    try {
      const r = await fetch(url, { headers: { Range: range }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) continue;
      const d = ler(new Uint8Array(await r.arrayBuffer()));
      if (d) return d;
    } catch (_) {
      /* tenta o próximo trecho */
    }
  }
  return null;
}

const CAMPOS_IG =
  "id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url,media_url,children{id}";

export async function vincularInstagram(
  sb: any,
  graph: Graph,
  ig: string,
  dias = 60,
  simular = false,
) {
  const desdeMs = Date.now() - dias * 86400000;
  const desde = new Date(desdeMs).toISOString();
  // Posts da conta no período (paginado, do mais novo para o mais antigo).
  const posts: any[] = [];
  let after = "";
  for (let pag = 0; pag < 6; pag++) {
    const j = await graph(`${ig}/media`, {
      fields: CAMPOS_IG,
      limit: "50",
      ...(after ? { after } : {}),
    });
    const lote = j?.data ?? [];
    posts.push(...lote);
    after = j?.paging?.cursors?.after ?? "";
    if (!after || !lote.length || Date.parse(lote[lote.length - 1].timestamp) < desdeMs) break;
  }
  const { data: ja } = await sb
    .from("publicacoes")
    .select("ig_media_id")
    .not("ig_media_id", "is", null);
  const conhecido = new Set((ja ?? []).map((p: any) => p.ig_media_id));
  const novos = posts.filter((p) => Date.parse(p.timestamp) >= desdeMs && !conhecido.has(p.id));
  if (!novos.length) return { ligados: [], pendentes: [] };

  const { data: renders } = await sb
    .from("vedit_renders")
    .select("projeto_id, props, created_at")
    .eq("status", "pronto")
    .gte("created_at", new Date(desdeMs - 30 * 86400000).toISOString());
  const idsV = [...new Set((renders ?? []).map((r: any) => r.projeto_id))];
  const { data: projs } = idsV.length
    ? await sb
        .from("vedit_projetos")
        .select("id, nome, fonte_duracao, transcricao_texto")
        .in("id", idsV)
    : { data: [] };
  const projPorId = new Map((projs ?? []).map((p: any) => [p.id, p]));
  const rendersOk = (renders ?? [])
    .map((r: any) => ({
      p: projPorId.get(r.projeto_id),
      dur: duracaoDe(r.props?.timeline, Number(r.props?.duracaoFonte) || null),
      em: Date.parse(r.created_at),
      legenda: String(r.props?.legenda ?? ""),
    }))
    .filter((r: any) => r.p && r.dur);
  const { data: crias } = await sb
    .from("cria_projetos")
    .select("id, nome, roteiro, design, created_at")
    .gte("updated_at", new Date(desdeMs - 30 * 86400000).toISOString());

  // Post anterior ao primeiro vídeo/criativo feito aqui não tem como ter saído daqui.
  const primeiro = Math.min(
    ...rendersOk.map((r: any) => r.em),
    ...(crias ?? []).map((c: any) => Date.parse(c.created_at)),
  );
  const ligados: any[] = [];
  const pendentes: any[] = [];
  for (const post of novos.filter((p) => Date.parse(p.timestamp) >= primeiro)) {
    const quando = Date.parse(post.timestamp);
    const legenda = String(post.caption ?? "");
    const textoPost = palavras(legenda);
    const ehVideo = post.media_type === "VIDEO";
    let escolha: { origem: "video" | "criativo"; id: string; nome: string; tipo: string } | null =
      null;
    let motivo = "";
    let dur: number | null = null;

    if (ehVideo) {
      dur = post.media_url ? await duracaoMp4(post.media_url) : null;
      const porProj = new Map<string, { p: any; delta: number; txt: number }>();
      for (const r of rendersOk) {
        if (r.em > quando) continue;
        const delta = dur ? Math.abs(r.dur - dur) : 99;
        if (dur && delta > 0.35) continue;
        const txt = cobertura(
          textoPost,
          palavras(`${r.p.nome} ${r.p.transcricao_texto ?? ""} ${r.legenda}`),
        );
        if (!dur && txt < 0.35) continue; // sem duração, só pela legenda e com folga
        const atual = porProj.get(r.p.id);
        if (atual && atual.delta <= delta && atual.txt >= txt) continue;
        porProj.set(r.p.id, { p: r.p, delta, txt });
      }
      const cands = [...porProj.values()].sort((x, y) => y.txt - x.txt || x.delta - y.delta);
      if (cands.length === 1 || (cands.length > 1 && cands[0].txt - cands[1].txt >= 0.08))
        escolha = { origem: "video", id: cands[0].p.id, nome: cands[0].p.nome, tipo: "reel" };
      else if (cands.length > 1)
        motivo = `${cands.length} vídeos parecidos${dur ? ` com ${dur.toFixed(1)} s` : ""}`;
      else
        motivo = dur
          ? `nenhum vídeo renderizado com ${dur.toFixed(1)} s`
          : "não deu para ler a duração do vídeo";
    } else {
      const cartoes = post.children?.data?.length ?? 1;
      const cands = (crias ?? [])
        .filter((p: any) => Date.parse(p.created_at) <= quando)
        .map((p: any) => {
          const slides = Array.isArray(p.design?.slides) ? p.design.slides.length : 0;
          const txt = cobertura(
            textoPost,
            palavras(
              `${p.nome} ${p.roteiro ?? ""} ${p.design?.legendaPost ?? ""} ${textoDe(p.design?.slides)}`,
            ),
          );
          return { p, txt: txt - (slides && slides !== cartoes ? 0.2 : 0) };
        })
        .sort((x: any, y: any) => y.txt - x.txt);
      const [b1, b2] = cands;
      if (b1 && b1.txt >= 0.3 && (!b2 || b1.txt - b2.txt >= 0.08))
        escolha = {
          origem: "criativo",
          id: b1.p.id,
          nome: b1.p.nome,
          tipo: cartoes > 1 ? "carrossel" : "imagem",
        };
      else
        motivo = b1 && b1.txt >= 0.3 ? "mais de um criativo parecido" : "nenhum criativo parecido";
    }

    const resumo = {
      ig_media_id: post.id,
      permalink: post.permalink,
      publicado_em: post.timestamp,
      tipo: ehVideo ? "reel" : post.media_type === "CAROUSEL_ALBUM" ? "carrossel" : "imagem",
      legenda: legenda.slice(0, 300),
      thumb: post.thumbnail_url ?? (ehVideo ? null : post.media_url) ?? null,
      duracao: dur,
    };
    if (!escolha) {
      pendentes.push({ ...resumo, motivo });
      continue;
    }
    if (simular) {
      ligados.push({ ...resumo, projeto: escolha.nome });
      continue;
    }
    const { error } = await sb.from("publicacoes").insert({
      origem: escolha.origem,
      ref_id: escolha.id,
      nome: escolha.nome,
      tipo: escolha.tipo,
      destino: "instagram",
      midias: [],
      legenda,
      status: "publicado",
      agendado_para: post.timestamp,
      publicado_em: post.timestamp,
      ig_media_id: post.id,
      permalink: post.permalink,
      thumb: resumo.thumb,
    });
    if (error) pendentes.push({ ...resumo, motivo: error.message });
    else ligados.push({ ...resumo, projeto: escolha.nome });
  }
  return { ligados, pendentes };
}

/** Liga à mão um post do Instagram a um vídeo ou criativo (quando a ligação automática não decidiu). */
export async function ligarPost(
  sb: any,
  graph: Graph,
  b: { ig_media_id: string; origem: "video" | "criativo"; ref_id: string },
) {
  const post = await graph(b.ig_media_id, { fields: CAMPOS_IG });
  const { data: ja } = await sb
    .from("publicacoes")
    .select("id")
    .eq("ig_media_id", b.ig_media_id)
    .maybeSingle();
  if (ja) return { ok: true, id: ja.id };
  const tabela = b.origem === "video" ? "vedit_projetos" : "cria_projetos";
  const { data: proj } = await sb.from(tabela).select("nome").eq("id", b.ref_id).single();
  const ehVideo = post.media_type === "VIDEO";
  const { data, error } = await sb
    .from("publicacoes")
    .insert({
      origem: b.origem,
      ref_id: b.ref_id,
      nome: proj?.nome ?? null,
      tipo: ehVideo ? "reel" : post.media_type === "CAROUSEL_ALBUM" ? "carrossel" : "imagem",
      destino: "instagram",
      midias: [],
      legenda: post.caption ?? "",
      status: "publicado",
      agendado_para: post.timestamp,
      publicado_em: post.timestamp,
      ig_media_id: post.id,
      permalink: post.permalink,
      thumb: post.thumbnail_url ?? (ehVideo ? null : post.media_url) ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { ok: true, id: data.id };
}
