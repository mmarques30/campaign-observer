// vedit-musicas — busca músicas liberadas para uso comercial (Openverse: Jamendo, ccMixter, Freesound…)
// e baixa a escolhida para a biblioteca de trilhas (trilhas/<id>.mp3). O volume é nivelado no navegador.
//   buscar { consulta, licenca: "livre" | "credito" } → lista para ouvir
//   salvar { url, id }                                → baixa para o bucket e devolve o caminho
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
const UA = "IAplicada-editor/1.0 (contato@iaplicada.com.br)";

async function buscar(consulta: string, licenca: string) {
  // "livre" = domínio público/CC0 (sem crédito); "credito" inclui CC BY (crédito na legenda do post).
  const lic = licenca === "livre" ? "cc0,pdm" : "cc0,pdm,by";
  const u = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(consulta)}&license=${lic}&category=music&page_size=30&mature=false`;
  let j: any = null;
  for (let t = 0; t < 2 && !j; t++) {
    try {
      const r = await fetch(u, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) j = await r.json();
    } catch (_) {
      /* tenta de novo */
    }
  }
  if (!j) throw new Error("O acervo de músicas não respondeu. Tente de novo em instantes.");
  return (j.results ?? [])
    .map((a: any) => ({
      id: a.id,
      titulo: a.title ?? "Sem título",
      autor: a.creator ?? "autor",
      url: a.url,
      duracao: a.duration ? Math.round(a.duration / 1000) : null,
      licenca: `${String(a.license ?? "").toUpperCase()} ${a.license_version ?? ""}`.trim(),
      exigeCredito: !["cc0", "pdm"].includes(String(a.license ?? "").toLowerCase()),
      fonte: a.source ?? a.provider,
      pagina: a.foreign_landing_url ?? null,
      generos: a.genres ?? [],
      tags: (a.tags ?? []).map((t: any) => t.name).slice(0, 8),
    }))
    .filter((a: any) => a.url && (!a.duracao || (a.duracao >= 30 && a.duracao <= 420)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === "buscar")
      return json({
        musicas: await buscar(
          String(body.consulta ?? "corporate"),
          String(body.licenca ?? "credito"),
        ),
      });
    if (body.acao === "salvar") {
      const r = await fetch(String(body.url), {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(90000),
      });
      if (!r.ok) return json({ error: `download ${r.status}` }, 502);
      const blob = await r.blob();
      const id = `t${Date.now().toString(36)}`;
      const path = `trilhas/${id}.mp3`;
      const up = await sb.storage
        .from("video-edicao")
        .upload(path, blob, { contentType: blob.type || "audio/mpeg", upsert: true });
      if (up.error) return json({ error: up.error.message }, 500);
      return json({ id, path });
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
