// vedit-referencia — Edição → Referências. Três ações:
//   metadados  { url }                 → autor/título/thumb via oEmbed (YouTube, TikTok; Instagram quando o app tiver oEmbed)
//   transcrever { id }                 → Whisper palavra a palavra do áudio em video-edicao/referencias/<id>/audio.wav
//   analisar   { id, catalogo }        → Claude lê as folhas de quadros + fala + nosso catálogo e devolve a análise estruturada
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
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%$]/g, "");

/**
 * Empresa ativa de quem chamou (multiempresa do IAplicada Ads): atribui o gasto
 * de API à empresa certa. Resolvida só na hora de gravar o log, uma vez por
 * requisição. Nunca lança — sem usuário identificado, o banco usa a IAplicada.
 */
async function empresaDoChamador(sb: any): Promise<string | null> {
  if (sb.__empresa !== undefined) return sb.__empresa;
  sb.__empresa = null;
  try {
    const jwt = (sb.__req?.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return null;
    const { data } = await sb.auth.getUser(jwt);
    const uid = data?.user?.id;
    if (!uid) return null;
    const { data: emp } = await sb.rpc("mads_empresa_ativa_de", { _uid: uid });
    sb.__empresa = (emp as string) ?? null;
  } catch (_) {
    /* sem empresa: fica a IAplicada */
  }
  return sb.__empresa;
}

async function logUso(sb: any, origem: string, usage: any, refId: string | null) {
  try {
    const input = usage?.input_tokens ?? 0,
      output = usage?.output_tokens ?? 0;
    if (!input && !output) return;
    await sb.from("api_usage_log").insert({
      provider: "anthropic",
      empresa_id: await empresaDoChamador(sb),
      origem,
      model: MODELO,
      input_tokens: input,
      output_tokens: output,
      custo_usd: (input * 5 + output * 25) / 1_000_000,
      metadata: { vedit_referencia_id: refId },
    });
  } catch (_) {
    /* telemetria não derruba a função */
  }
}

// ─── metadados por oEmbed ───────────────────────────────────────────────────
function plataformaDe(url: string) {
  if (/facebook\.com\/ads\/library/i.test(url)) return "ads_library";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  return "arquivo";
}
async function metadados(sb: any, url: string) {
  const plataforma = plataformaDe(url);
  const codigo = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
  let autor: string | null = null,
    titulo: string | null = null,
    thumb: string | null = null;
  try {
    let oembed: string | null = null;
    if (plataforma === "youtube")
      oembed = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    if (plataforma === "tiktok")
      oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    if (plataforma === "instagram") {
      // Precisa de app com a feature "oEmbed Read"; se não tiver, segue só com o código do post.
      let token: string | null = null;
      try {
        const { data } = await sb.rpc("get_secret", { secret_name: "META_ADS_TOKEN" });
        token = data ?? null;
      } catch (_) {
        /* sem token */
      }
      if (token)
        oembed = `https://graph.facebook.com/v20.0/instagram_oembed?url=${encodeURIComponent(url)}&fields=author_name,thumbnail_url,title&access_token=${token}`;
    }
    if (oembed) {
      const r = await fetch(oembed);
      if (r.ok) {
        const j = await r.json();
        autor = j.author_name ?? null;
        titulo = j.title ?? null;
        thumb = j.thumbnail_url ?? null;
      }
    }
  } catch (_) {
    /* oEmbed é opcional */
  }
  return { plataforma, codigo, autor, titulo, thumb };
}

// ─── transcrição (mesmo Whisper do editor) ──────────────────────────────────
async function transcrever(sb: any, id: string) {
  const { data: ref } = await sb
    .from("vedit_referencias")
    .select("id, audio_path")
    .eq("id", id)
    .single();
  if (!ref?.audio_path) return json({ error: "referência sem áudio" }, 400);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY não configurada" }, 500);
  const { data: blob, error } = await sb.storage.from(BUCKET).download(ref.audio_path);
  if (error || !blob) return json({ error: `não achei o áudio: ${error?.message}` }, 400);
  const form = new FormData();
  form.append("file", new Blob([blob], { type: "audio/wav" }), "audio.wav");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  form.append(
    "prompt",
    "Reels de Instagram sobre edição de vídeo com IA. Claude, ChatGPT, CapCut, Premiere, motion, legenda, prompt.",
  );
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const corpo = await r.text();
  if (!r.ok) {
    await sb
      .from("vedit_referencias")
      .update({ status: "erro", erro: `Transcrição: OpenAI ${r.status}` })
      .eq("id", id);
    return json({ error: `OpenAI ${r.status}: ${corpo.slice(0, 300)}` }, 502);
  }
  const t = JSON.parse(corpo);
  const tokens: string[] = (t.segments ?? [])
    .flatMap((s: any) =>
      String(s.text ?? "")
        .trim()
        .split(/\s+/),
    )
    .filter(Boolean);
  let k = 0;
  const palavras = (t.words ?? []).map((w: any) => {
    let texto = String(w.word ?? "").trim();
    for (let j = k; j < Math.min(k + 4, tokens.length); j++) {
      if (norm(tokens[j]) === norm(texto)) {
        texto = tokens[j];
        k = j + 1;
        break;
      }
    }
    return {
      p: texto,
      i: Math.round(Number(w.start) * 100) / 100,
      f: Math.round(Number(w.end) * 100) / 100,
    };
  });
  await sb
    .from("vedit_referencias")
    .update({ palavras, transcricao_texto: t.text ?? "" })
    .eq("id", id);
  return json({ ok: true, palavras: palavras.length });
}

// ─── análise visual ─────────────────────────────────────────────────────────
const FONTES_NOSSAS = [
  "Anton",
  "Archivo",
  "Archivo Black",
  "Bebas Neue",
  "Bricolage Grotesque",
  "DM Serif Display",
  "Fraunces",
  "Inter",
  "Instrument Serif",
  "Manrope",
  "Montserrat",
  "Oswald",
  "Outfit",
  "Playfair Display",
  "Plus Jakarta Sans",
  "Poppins",
  "Sora",
  "Space Grotesk",
  "Syne",
  "Unbounded",
  "DM Mono",
  "Caveat",
];

const FERRAMENTA = {
  name: "registrar_analise",
  description: "Registra a análise estruturada do vídeo de referência.",
  input_schema: {
    type: "object",
    properties: {
      resumo: { type: "string", description: "2 frases: do que o vídeo é e por que funciona." },
      gancho: {
        type: "object",
        properties: {
          texto: { type: "string" },
          tecnica: { type: "string" },
          segundos: { type: "number", description: "Em que segundo o gancho fecha." },
        },
        required: ["texto", "tecnica"],
      },
      estilo: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome curto do estilo (ex.: 'estúdio branco + vermelho').",
          },
          descricao: { type: "string" },
          paleta: { type: "array", items: { type: "string" }, description: "Cores em hex." },
          tipografia: { type: "string" },
          com_pessoa: { type: "boolean" },
        },
        required: ["nome", "descricao"],
      },
      ritmo: {
        type: "object",
        properties: {
          estimulo_medio_s: {
            type: "number",
            description: "Segundos entre um estímulo visual e o próximo.",
          },
          legenda_estilo: { type: "string" },
          legenda_palavras_por_bloco: { type: "integer" },
          legenda_posicao: { type: "string", enum: ["inferior", "centro", "superior"] },
        },
      },
      tecnicas: {
        type: "array",
        description: "Cada técnica visual/sonora identificada, em ordem de tempo.",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            de: { type: "number" },
            ate: { type: "number" },
            categoria: {
              type: "string",
              enum: ["texto", "ui", "midia", "formato", "transicao", "legenda", "som", "cenario"],
            },
            descricao: { type: "string", description: "O que aparece na tela." },
            como_reproduzir: {
              type: "string",
              description: "Receita técnica curta (camadas, animação, duração).",
            },
            status: {
              type: "string",
              enum: ["temos", "adaptar", "criar"],
              description:
                "temos = existe no catálogo; adaptar = existe mas precisa de ajuste; criar = não existe.",
            },
            efeito_nosso: {
              type: ["string", "null"],
              description: "tipo do efeito do catálogo que cobre (ou cobriria) a técnica.",
            },
            props_sugeridos: { type: ["string", "null"] },
          },
          required: ["nome", "de", "ate", "categoria", "descricao", "como_reproduzir", "status"],
        },
      },
      cta: {
        type: "object",
        properties: { texto: { type: "string" }, tecnica: { type: "string" } },
      },
      aprendizados: {
        type: "array",
        items: { type: "string" },
        description: "3 a 5 frases: o que copiar para os vídeos da IAplicada.",
      },
      preset_estilo: {
        type: "object",
        description: "Como reproduzir o estilo no nosso editor.",
        properties: {
          legenda: { type: "string" },
          look: { type: "string" },
          transicao: { type: "string" },
          efeitos_preferidos: { type: "array", items: { type: "string" } },
          estilo_base: { type: "string", enum: ["viral", "editorial", "limpo"] },
          fonte_titulo: {
            type: "string",
            enum: FONTES_NOSSAS,
            description: "Das nossas fontes, a mais parecida com a dos títulos da referência.",
          },
          fonte_texto: { type: "string", enum: FONTES_NOSSAS },
          cor_destaque: { type: "string", description: "Cor de destaque da referência em hex." },
          cor_fundo_ui: {
            type: "string",
            description: "Cor dos cards/telas da referência em hex.",
          },
        },
      },
      layouts: {
        type: "array",
        description:
          "Até 4 telas-chave da referência redesenhadas como composição livre (posições em fração 0–1 do quadro vertical, medindo nas folhas). Use os textos como MOLDE entre chaves, ex.: {TITULO}, {ITEM1}, {NUMERO} — quem aplicar troca pelo conteúdo do outro vídeo.",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            quando: {
              type: "string",
              description: "Em que momento da fala usar (ex.: gancho, lista, prova, CTA).",
            },
            fundo: { type: "string" },
            elementos: {
              type: "array",
              items: {
                type: "object",
                description:
                  "tipo texto|caixa|icone|brilho|linha, x,y,w,h, texto, fonte, peso, tamanho (px num quadro de 1080), cor, fundo, borda, raio, sombra, vidro, brilho, giroY, entrada, atraso, flutuar",
              },
            },
          },
          required: ["nome", "elementos"],
        },
      },
      prompt_para_editor: {
        type: "string",
        description:
          "Um pedido pronto, em português, para colar no chat do editor e reproduzir esse estilo num vídeo nosso (cite efeitos do catálogo pelo /comando).",
      },
    },
    required: [
      "resumo",
      "gancho",
      "estilo",
      "ritmo",
      "tecnicas",
      "aprendizados",
      "preset_estilo",
      "prompt_para_editor",
    ],
  },
};

