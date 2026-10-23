// cria-agente — o Claude como diretor de arte dos criativos (carrosséis e posts únicos).
//   criar     { projeto_id }                    → monta o design a partir do briefing, fotos e referência
//   mensagem  { projeto_id, texto, slide_id? }  → ajusta o design pelo chat
//   descrever_foto { foto_id }                  → descrição curta da foto (para escolher as certas depois)
//   referencia { url, username? }               → baixa as imagens de um post/carrossel do Instagram e analisa
//   analisar_referencia { id }                  → (re)analisa uma referência (imagens já no bucket)
// O trabalho pesado roda em segundo plano (status "gerando"/"analisando"); a tela acompanha pelo banco.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODELO = Deno.env.get("VEDIT_MODELO") || "claude-opus-5";
const BUCKET = "video-edicao";
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

const emSegundoPlano = (p: Promise<unknown>) => {
  // @ts-ignore EdgeRuntime existe no runtime do Supabase
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p);
};

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

async function claude(sb: any, body: any, origem: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
  for (let t = 0; t < 3; t++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODELO, ...body }),
    });
    const txt = await r.text();
    if (r.status === 429 || r.status === 529 || r.status >= 500) {
      await new Promise((ok) => setTimeout(ok, 4000 * (t + 1)));
      continue;
    }
    const j = JSON.parse(txt);
    if (!r.ok)
      throw new Error(`Erro do Claude (${r.status}): ${j.error?.message ?? txt.slice(0, 300)}`);
    await logUso(sb, origem, j.usage);
    return j;
  }
  throw new Error("O Claude está sobrecarregado. Tente de novo em instantes.");
}

function b64(buf: ArrayBuffer) {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
async function imagemBloco(sb: any, path: string) {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const tipo = /\.png$/i.test(path)
    ? "image/png"
    : /\.webp$/i.test(path)
      ? "image/webp"
      : "image/jpeg";
  const buf = await data.arrayBuffer();
  if (buf.byteLength > 4_800_000) return null;
  return { type: "image", source: { type: "base64", media_type: tipo, data: b64(buf) } };
}

const textoDe = (j: any) =>
  (j.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n")
    .trim();
const jsonDe = (t: string) => {
  const m = t.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
};

// ---------- fotos ----------
async function descreverFoto(sb: any, id: string) {
  const { data: f } = await sb.from("cria_fotos").select("id, path").eq("id", id).single();
  if (!f) throw new Error("foto não encontrada");
  const img = await imagemBloco(sb, f.path);
  if (!img) throw new Error("não consegui abrir a foto");
  const j = await claude(
    sb,
    {
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            img,
            {
              type: "text",
              text: "Descreva esta foto em português, numa frase de até 30 palavras, para um diretor de arte escolher fotos para posts: quem aparece, enquadramento (rosto, meio corpo, corpo inteiro), expressão, roupa, cenário e luz. Sem introdução.",
            },
          ],
        },
      ],
    },
    "cria-foto",
  );
  const descricao = textoDe(j).slice(0, 400);
  await sb.from("cria_fotos").update({ descricao }).eq("id", id);
  return descricao;
}

// ---------- referências ----------
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
  const id = (j.data ?? []).find((p: any) => p.instagram_business_account)
    ?.instagram_business_account?.id;
  if (!id) throw new Error("conta Instagram business não encontrada");
  return id as string;
}

async function baixarPost(sb: any, url: string, username: string) {
  const codigo = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  if (!codigo) throw new Error("link de post inválido");
  const user = username.replace(/^@/, "").trim();
  if (!user) throw new Error("informe o @ da conta que publicou");
  const tk = await token(sb);
  const ig = await igUserId(sb, tk);
  let alvo: any = null;
  let after = "";
  for (let pag = 0; pag < 6 && !alvo; pag++) {
    const qs = new URLSearchParams({
      fields: `business_discovery.username(${user}){username,media.limit(40)${after ? `.after(${after})` : ""}{id,caption,media_type,permalink,media_url,thumbnail_url,like_count,comments_count,children{media_type,media_url,thumbnail_url}}}`,
      access_token: tk,
    });
    const j = await (await fetch(`https://graph.facebook.com/${V}/${ig}?${qs}`)).json();
    if (j.error) throw new Error(j.error.message);
    const media = j.business_discovery?.media;
    alvo = (media?.data ?? []).find((m: any) => String(m.permalink ?? "").includes(codigo));
    after = media?.paging?.cursors?.after ?? "";
    if (!after) break;
  }
  if (!alvo) throw new Error(`não achei esse post nas publicações recentes de @${user}`);
  const urls: string[] = (alvo.children?.data ?? [alvo])
    .map((c: any) => (c.media_type === "VIDEO" ? c.thumbnail_url : c.media_url))
    .filter(Boolean)
    .slice(0, 12);
  if (!urls.length) throw new Error("o Instagram não liberou as imagens deste post");
  const paths: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const r = await fetch(urls[i], { signal: AbortSignal.timeout(30000) });
    if (!r.ok) continue;
    const path = `criativos/referencias/${codigo}-${String(i + 1).padStart(2, "0")}.jpg`;
    const up = await sb.storage
      .from(BUCKET)
      .upload(path, await r.blob(), { contentType: "image/jpeg", upsert: true });
    if (!up.error) paths.push(path);
  }
  return { paths, autor: user, legenda: alvo.caption ?? null, curtidas: alvo.like_count ?? null };
}

