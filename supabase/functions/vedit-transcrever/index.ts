// vedit-transcrever — transcreve o áudio de um projeto do editor palavra a palavra.
// O front extrai o áudio do vídeo no navegador (WAV 16 kHz mono, leve) e sobe em
// video-edicao/<projeto>/audio.wav. Aqui: OpenAI whisper-1 com timestamps por
// palavra (o gpt-4o-transcribe não devolve tempo por palavra). A pontuação vem dos
// segmentos e é reencaixada nas palavras.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { projeto_id } = await req.json().catch(() => ({}));
  if (!projeto_id) return json({ error: "projeto_id obrigatório" }, 400);

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

    const form = new FormData();
    form.append("file", new Blob([blob], { type: "audio/wav" }), "audio.wav");
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
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

    // Tokens pontuados dos segmentos, em ordem.
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
      .from("vedit_projetos")
      .update({ palavras, transcricao_texto: t.text ?? "", status: "pronto_para_editar" })
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
