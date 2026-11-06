// vedit-transcrever — transcreve o áudio de um projeto do editor palavra a palavra.
// O front extrai o áudio do vídeo no navegador (WAV 16 kHz mono, leve) e sobe em
// video-edicao/<projeto>/audio.wav. Aqui: OpenAI whisper-1 com timestamps por
// palavra (o gpt-4o-transcribe não devolve tempo por palavra). A pontuação vem dos
// segmentos e é reencaixada nas palavras.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { remapearIndices, revisarRepeticoes, type Palavra } from "./revisar.ts";

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

/** whisper-1 com tempo por palavra; a pontuação vem dos segmentos e é reencaixada. */
async function whisper(key: string, wavBytes: Uint8Array, comPrompt: boolean) {
  const form = new FormData();
  form.append("file", new Blob([wavBytes], { type: "audio/wav" }), "audio.wav");
  form.append("model", "whisper-1");
  form.append("language", "pt");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  // Nos clipes curtos da revisão, sem prompt: ele deixaria o whisper "limpar" a repetição de novo.
  if (comPrompt)
    form.append(
      "prompt",
      "Vídeo de Instagram em português do Brasil. IAplicada, Claude, ChatGPT, CRM, WhatsApp, automação, inteligência artificial.",
    );
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const corpo = await r.text();
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${corpo.slice(0, 300)}`);
  const t = JSON.parse(corpo);
  const tokens: string[] = (t.segments ?? [])
    .flatMap((s: any) =>
      String(s.text ?? "")
        .trim()
        .split(/\s+/),
    )
    .filter(Boolean);
  let k = 0;
  const palavras: Palavra[] = (t.words ?? []).map((w: any) => {
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
  return { palavras, texto: String(t.text ?? "") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { projeto_id, revisar, arquivo } = await req.json().catch(() => ({}));
  if (!projeto_id) return json({ error: "projeto_id obrigatório" }, 400);
  if (revisar) return revisarProjeto(sb, projeto_id);
  // Vídeo juntado: transcreve só o áudio dele e devolve as palavras (quem chama encaixa no projeto).
  if (arquivo) return transcreverArquivo(sb, projeto_id, String(arquivo));

  const { data: proj, error } = await sb
    .from("vedit_projetos")
    .select("id, audio_path")
    .eq("id", projeto_id)
    .single();
  if (error || !proj?.audio_path) return json({ error: "projeto sem áudio" }, 400);
  await sb
    .from("vedit_projetos")
    .update({ status: "transcrevendo", erro: null })
    .eq("id", projeto_id);

  try {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY não configurada");
    const { data: blob, error: e2 } = await sb.storage
      .from("video-edicao")
      .download(proj.audio_path);
    if (e2 || !blob) throw new Error(`não achei o áudio: ${e2?.message}`);
    if (blob.size > 25 * 1024 * 1024)
      throw new Error("áudio acima de 25 MB (vídeo longo demais: corte em partes de até 12 min)");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const t = await whisper(key, bytes, true);
    let palavras: Palavra[] = t.palavras;
    // Retomadas escondidas pelo whisper: confere pelo áudio e retranscreve esses pontos.
    try {
      const r = await revisarRepeticoes(
        palavras,
        bytes,
        async (w) => (await whisper(key, w, false)).palavras,
      );
      palavras = r.palavras;
      if (r.trocas)
        console.log(
          `[vedit-transcrever] ${r.trocas} retomada(s) recuperada(s) em ${r.janelas} janela(s)`,
        );
    } catch (e) {
      console.warn("[vedit-transcrever] revisão pelo áudio falhou:", (e as Error).message);
    }

    await sb
      .from("vedit_projetos")
      .update({ palavras, transcricao_texto: t.texto, status: "pronto_para_editar" })
      .eq("id", projeto_id);
    return json({ ok: true, palavras: palavras.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb
      .from("vedit_projetos")
      .update({ status: "erro", erro: `Transcrição: ${msg}` })
      .eq("id", projeto_id);
    return json({ error: msg }, 500);
  }
});

/**
 * Vídeo já transcrito: só procura as retomadas escondidas e atualiza as palavras, sem mexer no
 * status. Correções e destaques da legenda são índices de palavra: são remapeados pelo tempo.
 */
async function revisarProjeto(sb: any, projetoId: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY não configurada" }, 500);
  const { data: proj } = await sb
    .from("vedit_projetos")
    .select("id, audio_path, palavras, timeline, versao")
    .eq("id", projetoId)
    .single();
  if (!proj?.audio_path || !Array.isArray(proj.palavras))
    return json({ error: "projeto sem áudio ou sem transcrição" }, 400);
  const { data: blob, error } = await sb.storage.from("video-edicao").download(proj.audio_path);
  if (error || !blob) return json({ error: "não achei o áudio do vídeo" }, 400);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const antigas: Palavra[] = proj.palavras;
  const r = await revisarRepeticoes(
    antigas,
    bytes,
    async (w) => (await whisper(key, w, false)).palavras,
  );
  if (!r.trocas) return json({ ok: true, trocas: 0, janelas: r.janelas });

  const mapa = remapearIndices(antigas, r.palavras);
  const tl = proj.timeline ?? null;
  if (tl?.legenda) {
    const corr: Record<string, string> = {};
    for (const [k, v] of Object.entries(tl.legenda.correcoes ?? {})) {
      const n = mapa.get(Number(k));
      if (n != null) corr[String(n)] = v as string;
    }
    tl.legenda.correcoes = corr;
    tl.legenda.destaques = (tl.legenda.destaques ?? [])
      .map((k: number) => mapa.get(k))
      .filter((n: number | undefined) => n != null);
  }
  const versao = (proj.versao ?? 0) + 1;
  const { error: e2 } = await sb
    .from("vedit_projetos")
    .update({ palavras: r.palavras, ...(tl ? { timeline: tl, versao } : {}) })
    .eq("id", projetoId);
  if (e2) return json({ error: e2.message }, 500);
  if (tl)
    await sb.from("vedit_versoes").insert({
      projeto_id: projetoId,
      versao,
      timeline: tl,
      origem: "manual",
      resumo: `Transcrição revisada pelo áudio: ${r.trocas} retomada(s) encontrada(s)`,
    });
  return json({ ok: true, trocas: r.trocas, janelas: r.janelas });
}

/** Transcreve um WAV avulso do projeto (o vídeo que vai ser juntado), sem gravar nada. */
async function transcreverArquivo(sb: any, projetoId: string, caminho: string) {
  if (!caminho.startsWith(`${projetoId}/`)) return json({ error: "arquivo fora do projeto" }, 400);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY não configurada" }, 500);
  const { data: blob, error } = await sb.storage.from("video-edicao").download(caminho);
  if (error || !blob) return json({ error: `não achei o áudio: ${error?.message}` }, 400);
  if (blob.size > 25 * 1024 * 1024)
    return json({ error: "vídeo juntado longo demais (máximo de 12 min)" }, 400);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const t = await whisper(key, bytes, true);
  let palavras: Palavra[] = t.palavras;
  try {
    palavras = (
      await revisarRepeticoes(palavras, bytes, async (w) => (await whisper(key, w, false)).palavras)
    ).palavras;
  } catch (e) {
    console.warn("[vedit-transcrever] revisão pelo áudio falhou:", (e as Error).message);
  }
  return json({ ok: true, palavras, texto: t.texto });
}