async function analisarReferencia(sb: any, id: string) {
  const { data: ref } = await sb.from("cria_referencias").select("*").eq("id", id).single();
  if (!ref) throw new Error("referência não encontrada");
  await sb.from("cria_referencias").update({ status: "analisando", erro: null }).eq("id", id);
  try {
    const imgs = (
      await Promise.all((ref.imagens ?? []).slice(0, 10).map((p: string) => imagemBloco(sb, p)))
    ).filter(Boolean);
    if (!imgs.length) throw new Error("sem imagens para analisar");
    const j = await claude(
      sb,
      {
        max_tokens: 2500,
        messages: [
          {
            role: "user",
            content: [
              ...imgs,
              {
                type: "text",
                text: `Estes são os slides, em ordem, de um ${imgs.length > 1 ? "carrossel" : "post"} do Instagram${ref.autor ? ` de @${ref.autor}` : ""} que a Mariana salvou como referência de qualidade.${ref.legenda ? `\nLegenda do post: ${String(ref.legenda).slice(0, 1200)}` : ""}

Analise como diretor de arte e estrategista de conteúdo. Responda só com JSON:
{
 "estilo": "nome curto do estilo (ex.: 'Post de tweet com foto', 'Comandos com antes e depois')",
 "resumo": "2 frases: o que o post entrega e por que prende",
 "estrutura": ["slide 1: papel e conteúdo", "slide 2: ...", ...],
 "tipografia": "fontes/pesos/caixa, tamanhos relativos, alinhamento",
 "cores": ["#hex", ...],
 "layouts": ["capa", "tweet", "comando", "topico", "texto", "lista", "foto", "cta"]  (os do nosso editor que mais se parecem, na ordem dos slides),
 "gancho": "como a capa prende",
 "dicas": ["detalhes de acabamento que fazem parecer profissional", ...],
 "prompt_para_criador": "instrução direta (pt-BR) para replicar este padrão num carrossel novo com outro tema e com as fotos da Mariana"
}`,
              },
            ],
          },
        ],
      },
      "cria-referencia",
    );
    const analise = jsonDe(textoDe(j));
    if (!analise) throw new Error("a análise não veio em JSON");
    await sb.from("cria_referencias").update({ status: "pronta", analise }).eq("id", id);
  } catch (e) {
    await sb
      .from("cria_referencias")
      .update({ status: "erro", erro: String((e as Error).message).slice(0, 500) })
      .eq("id", id);
  }
}

