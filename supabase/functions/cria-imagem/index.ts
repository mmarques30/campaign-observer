// cria-imagem — estúdio de fotos com IA (OpenAI Images, a mesma chave da transcrição).
//   modelos {}                                  → quais modelos de imagem a chave enxerga
//   editar { foto_id?, fotos_ids?, prompt, formato?, qualidade? } → edita/recria a partir das fotos (mantém o rosto)
//   gerar  { prompt, formato?, qualidade? }     → gera do zero (fundos, objetos, cenas sem pessoa)
// Toda imagem gerada vira uma foto da biblioteca (cria_fotos, origem "ia").
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

const BUCKET = "video-edicao";
const TAMANHO: Record<string, string> = {
  "4:5": "1024x1536",
  "9:16": "1024x1536",
  "1:1": "1024x1024",
  "16:9": "1536x1024",
};

async function modeloImagem(key: string) {
  const fixo = Deno.env.get("CRIA_MODELO_IMAGEM");
  if (fixo) return fixo;
  try {
    const j = await (
      await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      })
    ).json();
    const ids: string[] = (j.data ?? [])
      .map((m: any) => m.id)
      .filter((id: string) => /^gpt-image/.test(id));
    // Versões estáveis primeiro (gpt-image-2 > 1.5 > 1); variantes experimentais/datadas e "mini" só em último caso.
    for (const pref of ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"])
      if (ids.includes(pref)) return pref;
    return (
      ids
        .filter((i) => !/mini/.test(i))
        .sort()
        .reverse()[0] ?? "gpt-image-1"
    );
  } catch (_) {
    return "gpt-image-1";
  }
}

async function salvar(sb: any, b64: string, info: Record<string, unknown>) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `criativos/fotos/ia-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
  const up = await sb.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (up.error) throw new Error(up.error.message);
  const { data, error } = await sb
    .from("cria_fotos")
    .insert({ path, origem: "ia", ...info })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({}));
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY não configurada" }, 500);
  try {
    if (body.acao === "modelos") {
      const j = await (
        await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        })
      ).json();
      return json({
        escolhido: await modeloImagem(key),
        imagem: (j.data ?? []).map((m: any) => m.id).filter((i: string) => /image|dall/.test(i)),
        erro: j.error?.message,
      });
    }
    const modelo = await modeloImagem(key);
    const size = TAMANHO[String(body.formato ?? "4:5")] ?? "1024x1536";
    const quality = body.qualidade === "rapida" ? "medium" : "high";
    const prompt = String(body.prompt ?? "").slice(0, 3800);
    if (!prompt) return json({ error: "prompt vazio" }, 400);

    if (body.acao === "editar") {
      const ids: string[] = body.fotos_ids ?? (body.foto_id ? [body.foto_id] : []);
      if (!ids.length) return json({ error: "escolha ao menos uma foto" }, 400);
      const { data: fotos } = await sb
        .from("cria_fotos")
        .select("id, path")
        .in("id", ids.slice(0, 6));
      const form = new FormData();
      form.append("model", modelo);
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("quality", quality);
      form.append("n", String(Math.min(4, Math.max(1, Number(body.n ?? 1)))));
      // Fidelidade alta preserva rosto e traços da pessoa (gpt-image-1+).
      form.append("input_fidelity", "high");
      for (const f of fotos ?? []) {
        const { data: blob, error } = await sb.storage.from(BUCKET).download(f.path);
        if (error || !blob) throw new Error(`não achei a foto ${f.id}`);
        const ext = f.path.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpeg";
        form.append(
          "image[]",
          new File([blob], `foto.${ext === "png" ? "png" : "jpg"}`, { type: `image/${ext}` }),
        );
      }
      const enviar = (fd: FormData) =>
        fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: fd,
        });
      let r = await enviar(form);
      let j = await r.json();
      // Modelos que já preservam o rosto por padrão recusam input_fidelity: tenta sem.
      if (!r.ok && /input_fidelity/i.test(j.error?.message ?? "")) {
        form.delete("input_fidelity");
        r = await enviar(form);
        j = await r.json();
      }
      if (!r.ok)
        return json(
          { error: `OpenAI ${r.status}: ${j.error?.message ?? ""}`.slice(0, 500), modelo },
          502,
        );
      const novas = [];
      for (const d of j.data ?? [])
        novas.push(
          await salvar(sb, d.b64_json, {
            nome: String(body.nome ?? prompt).slice(0, 80),
            descricao: prompt.slice(0, 500),
            prompt,
            base_id: ids[0],
          }),
        );
      return json({ fotos: novas, modelo });
    }

    if (body.acao === "gerar") {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: modelo,
          prompt,
          size,
          quality,
          n: Math.min(4, Math.max(1, Number(body.n ?? 1))),
        }),
      });
      const j = await r.json();
      if (!r.ok)
        return json(
          { error: `OpenAI ${r.status}: ${j.error?.message ?? ""}`.slice(0, 500), modelo },
          502,
        );
      const novas = [];
      for (const d of j.data ?? [])
        novas.push(
          await salvar(sb, d.b64_json, {
            nome: String(body.nome ?? prompt).slice(0, 80),
            descricao: prompt.slice(0, 500),
            prompt,
          }),
        );
      return json({ fotos: novas, modelo });
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
