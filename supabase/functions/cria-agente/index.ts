// cria-agente — o Claude como diretor de arte dos criativos (carrosséis e posts únicos).
//   criar     { projeto_id }                    → monta o design a partir do briefing, fotos e referência
//   mensagem  { projeto_id, texto, slide_id? }  → ajusta o design pelo chat
//   descrever_foto { foto_id }                  → descrição curta da foto (para escolher as certas depois)
//   referencia { url, username? }               → cria a referência e põe o download na fila do servidor de vídeo
//   liberar_pendentes { id }                    → dispara os criativos que esperavam a referência
//   analisar_referencia { id }                  → (re)analisa uma referência (imagens já no bucket)
// O trabalho pesado roda em segundo plano (status "gerando"/"analisando"); a tela acompanha pelo banco.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODELO = Deno.env.get("VEDIT_MODELO") || "claude-opus-5";
const BUCKET = "video-edicao";
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
// O link é baixado pelo servidor de vídeo (yt-dlp, job "cria_referencia"), que sobe as imagens
// do carrossel e chama analisar_referencia. Não depende da API oficial nem do @ da conta.
const LINK_POST = /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i;

async function novaReferencia(sb: any, url: string, autor: string) {
  const bruto = url.trim();
  if (!LINK_POST.test(bruto))
    throw new Error("cole o link de um post do Instagram (instagram.com/p/...)");
  const limpo = bruto.split("?")[0].replace(/\/?$/, "/");
  const { data: ja } = await sb
    .from("cria_referencias")
    .select("*")
    .eq("url", limpo)
    .neq("status", "erro")
    .order("created_at", { ascending: false })
    .limit(1);
  if (ja?.[0]) return ja[0];
  const { data, error } = await sb
    .from("cria_referencias")
    .insert({
      url: limpo,
      autor: autor.replace(/^@/, "").trim() || null,
      imagens: [],
      status: "baixando",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const job = await sb
    .from("vedit_jobs")
    .insert({ tipo: "cria_referencia", params: { referencia_id: data.id, url: limpo } });
  if (job.error) {
    await sb
      .from("cria_referencias")
      .update({ status: "erro", erro: job.error.message })
      .eq("id", data.id);
    throw new Error(job.error.message);
  }
  return data;
}

/** Criativos que esperavam esta referência: dispara a criação (cada um numa chamada nova). */
async function liberarPendentes(sb: any, refId: string) {
  const { data } = await sb
    .from("cria_projetos")
    .select("id")
    .eq("referencia_id", refId)
    .eq("status", "aguardando");
  for (const p of data ?? []) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/cria-agente`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ acao: "criar", projeto_id: p.id }),
    }).catch(() => {});
  }
}

async function analisarReferencia(sb: any, id: string) {
  const { data: ref } = await sb.from("cria_referencias").select("*").eq("id", id).single();
  if (!ref) throw new Error("referência não encontrada");
  await sb.from("cria_referencias").update({ status: "analisando", erro: null }).eq("id", id);
  try {
    const imgs = (
      await Promise.all((ref.imagens ?? []).slice(0, 15).map((p: string) => imagemBloco(sb, p)))
    ).filter(Boolean);
    if (!imgs.length) throw new Error("sem imagens para analisar");
    const j = await claude(
      sb,
      {
        max_tokens: 8000,
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
 "estrutura": ["slide 1: papel e conteúdo (1 frase curta)", "slide 2: ...", ...]  (um item por slide, todos os slides),
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
  await liberarPendentes(sb, id);
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
- Carrossel: 5 a 9 slides (com ROTEIRO, quantos o roteiro pedir, até 15), começa em capa e termina em cta. Post único: 1 slide (capa, tweet, texto ou foto).
- Varie layouts com ritmo, mas mantenha a mesma identidade (cores e fontes) do começo ao fim.
- Fotos: use os ids da biblioteca. Prefira as fotos reais da Mariana na capa e no cta (rosto bem visível). "foco" ajusta o recorte (ex.: "50% 20%" sobe o enquadramento para o rosto).
- Se faltar uma foto adequada (ex.: ela num palco, num escritório, segurando um celular), use gerar_foto partindo de 1-2 fotos reais dela (mantém o rosto). Prompt em inglês, detalhado (cena, roupa, luz, lente, enquadramento). No máximo 3 fotos novas por pedido, e só quando fizer diferença real.
- Para conferir uma foto antes de usar, chame ver_fotos.
- Fontes disponíveis: Anton, Archivo Black, Bricolage Grotesque, Inter, Montserrat, DM Mono, Instrument Serif, Playfair Display, Fraunces, Caveat.
- ROTEIRO (quando houver) é o conteúdo: cada bloco dele vira um slide, na ordem (blocos separados por linha em branco, "Slide N", "---" ou numeração). Use as palavras dela: pode encurtar para caber, corrigir erros e marcar **destaques**, mas não invente assunto, não troque a ordem e não pule partes. Bloco grande demais vira dois slides seguidos. Sem capa/cta explícitos, o primeiro bloco é a capa e o cta entra no fim (a menos que o último bloco já seja a chamada). Antes de salvar, confira que tudo do roteiro está nos slides.
- REFERÊNCIA (quando houver) é o molde, slide a slide: o slide N do criativo segue o papel, o layout e a densidade de texto do slide N da referência ("estrutura" e "layouts" da análise e as imagens dela). Se o conteúdo tiver mais slides que a referência, repita o padrão dos slides do meio; se tiver menos, mantenha capa, miolo e fechamento. Copie o acabamento (tipografia, cores, caixa alta, posição da foto, numeração), nunca o texto.
- Sem roteiro, escreva o conteúdo a partir do briefing (e do molde da referência, se houver).
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
      ? sb
          .from("cria_referencias")
          .select("autor, analise, imagens")
          .eq("id", p.referencia_id)
          .maybeSingle()
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
${p.roteiro ? `\nROTEIRO da Mariana (distribua slide a slide, nesta ordem, sem perder nada):\n"""\n${p.roteiro}\n"""\n` : ""}
MARCA (padrão do editor de vídeo): ${JSON.stringify(marca?.marca ?? {})}${marca?.instrucoes ? `\nInstruções da marca: ${marca.instrucoes}` : ""}

${ref?.data?.analise ? `REFERÊNCIA a seguir${ref.data.autor ? ` (@${ref.data.autor})` : ""}:\n${JSON.stringify(ref.data.analise)}\n` : ""}
BIBLIOTECA DE FOTOS (id | tipo | nome — descrição):
${lista || "(vazia: faça sem fotos ou gere do zero)"}

DESIGN ATUAL:
${JSON.stringify(p.design ?? {})}`,
    historico: (msgs ?? []).reverse(),
    imagensRef: (ref?.data?.analise ? (ref.data.imagens ?? []) : []) as string[],
  };
}

async function rodar(sb: any, projetoId: string, pedido: string, verReferencia = false) {
  const { data: p } = await sb.from("cria_projetos").select("*").eq("id", projetoId).single();
  if (!p) throw new Error("projeto não encontrado");
  try {
    const ctx = await contexto(sb, p);
    const conversa = ctx.historico
      .filter((m: any) => m.papel !== "sistema")
      .slice(0, -1)
      .map((m: any) => `${m.papel === "usuario" ? "Mariana" : "Você"}: ${m.conteudo}`)
      .join("\n");
    const principal = `${ctx.texto}${conversa ? `\n\nCONVERSA ANTERIOR:\n${conversa}` : ""}\n\nPEDIDO AGORA: ${pedido}`;
    // Na criação, o Claude vê os slides da referência (o molde), não só a análise em texto.
    const imgsRef = verReferencia
      ? (
          await Promise.all(ctx.imagensRef.slice(0, 15).map((x: string) => imagemBloco(sb, x)))
        ).filter(Boolean)
      : [];
    const messages: any[] = [
      {
        role: "user",
        content: imgsRef.length
          ? [
              {
                type: "text",
                text: `Slides da REFERÊNCIA, em ordem (${imgsRef.length}). Use como molde visual e de estrutura, sem copiar o texto:`,
              },
              ...imgsRef,
              { type: "text", text: principal },
            ]
          : principal,
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
      const referencia = await novaReferencia(
        sb,
        String(body.url ?? ""),
        String(body.username ?? ""),
      );
      return json({ referencia });
    }
    // O servidor de vídeo não conseguiu baixar: solta quem estava esperando.
    if (body.acao === "liberar_pendentes") {
      await liberarPendentes(sb, String(body.id ?? ""));
      return json({ ok: true });
    }
    if (body.acao === "analisar_referencia") {
      emSegundoPlano(analisarReferencia(sb, body.id));
      return json({ ok: true });
    }

    if (body.acao === "criar" || body.acao === "mensagem") {
      const id = String(body.projeto_id ?? "");
      const { data: p } = await sb
        .from("cria_projetos")
        .select("id, status, tipo, updated_at, referencia_id, roteiro")
        .eq("id", id)
        .single();
      if (!p) return json({ error: "projeto não encontrado" }, 404);
      // Se o trabalho anterior morreu no meio (limite de tempo da função), libera depois de 6 min.
      const travado = Date.now() - new Date(p.updated_at).getTime() > 6 * 60 * 1000;
      if (p.status === "gerando" && !travado)
        return json({ error: "O Claude ainda está trabalhando neste criativo." }, 409);
      let pedido: string;
      if (body.acao === "criar") {
        let comRef = false;
        // Referência ainda baixando/analisando: o criativo espera e é disparado quando ela fica pronta.
        if (p.referencia_id) {
          const { data: ref } = await sb
            .from("cria_referencias")
            .select("status, created_at")
            .eq("id", p.referencia_id)
            .maybeSingle();
          const recente = ref && Date.now() - new Date(ref.created_at).getTime() < 10 * 60 * 1000;
          if (ref && ["nova", "baixando", "analisando"].includes(ref.status) && recente) {
            if (p.status !== "aguardando")
              await sb.from("cria_mensagens").insert({
                projeto_id: id,
                papel: "sistema",
                conteudo: "Lendo a referência antes de montar…",
              });
            await sb
              .from("cria_projetos")
              .update({ status: "aguardando", erro: null, updated_at: new Date().toISOString() })
              .eq("id", id);
            return json({ ok: true, aguardando: true });
          }
          comRef = ref?.status === "pronta";
          if (!comRef)
            await sb.from("cria_mensagens").insert({
              projeto_id: id,
              papel: "sistema",
              conteudo: "Não consegui ler a referência; vou montar sem ela.",
            });
        }
        pedido =
          p.tipo === "unico"
            ? `Crie o post único a partir ${p.roteiro ? "do ROTEIRO" : "do briefing"}${comRef ? ", no modelo da REFERÊNCIA" : ""}.`
            : p.roteiro
              ? `Crie o carrossel distribuindo o ROTEIRO slide a slide${comRef ? ", no molde da REFERÊNCIA (slide N segue o slide N dela)" : ""}. Use o briefing como contexto.`
              : `Crie o carrossel completo a partir do briefing${comRef ? ", no molde da REFERÊNCIA (slide N segue o slide N dela)" : ""}.`;
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
      emSegundoPlano(rodar(sb, id, pedido, body.acao === "criar"));
      return json({ ok: true });
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