// ---------- design ----------
const GUIA = `Você é o diretor de arte e copywriter da IAplicada (Mariana Marques, IA aplicada a negócios), criando carrosséis e posts únicos para o Instagram no nível dos melhores criadores (Diego Almeida, Rony Meisler, Bruno Okamoto).

O design é um JSON. Você o grava com a ferramenta salvar_design (sempre o design COMPLETO).
{
 "tema": {"fundo":"#hex","texto":"#hex","destaque":"#hex","marca":"#hex","claro":"#hex","textoClaro":"#hex","fonteTitulo":"Anton","fonteTexto":"Inter"},
 "autor": {"nome":"Mariana Marques","arroba":"marimarquescb","foto":"<id de foto de rosto para o avatar>","verificado":true},
 "mostrarNumeracao": true,
 "legendaPost": "legenda sugerida para o post, com CTA e 3-5 hashtags",
 "slides": [ { "id":"s1", "layout":"...", "rotulo":"", "titulo":"", "subtitulo":"", "texto":"", "itens":[], "fotos":["<id>"], "fundo":"escuro|claro|marca|destaque", "variante":"impacto|elegante", "foco":"50% 30%" } ]
}

Layouts (use só estes):
- capa: foto de fundo inteira (fotos[0]) com título enorme embaixo. variante "impacto" = fonte condensada caixa alta + pílula com nome e selo; "elegante" = título grande centralizado em minúsculas. Tem "DESLIZE PARA VER MAIS" automático. Título com até ~8 palavras.
- tweet: cara de post do X/Twitter (avatar, nome, selo, @). texto em parágrafos curtos (linha em branco separa). fotos[0] opcional vira um card de imagem. Ótimo para opinião/história. Fundo claro por padrão.
- comando: título grande tipo "/upscale" ou "Passo 2", texto curto explicando, e 1 ou 2 imagens (2 = ANTES/DEPOIS automático). Ótimo para tutoriais, prompts, ferramentas.
- topico: rótulo (ex.: "Ferramenta #1"), título forte, imagem e explicação. Ótimo para listas de ferramentas/repos.
- texto: frase de impacto grande (titulo) e/ou parágrafos (texto). Sem foto.
- lista: titulo + itens numerados (3 a 6 itens curtos).
- foto: foto inteira com título/texto curto embaixo.
- cta: slide final com avatar grande, chamada e botões Salve/Envie/Siga automáticos.

Regras de qualidade:
- **palavra** destaca na cor de destaque. Use em 1-3 palavras-chave por slide, nunca em frases inteiras.
- Capa: gancho forte e específico (número, promessa, curiosidade, contraste). Nada genérico.
- Um assunto por slide, no máximo ~45 palavras por slide. Texto em português do Brasil, direto, sem clichês de IA ("no mundo de hoje", "revolucionar", "desbloqueie").
- Carrossel: 5 a 9 slides, começa em capa e termina em cta. Post único: 1 slide (capa, tweet, texto ou foto).
- Varie layouts com ritmo, mas mantenha a mesma identidade (cores e fontes) do começo ao fim.
- Fotos: use os ids da biblioteca. Prefira as fotos reais da Mariana na capa e no cta (rosto bem visível). "foco" ajusta o recorte (ex.: "50% 20%" sobe o enquadramento para o rosto).
- Se faltar uma foto adequada (ex.: ela num palco, num escritório, segurando um celular), use gerar_foto partindo de 1-2 fotos reais dela (mantém o rosto). Prompt em inglês, detalhado (cena, roupa, luz, lente, enquadramento). No máximo 3 fotos novas por pedido, e só quando fizer diferença real.
- Para conferir uma foto antes de usar, chame ver_fotos.
- Fontes disponíveis: Anton, Archivo Black, Bricolage Grotesque, Inter, Montserrat, DM Mono, Instrument Serif, Playfair Display, Fraunces, Caveat.
- Se houver referência, siga a estrutura, o ritmo e o acabamento dela (não copie texto).
- Em ajustes pelo chat, mude só o que foi pedido e preserve o resto (ids dos slides inclusive).
Depois de salvar, responda em 1-3 frases curtas o que fez (sem listar slide por slide).`;

const FERRAMENTAS = [
  {
    name: "salvar_design",
    description: "Grava o design completo do criativo (substitui o atual).",
    input_schema: {
      type: "object",
      properties: {
        design: { type: "object", description: "JSON completo do design" },
        resumo: { type: "string", description: "o que mudou, em até 12 palavras" },
      },
      required: ["design", "resumo"],
    },
  },
  {
    name: "gerar_foto",
    description:
      "Cria uma foto nova com IA a partir de fotos reais da Mariana (mantém o rosto) ou do zero (sem pessoa). Devolve o id da nova foto.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "descrição detalhada em inglês" },
        fotos_base: {
          type: "array",
          items: { type: "string" },
          description: "ids de 1-2 fotos reais dela; vazio = gerar do zero",
        },
        formato: { type: "string", enum: ["4:5", "1:1", "9:16", "16:9"] },
        nome: { type: "string", description: "nome curto em português" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "ver_fotos",
    description: "Mostra as fotos (até 6) para você conferir antes de escolher.",
    input_schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
      required: ["ids"],
    },
  },
];

async function gerarFotoIA(input: any) {
  const ids = (input.fotos_base ?? []).filter(Boolean).slice(0, 2);
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/cria-imagem`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      acao: ids.length ? "editar" : "gerar",
      fotos_ids: ids,
      prompt: ids.length
        ? `Keep the person's face, identity, skin tone, hair and body exactly as in the reference photo(s). ${input.prompt}`
        : input.prompt,
      formato: input.formato ?? "4:5",
      nome: input.nome,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error ?? `cria-imagem ${r.status}`);
  return j.fotos?.[0];
}

