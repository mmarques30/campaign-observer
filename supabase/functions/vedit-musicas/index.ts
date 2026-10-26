// vedit-musicas — busca músicas liberadas para uso comercial (ccMixter + Openverse: Jamendo, Freesound…)
// e baixa a escolhida para a biblioteca de trilhas (trilhas/<id>.mp3). O volume é nivelado no navegador.
//   buscar { consulta, licenca: "livre" | "credito" } → lista para ouvir
//   salvar { url, id }                                → baixa para o bucket e devolve o caminho
//   GET ?ouvir=<url ccMixter>                          → prévia de áudio (o ccMixter bloqueia link direto)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
const UA = "IAplicada-editor/1.0 (contato@iaplicada.com.br)";
// O ccMixter só entrega o arquivo para quem vem de uma página dele (bloqueia link direto).
const NAVEGADOR =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
function baixarAudio(url: string, timeout: number, range?: string | null) {
  const cc = /(^|\.)ccmixter\.org$/i.test(new URL(url).hostname);
  return fetch(url, {
    headers: cc
      ? {
          "User-Agent": NAVEGADOR,
          Referer: "https://ccmixter.org/",
          ...(range ? { Range: range } : {}),
        }
      : { "User-Agent": UA, ...(range ? { Range: range } : {}) },
    signal: AbortSignal.timeout(timeout),
  });
}

type Musica = {
  id: string;
  titulo: string;
  autor: string;
  url: string;
  duracao: number | null;
  licenca: string;
  exigeCredito: boolean;
  fonte: string;
  pagina: string | null;
  tags: string[];
};

// Openverse (Jamendo, Freesound, ccMixter…): anônimo aceita no máximo 20 por página.
async function openverse(consulta: string, licenca: string, diag: string[]): Promise<Musica[]> {
  const lic = licenca === "livre" ? "cc0,pdm" : "cc0,pdm,by";
  const pedir = async (params: string) => {
    try {
      const r = await fetch(
        `https://api.openverse.org/v1/audio/?${params}&page_size=20&mature=false`,
        {
          headers: { "User-Agent": UA, Accept: "application/json" },
          signal: AbortSignal.timeout(6000),
        },
      );
      diag.push(`openverse ${r.status}`);
      return r.ok ? ((await r.json()).results ?? []) : [];
    } catch (e) {
      diag.push(`openverse ${e instanceof Error ? e.name : "erro"}`);
      return [];
    }
  };
  let res = await pedir(`q=${encodeURIComponent(consulta)}&license=${lic}&category=music`);
  if (res.length < 12 && !diag.includes("openverse TimeoutError"))
    res = [...res, ...(await pedir(`q=${encodeURIComponent(`${consulta} music`)}&license=${lic}`))];
  return res
    .filter((a: any) => a?.source !== "wikimedia_audio")
    .map((a: any) => ({
      id: `ov-${a.id}`,
      titulo: a.title ?? "Sem título",
      autor: a.creator ?? "autor",
      url: a.url,
      duracao: a.duration ? Math.round(a.duration / 1000) : null,
      licenca: `${String(a.license ?? "").toUpperCase()} ${a.license_version ?? ""}`.trim(),
      exigeCredito: !["cc0", "pdm"].includes(String(a.license ?? "").toLowerCase()),
      fonte: a.source ?? a.provider ?? "openverse",
      pagina: a.foreign_landing_url ?? null,
      tags: (a.tags ?? []).map((t: any) => t.name).slice(0, 6),
    }));
}