/** Decupagem: a ESTRUTURA medida da referência, trecho a trecho (layout de tela, quanto a mídia
 *  ocupa, como as metades se encontram, ritmo de troca, legenda). É o mapa que a edição copia ao
 *  pé da letra; a análise de técnicas fica como apoio. */
const DECUPAGEM_SCHEMA = {
  type: "object",
  properties: {
    trechos: {
      type: "array",
      description:
        "A linha do tempo inteira, sem buracos, do 0 ao fim. Um trecho novo sempre que o LAYOUT muda (não a cada troca de imagem).",
      items: {
        type: "object",
        properties: {
          de: { type: "number" },
          ate: { type: "number" },
          layout: {
            type: "string",
            enum: ["dividida", "so-fala", "midia-cheia", "texto-cheio"],
            description:
              "dividida = mídia numa parte e a pessoa falando na outra; so-fala = só a pessoa em tela cheia; midia-cheia = só imagem/vídeo de apoio; texto-cheio = tela de texto/grafismo.",
          },
          lado_midia: {
            type: ["string", "null"],
            enum: ["cima", "baixo", "esquerda", "direita", null],
          },
          midia_ocupa: {
            type: ["number", "null"],
            description:
              "Fração da ALTURA (ou largura) que a mídia ocupa, medida nos quadros (ex.: 0.55).",
          },
          emenda: {
            type: ["string", "null"],
            enum: ["degrade", "linha", "seca", null],
            description:
              "Como a mídia encontra a pessoa: degradê suave, linha/borda, ou corte reto.",
          },
          troca_midia_s: {
            type: ["number", "null"],
            description: "De quantos em quantos segundos a imagem de apoio troca dentro do trecho.",
          },
          midia_tipo: {
            type: ["string", "null"],
            description:
              "O que as mídias mostram em relação à fala (ex.: 'foto/vídeo real do fato citado', 'produto citado', 'banco de imagem genérico').",
          },
          sobreposicoes: {
            type: "array",
            items: { type: "string" },
            description:
              "Grafismos que existem de fato neste trecho (ex.: 'caixa branca com o gancho em 3 linhas no canto inferior esquerdo da mídia'). Vazio se não há.",
          },
        },
        required: ["de", "ate", "layout"],
      },
    },
    pessoa_na_dividida: {
      type: "object",
      properties: {
        rosto_y: {
          type: "number",
          description: "Altura do centro do rosto no quadro quando a tela está dividida (0–1).",
        },
        tamanho_relativo: {
          type: "number",
          description:
            "Tamanho da pessoa na dividida em relação à tela cheia (1 = igual, 0.75 = menor).",
        },
      },
    },
    legenda: {
      type: "object",
      properties: {
        palavras_por_bloco: { type: "integer" },
        y: { type: "number", description: "Altura do centro da legenda (0–1)." },
        tamanho: { type: "string", enum: ["pequena", "media", "grande"] },
        cor: { type: "string" },
        caixa_alta: { type: "boolean" },
        estilo: {
          type: "string",
          description: "Ex.: 'palavra solta branca sem fundo, fonte regular'.",
        },
      },
    },
    nao_usa: {
      type: "array",
      items: { type: "string" },
      description:
        "Recursos que a referência NÃO usa e que não podem aparecer na cópia (ex.: música, efeitos sonoros, cards, palavra gigante, zoom, ícones, barra de progresso).",
    },
    resumo_estrutura: {
      type: "string",
      description:
        "Em 2–3 frases, a estrutura: como os blocos se alternam e em que proporção do vídeo.",
    },
  },
  required: ["trechos", "legenda", "nao_usa", "resumo_estrutura"],
};