async function contexto(sb: any, p: any) {
  const [{ data: fotos }, { data: marca }, ref, { data: msgs }] = await Promise.all([
    sb
      .from("cria_fotos")
      .select("id, nome, descricao, origem, favorita, created_at")
      .neq("origem", "referencia")
      .order("favorita", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80),
    sb
      .from("vedit_marcas")
      .select("nome, marca, instrucoes")
      .order("padrao", { ascending: false })
      .limit(1)
      .maybeSingle(),
    p.referencia_id
      ? sb.from("cria_referencias").select("autor, analise").eq("id", p.referencia_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sb
      .from("cria_mensagens")
      .select("papel, conteudo")
      .eq("projeto_id", p.id)
      .order("created_at", { ascending: false })
      .limit(14),
  ]);
  const lista = (fotos ?? [])
    .map(
      (f: any) =>
        `- ${f.id} | ${f.origem === "ia" ? "gerada por IA" : "foto real"}${f.favorita ? " | favorita" : ""} | ${f.nome ?? ""}${f.descricao ? ` — ${f.descricao}` : ""}`,
    )
    .join("\n");
  return {
    texto: `PROJETO: ${p.nome}
Tipo: ${p.tipo === "unico" ? "post único (1 slide)" : "carrossel"} · Formato ${p.formato} · Objetivo: ${p.objetivo === "anuncio" ? "anúncio pago (clareza e CTA)" : "orgânico (salvamentos e compartilhamentos)"}
Briefing: ${p.briefing || "(sem briefing)"}

MARCA (padrão do editor de vídeo): ${JSON.stringify(marca?.marca ?? {})}${marca?.instrucoes ? `\nInstruções da marca: ${marca.instrucoes}` : ""}

${ref?.data?.analise ? `REFERÊNCIA a seguir${ref.data.autor ? ` (@${ref.data.autor})` : ""}:\n${JSON.stringify(ref.data.analise)}\n` : ""}
BIBLIOTECA DE FOTOS (id | tipo | nome — descrição):
${lista || "(vazia: faça sem fotos ou gere do zero)"}

DESIGN ATUAL:
${JSON.stringify(p.design ?? {})}`,
    historico: (msgs ?? []).reverse(),
  };
}

async function rodar(sb: any, projetoId: string, pedido: string) {
  const { data: p } = await sb.from("cria_projetos").select("*").eq("id", projetoId).single();
  if (!p) throw new Error("projeto não encontrado");
  try {
    const ctx = await contexto(sb, p);
    const conversa = ctx.historico
      .filter((m: any) => m.papel !== "sistema")
      .slice(0, -1)
      .map((m: any) => `${m.papel === "usuario" ? "Mariana" : "Você"}: ${m.conteudo}`)
      .join("\n");
    const messages: any[] = [
      {
        role: "user",
        content: `${ctx.texto}${conversa ? `\n\nCONVERSA ANTERIOR:\n${conversa}` : ""}\n\nPEDIDO AGORA: ${pedido}`,
      },
    ];
    let salvou = false;
    let geradas = 0;
    let resposta = "";
    for (let volta = 0; volta < 8; volta++) {
      const j = await claude(
        sb,
        { max_tokens: 12000, system: GUIA, tools: FERRAMENTAS, messages },
        "cria-agente",
      );
      messages.push({ role: "assistant", content: j.content });
      resposta = textoDe(j) || resposta;
      const usos = (j.content ?? []).filter((c: any) => c.type === "tool_use");
      if (!usos.length) break;
      // Toda chamada recebe resposta (senão a API recusa a próxima volta).
      const resultados = await Promise.all(
        usos.map(async (u: any) => {
          try {
            if (u.name === "salvar_design") {
              const d = u.input?.design;
              if (!d || !Array.isArray(d.slides) || !d.slides.length)
                throw new Error("design sem slides");
              d.slides = d.slides.map((s: any, i: number) => ({ ...s, id: s.id || `s${i + 1}` }));
              const versao = (p.versao ?? 0) + 1;
              p.versao = versao;
              p.design = d;
              await sb.from("cria_versoes").insert({
                projeto_id: projetoId,
                versao,
                design: d,
                resumo: String(u.input.resumo ?? "").slice(0, 200),
              });
              await sb
                .from("cria_projetos")
                .update({ design: d, versao, updated_at: new Date().toISOString() })
                .eq("id", projetoId);
              salvou = true;
              return {
                type: "tool_result",
                tool_use_id: u.id,
                content: `salvo (versão ${versao})`,
              };
            }
            if (u.name === "gerar_foto") {
              if (geradas >= 3)
                throw new Error(
                  "limite de 3 fotos novas por pedido atingido; use as que já existem",
                );
              geradas++;
              await sb.from("cria_mensagens").insert({
                projeto_id: projetoId,
                papel: "sistema",
                conteudo: `Gerando foto: ${String(u.input?.nome ?? u.input?.prompt ?? "").slice(0, 120)}`,
              });
              const f = await gerarFotoIA(u.input ?? {});
              return { type: "tool_result", tool_use_id: u.id, content: `foto criada: id ${f.id}` };
            }
            if (u.name === "ver_fotos") {
              const ids = (u.input?.ids ?? []).slice(0, 6);
              const { data: fs } = await sb.from("cria_fotos").select("id, path").in("id", ids);
              const blocos: any[] = [];
              for (const f of fs ?? []) {
                const b = await imagemBloco(sb, f.path);
                if (b) blocos.push({ type: "text", text: `foto ${f.id}:` }, b);
              }
              return {
                type: "tool_result",
                tool_use_id: u.id,
                content: blocos.length ? blocos : "nenhuma foto encontrada",
              };
            }
            throw new Error(`ferramenta desconhecida: ${u.name}`);
          } catch (e) {
            return {
              type: "tool_result",
              tool_use_id: u.id,
              is_error: true,
              content: String((e as Error).message),
            };
          }
        }),
      );
      messages.push({ role: "user", content: resultados });
    }
    await sb.from("cria_mensagens").insert({
      projeto_id: projetoId,
      papel: "claude",
      conteudo:
        resposta ||
        (salvou ? "Pronto." : "Não consegui montar o design desta vez. Tente reformular o pedido."),
    });
    await sb
      .from("cria_projetos")
      .update({ status: salvou || p.design?.slides?.length ? "pronto" : "erro", erro: null })
      .eq("id", projetoId);
  } catch (e) {
    const msg = String((e as Error).message).slice(0, 500);
    await sb
      .from("cria_mensagens")
      .insert({ projeto_id: projetoId, papel: "sistema", conteudo: `Erro: ${msg}` });
    await sb.from("cria_projetos").update({ status: "erro", erro: msg }).eq("id", projetoId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === "descrever_foto")
      return json({ descricao: await descreverFoto(sb, body.foto_id) });

    if (body.acao === "referencia") {
      const post = await baixarPost(sb, String(body.url ?? ""), String(body.username ?? ""));
      const { data, error } = await sb
        .from("cria_referencias")
        .insert({
          url: body.url,
          autor: post.autor,
          legenda: post.legenda,
          imagens: post.paths,
          status: "analisando",
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      emSegundoPlano(analisarReferencia(sb, data.id));
      return json({ referencia: data });
    }
    if (body.acao === "analisar_referencia") {
      emSegundoPlano(analisarReferencia(sb, body.id));
      return json({ ok: true });
    }

    if (body.acao === "criar" || body.acao === "mensagem") {
      const id = String(body.projeto_id ?? "");
      const { data: p } = await sb
        .from("cria_projetos")
        .select("id, status, tipo, updated_at")
        .eq("id", id)
        .single();
      if (!p) return json({ error: "projeto não encontrado" }, 404);
      // Se o trabalho anterior morreu no meio (limite de tempo da função), libera depois de 6 min.
      const travado = Date.now() - new Date(p.updated_at).getTime() > 6 * 60 * 1000;
      if (p.status === "gerando" && !travado)
        return json({ error: "O Claude ainda está trabalhando neste criativo." }, 409);
      let pedido: string;
      if (body.acao === "criar") {
        pedido =
          p.tipo === "unico"
            ? "Crie o post único a partir do briefing."
            : "Crie o carrossel completo a partir do briefing.";
        await sb
          .from("cria_mensagens")
          .insert({ projeto_id: id, papel: "sistema", conteudo: "Montando o criativo…" });
      } else {
        const texto = String(body.texto ?? "").trim();
        if (!texto) return json({ error: "mensagem vazia" }, 400);
        await sb
          .from("cria_mensagens")
          .insert({ projeto_id: id, papel: "usuario", conteudo: texto });
        pedido = body.slide_id
          ? `${texto}\n(Ela está olhando o slide de id "${body.slide_id}".)`
          : texto;
      }
      await sb
        .from("cria_projetos")
        .update({ status: "gerando", erro: null, updated_at: new Date().toISOString() })
        .eq("id", id);
      emSegundoPlano(rodar(sb, id, pedido));
      return json({ ok: true });
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