// ccMixter (API aberta, sem chave): só CC BY e CC0 (uso comercial permitido).
async function ccmixter(consulta: string, licenca: string, diag: string[]): Promise<Musica[]> {
  // Tags do ccMixter (busca "qualquer uma"): sinônimos para os estilos que lá têm outro nome.
  const SINONIMOS: Record<string, string[]> = {
    corporate: ["corporate", "inspirational", "positive", "uplifting"],
    motivational: ["motivational", "inspirational", "uplifting", "positive"],
    cinematic: ["cinematic", "music_for_film", "soundtrack", "orchestral", "epic"],
    upbeat: ["upbeat", "happy", "funky", "positive"],
    lofi: ["lofi", "lo_fi", "chill", "downtempo"],
    suspense: ["suspense", "dark", "tense", "ambient"],
    "hip hop": ["hip_hop", "hiphop", "beat"],
    "hip hop beat": ["hip_hop", "hiphop", "beat"],
    "acoustic guitar": ["acoustic", "guitar"],
  };
  const base = consulta.toLowerCase().trim();
  const lista =
    SINONIMOS[base] ??
    base
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t && t !== "music");
  const tags = lista.join("+");
  const lics = licenca === "livre" ? ["zero"] : ["by", "zero"];
  const out: Musica[] = [];
  for (const lic of lics) {
    try {
      const r = await fetch(
        `https://ccmixter.org/api/query?f=json&tags=${tags}&type=any&lic=${lic}&sort=rank&limit=20`,
        { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) },
      );
      diag.push(`ccmixter-${lic} ${r.status}`);
      if (!r.ok) continue;
      const arr = await r.json();
      for (const a of Array.isArray(arr) ? arr : []) {
        const f = (a.files ?? []).find((x: any) =>
          /mp3|mpeg/i.test(`${x?.file_format_info?.["mime_type"] ?? ""} ${x?.file_name ?? ""}`),
        );
        if (!f?.download_url) continue;
        const ps = String(f.file_format_info?.ps ?? "");
        const [m, sg] = ps.split(":").map(Number);
        out.push({
          id: `cc-${a.upload_id}`,
          titulo: a.upload_name ?? "Sem título",
          autor: a.user_real_name || a.user_name || "autor",
          url: f.download_url,
          duracao: Number.isFinite(m) && Number.isFinite(sg) ? m * 60 + sg : null,
          licenca: lic === "zero" ? "CC0" : String(a.license_name ?? "CC BY"),
          exigeCredito: lic !== "zero",
          fonte: "ccmixter",
          pagina: a.file_page_url ?? null,
          tags: String(a.upload_tags ?? "")
            .split(",")
            .filter(Boolean)
            .slice(0, 6),
        });
      }
    } catch (e) {
      diag.push(`ccmixter-${lic} ${e instanceof Error ? e.name : "erro"}`);
    }
  }
  return out;
}

async function buscar(consulta: string, licenca: string) {
  const diag: string[] = [];
  // ccMixter primeiro (responde sempre); o Openverse anda instável e entra quando responde.
  const [b, a] = await Promise.all([
    ccmixter(consulta, licenca, diag),
    openverse(consulta, licenca, diag),
  ]);
  const vistos = new Set<string>();
  const musicas = [...b, ...a]
    .filter((m) => m.url && !vistos.has(m.url) && vistos.add(m.url))
    .filter((m) => !m.duracao || (m.duracao >= 20 && m.duracao <= 420));
  return { musicas, diag };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Prévia para ouvir na tela: GET ?ouvir=<url do ccMixter> repassa o áudio (só ccMixter).
  if (req.method === "GET") {
    const alvo = new URL(req.url).searchParams.get("ouvir") ?? "";
    let host = "";
    try {
      host = new URL(alvo).hostname;
    } catch (_) {
      /* url inválida */
    }
    if (!/(^|\.)ccmixter\.org$/i.test(host)) return json({ error: "url não permitida" }, 400);
    const r = await baixarAudio(alvo, 60000, req.headers.get("range"));
    const h = new Headers(CORS);
    for (const k of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const v = r.headers.get(k);
      if (v) h.set(k, v);
    }
    h.set("Access-Control-Expose-Headers", "content-length, content-range, accept-ranges");
    h.set("Cache-Control", "public, max-age=3600");
    return new Response(r.body, { status: r.status, headers: h });
  }
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === "buscar")
      return json(
        await buscar(String(body.consulta ?? "corporate"), String(body.licenca ?? "credito")),
      );
    if (body.acao === "salvar") {
      const r = await baixarAudio(String(body.url), 90000);
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