async function decupar(key: string, imagens: any[], duracao: number, fala: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 6000,
      system:
        "Você é montador de vídeo fazendo a DECUPAGEM de um Reel: mede a estrutura visual quadro a quadro para ela ser copiada exatamente. Só registre o que está nos quadros; nunca sugira melhorias nem recursos que o vídeo não tem. Meça proporções olhando onde as bordas ficam no quadro. Português do Brasil.",
      messages: [
        {
          role: "user",
          content: [
            ...imagens,
            {
              type: "text",
              text: `Duração: ${duracao.toFixed(1)}s. As imagens são folhas de quadros em ordem (3 colunas × 4 linhas, esquerda→direita, cima→baixo), com o tempo no canto de cada quadro.\n\nFALA:\n${fala.slice(0, 4000)}\n\nResponda SOMENTE com JSON válido neste schema:\n${JSON.stringify(DECUPAGEM_SCHEMA)}`,
            },
          ],
        },
      ],
    }),
  });
  const j = await r.json().catch(() => null);
  const txt = (j?.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
  try {
    const d = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
    if (!Array.isArray(d?.trechos) || !d.trechos.length)
      return { decupagem: null, usage: j?.usage };
    d.trechos = d.trechos
      .filter((t: any) => typeof t.de === "number" && typeof t.ate === "number" && t.ate > t.de)
      .sort((a: any, b: any) => a.de - b.de);
    return { decupagem: d, usage: j?.usage };
  } catch {
    return { decupagem: null, usage: j?.usage };
  }
}

