// transcrever-voz — transforma um áudio curto gravado no navegador (mensagem de voz do chat) em texto.
//   { audio: base64, tipo: "audio/webm" | "audio/mp4" | ... } → { texto }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "OPENAI_API_KEY não configurada" }, 500);
    const { audio, tipo } = await req.json();
    if (!audio) return json({ error: "áudio vazio" }, 400);
    const bytes = Uint8Array.from(atob(String(audio)), (c) => c.charCodeAt(0));
    if (bytes.length > 24 * 1024 * 1024)
      return json({ error: "áudio longo demais (máx. ~10 min)" }, 400);
    const mime = String(tipo || "audio/webm").split(";")[0];
    const ext =
      mime.includes("mp4") || mime.includes("m4a")
        ? "m4a"
        : mime.includes("ogg")
          ? "ogg"
          : mime.includes("wav")
            ? "wav"
            : "webm";
    const form = new FormData();
    form.append("file", new File([bytes], `voz.${ext}`, { type: mime }));
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append(
      "prompt",
      "Pedido de edição de vídeo e carrossel para Instagram: legenda, slide, capa, corte, efeito, Reels, IAplicada.",
    );
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const j = await r.json();
    if (!r.ok)
      return json({ error: `OpenAI ${r.status}: ${j.error?.message ?? ""}`.slice(0, 300) }, 502);
    return json({ texto: String(j.text ?? "").trim() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
