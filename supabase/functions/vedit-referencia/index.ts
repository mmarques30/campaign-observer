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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%$]/g, "");

async function logUso(sb: any, origem: string, usage: any, refId: string | null) {
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
      metadata: { vedit_referencia_id: refId },
    });
  } catch (_) {
    /* telemetria não derruba a função */
  }
}

// ─── metadados por oEmbed ───────────────────────────────────────────────────
function plataformaDe(url: string) {
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

Analise e chame registrar_analise.`;

  // Às vezes o Claude devolve a ferramenta com campos quebrados: valida e tenta de novo (até 2x).
  const valida = (a: any) =>
    a &&
    typeof a.resumo === "string" &&
    typeof a.estilo?.nome === "string" &&
    Array.isArray(a.tecnicas) &&
    typeof a.prompt_para_editor === "string" &&
    !/<parameter name=/.test(JSON.stringify(a));
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
        system: `Você é diretor de edição da IAplicada analisando Reels de referência para extrair técnicas reproduzíveis. Seja concreto e técnico: nomeie cada técnica, diga em que segundos acontece, o que está na tela e como reproduzir (camadas, movimento, duração, fonte, cor). Compare com o nosso catálogo e marque cada técnica como temos / adaptar / criar, citando o tipo do efeito nosso quando houver. Seja enxuto: no máximo 12 técnicas (agrupe as repetidas), descricao e como_reproduzir com até 30 palavras cada. Escreva em português do Brasil, sem emojis. O prompt_para_editor deve ser um pedido natural que a pessoa cola no chat do editor (ex.: "Edita no estilo estúdio branco: /titulo com a palavra-chave em vermelho nos 3 primeiros segundos, /letreiro em 'resolve', zoom de soco a cada frase, legenda karaoke 1 palavra por bloco, /cta no final com 'EDIT IA'").`,
        tools: [FERRAMENTA],
        tool_choice: { type: "tool", name: "registrar_analise" },
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
    analise = resp?.content?.find((c: any) => c.type === "tool_use")?.input ?? null;
  }
  if (!valida(analise)) {
    await sb
      .from("vedit_referencias")
      .update({ status: "erro", erro: "A análise veio incompleta. Clique em Reanalisar." })
      .eq("id", id);
    return json({ error: "análise incompleta" }, 502);
  }
  await sb.from("vedit_referencias").update({ analise, status: "pronta", erro: null }).eq("id", id);
  return json({ ok: true, analise });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
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