async function analisar(sb: any, id: string, catalogo: string) {
  const { data: ref } = await sb.from("vedit_referencias").select("*").eq("id", id).single();
  if (!ref) return json({ error: "referência não encontrada" }, 404);
  if (!ref.folhas?.length) return json({ error: "sem folhas de quadros" }, 400);
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!key) return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);
  await sb.from("vedit_referencias").update({ status: "analisando", erro: null }).eq("id", id);

  const imagens: any[] = [];
  for (const p of ref.folhas.slice(0, 8)) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(p, 3600);
    if (data?.signedUrl)
      imagens.push({ type: "image", source: { type: "url", url: data.signedUrl } });
  }
  const palavras = (ref.palavras ?? []) as { p: string; i: number; f: number }[];
  const fala = palavras.length
    ? palavras.map((w) => `[${w.i.toFixed(1)}s] ${w.p}`).join(" ")
    : "(sem transcrição — leia a legenda queimada nos quadros)";
  const texto = `VÍDEO DE REFERÊNCIA
Plataforma: ${ref.plataforma} · Autor: ${ref.autor ?? "?"} · Duração: ${Number(ref.duracao ?? 0).toFixed(0)}s · Métricas: ${JSON.stringify(ref.metricas ?? {})}
Legenda do post: ${(ref.legenda ?? "").slice(0, 800) || "(sem)"}
Por que foi salvo (notas): ${ref.notas ?? "(sem notas)"}

FALA (palavra a palavra):
${fala.slice(0, 6000)}

As imagens são folhas de quadros do vídeo, em ordem, com o tempo carimbado no canto de cada quadro (3 colunas × 4 linhas, lendo da esquerda para a direita, de cima para baixo).

NOSSO CATÁLOGO (para o mapeamento temos/adaptar/criar):
${catalogo || "(catálogo não enviado)"}

Responda SOMENTE com um objeto JSON válido (sem texto antes ou depois, sem markdown) que siga exatamente este JSON Schema:
${JSON.stringify(FERRAMENTA.input_schema)}`;

  // Às vezes o Claude devolve a ferramenta com campos quebrados: valida e tenta de novo (até 2x).
  const valida = (a: any) =>
    a &&
    typeof a.resumo === "string" &&
    typeof a.estilo?.nome === "string" &&
    Array.isArray(a.tecnicas) &&
    typeof a.prompt_para_editor === "string" &&
    !/<parameter name=/.test(JSON.stringify(a));
  const pDecupagem = decupar(key, imagens, Number(ref.duracao ?? 0), fala).catch(() => ({
    decupagem: null,
    usage: null,
  }));
  let analise: any = null;
  for (let tentativa = 0; tentativa < 2 && !valida(analise); tentativa++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 16000,
        system: `Você é diretor de edição da IAplicada analisando Reels de referência para extrair técnicas reproduzíveis. Seja concreto e técnico: nomeie cada técnica, diga em que segundos acontece, o que está na tela e como reproduzir (camadas, movimento, duração, fonte, cor). Compare com o nosso catálogo e marque cada técnica como temos / adaptar / criar, citando o tipo do efeito nosso quando houver. Liste SÓ o que a referência faz de verdade: nunca proponha recurso que ela não usa (se ela não tem cards, palavra gigante, música ou zoom, eles não entram nem como "adaptar"); "adaptar" é só para algo que ela faz e o nosso efeito reproduz com ajuste. Meça proporções nos quadros (ex.: onde fica a borda da tela dividida), não chute. Seja enxuto: no máximo 12 técnicas (agrupe as repetidas), descricao e como_reproduzir com até 30 palavras cada. Capte o DESIGN com precisão: tipografia (escolha a fonte nossa mais parecida), cores exatas, onde cada grafismo fica no quadro e como entra; em layouts, redesenhe as telas-chave como composição (é isso que permite reproduzir o visual em outro vídeo). Nunca ponha grafismo em cima do rosto da pessoa. Escreva em português do Brasil, sem emojis. O prompt_para_editor deve ser um pedido natural que a pessoa cola no chat do editor (ex.: "Edita no estilo estúdio branco: /titulo com a palavra-chave em vermelho nos 3 primeiros segundos, /letreiro em 'resolve', zoom de soco a cada frase, legenda karaoke 1 palavra por bloco, /cta no final com 'EDIT IA'").`,
        messages: [{ role: "user", content: [...imagens, { type: "text", text: texto }] }],
      }),
    });
    const corpo = await r.text();
    let resp: any = null;
    try {
      resp = JSON.parse(corpo);
    } catch (_) {
      /* não-JSON */
    }
    await logUso(sb, "vedit-referencia", resp?.usage, id);
    if (!r.ok) {
      await sb
        .from("vedit_referencias")
        .update({ status: "erro", erro: `Claude ${r.status}: ${corpo.slice(0, 300)}` })
        .eq("id", id);
      return json({ error: `Claude ${r.status}: ${corpo.slice(0, 300)}` }, 502);
    }
    // Resposta em JSON puro (mais estável que a ferramenta com objetos aninhados).
    const txt = (resp?.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
    try {
      const ini = txt.indexOf("{"),
        fim = txt.lastIndexOf("}");
      analise = ini >= 0 && fim > ini ? JSON.parse(txt.slice(ini, fim + 1)) : null;
    } catch (_) {
      analise = null;
    }
  }
  if (!valida(analise)) {
    await sb
      .from("vedit_referencias")
      .update({ status: "erro", erro: "A análise veio incompleta. Clique em Reanalisar." })
      .eq("id", id);
    return json({ error: "análise incompleta" }, 502);
  }
  const dec = await pDecupagem;
  if (dec.usage) await logUso(sb, "vedit-referencia", dec.usage, id);
  if (dec.decupagem) analise.decupagem = dec.decupagem;
  await sb.from("vedit_referencias").update({ analise, status: "pronta", erro: null }).eq("id", id);
  return json({ ok: true, analise });
}

/** Quais referências combinam com o negócio da empresa (cadastro de Marca): nota 0–3 e o porquê,
 *  numa chamada barata, guardada na marca por 14 dias. Só olha o resumo de cada referência. */
async function compatibilidade(sb: any) {
  const emp = await empresaDoChamador(sb);
  if (!emp) return { itens: {} };
  const { data: marca } = await sb
    .from("vedit_marcas")
    .select("*")
    .eq("empresa_id", emp)
    .order("padrao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const perfil = [
    marca?.o_que_faz ? `O que faz: ${marca.o_que_faz}` : "",
    marca?.nicho ? `Nicho: ${marca.nicho}` : "",
    marca?.publico ? `Público: ${marca.publico}` : "",
    marca?.objetivo ? `Objetivo do conteúdo: ${marca.objetivo}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  if (!marca || !perfil) return { itens: {}, semPerfil: true };
  const { data: refs } = await sb
    .from("vedit_referencias")
    .select("id, autor, analise, empresa_id")
    .eq("status", "pronta")
    .order("created_at", { ascending: false })
    .limit(80);
  const lista = ((refs ?? []) as any[]).filter((r) => r.analise?.resumo);
  const assinatura = `${perfil}|${lista.map((r) => r.id).join(",")}`;
  const cache = marca.sugestoes as { em?: string; assinatura?: string; itens?: any } | null;
  if (
    cache?.assinatura === assinatura &&
    cache.em &&
    Date.now() - new Date(cache.em).getTime() < 14 * 864e5
  )
    return { itens: cache.itens ?? {} };
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!key || !lista.length) return { itens: {} };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("VEDIT_MODELO_BUSCA") || "claude-haiku-5-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `EMPRESA:\n${perfil}\n\nVÍDEOS DE REFERÊNCIA (formato de edição; o assunto deles não importa, importa se o FORMATO serve para esta empresa gravar e editar os próprios vídeos):\n${lista
            .map(
              (x, i) =>
                `R${i}: ${x.analise?.estilo?.nome ?? ""} — ${String(x.analise.resumo).slice(0, 260)}${x.analise?.decupagem?.resumo_estrutura ? ` Estrutura: ${String(x.analise.decupagem.resumo_estrutura).slice(0, 200)}` : ""}`,
            )
            .join(
              "\n",
            )}\n\nPara cada referência, dê uma nota de 0 a 3 de quanto o formato combina com esta empresa (3 = dá para gravar igual amanhã; 0 = não serve) e, em até 14 palavras, o que ela traz de útil para a edição (estrutura, ritmo, tipo de imagem). Responda só JSON: {"R0":{"nota":2,"porque":"..."}, ...}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => null);
  await logUso(sb, "vedit-referencia", j?.usage, null);
  const txt = (j?.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("");
  const itens: Record<string, { nota: number; porque: string }> = {};
  try {
    const o = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
    lista.forEach((x, i) => {
      const v = o[`R${i}`];
      if (v)
        itens[x.id] = {
          nota: Math.max(0, Math.min(3, Number(v.nota) || 0)),
          porque: String(v.porque ?? "").slice(0, 140),
        };
    });
  } catch {
    return { itens: {} };
  }
  await sb
    .from("vedit_marcas")
    .update({ sugestoes: { em: new Date().toISOString(), assinatura, itens } })
    .eq("id", marca.id);
  return { itens };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  (sb as any).__req = req;
  const body = await req.json().catch(() => ({}));
  const { acao, id, url, catalogo } = body as {
    acao?: string;
    id?: string;
    url?: string;
    catalogo?: string;
  };
  try {
    if (acao === "metadados") {
      if (!url) return json({ error: "url obrigatória" }, 400);
      return json(await metadados(sb, url));
    }
    if (acao === "compatibilidade") return json(await compatibilidade(sb));
    if (!id) return json({ error: "id obrigatório" }, 400);
    if (acao === "transcrever") return await transcrever(sb, id);
    if (acao === "analisar") {
      // Roda em segundo plano (a resposta HTTP tem limite de tempo); a tela acompanha pelo status.
      const tarefa = analisar(sb, id, catalogo ?? "").catch(async (e) => {
        await sb
          .from("vedit_referencias")
          .update({ status: "erro", erro: e instanceof Error ? e.message : String(e) })
          .eq("id", id);
      });
      // @ts-ignore EdgeRuntime existe no runtime do Supabase
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(tarefa);
      else await tarefa;
      return json({ ok: true, segundoPlano: true });
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (id) await sb.from("vedit_referencias").update({ status: "erro", erro: msg }).eq("id", id);
    return json({ error: msg }, 500);
  }
});
