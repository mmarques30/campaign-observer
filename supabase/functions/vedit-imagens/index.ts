// vedit-imagens — imagens sugeridas por tema para o vídeo.
//   sugerir { projeto_id }          → Claude lê a fala (só o que ficou nos cortes) e escolhe os momentos que
//                                     pedem imagem; para cada um busca candidatas (Pexels → Unsplash → Openverse)
//   buscar  { consulta, tipo? }     → busca livre
//   salvar  { projeto_id, url, nome, credito, consulta, tipo } → baixa a escolhida e registra como mídia do projeto
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODELO = Deno.env.get("VEDIT_MODELO") || "claude-opus-5";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

type Candidata = {
  url: string; // arquivo para usar (≤ 1920 px)
  thumb: string;
  credito: string;
  fonte: "pexels" | "unsplash" | "openverse";
  tipo: "imagem" | "video";
  largura?: number;
  altura?: number;
  duracao?: number;
};

async function buscar(consulta: string, tipo: "imagem" | "video" = "imagem", n = 6): Promise<Candidata[]> {
  const pexels = Deno.env.get("PEXELS_API_KEY");
  const unsplash = Deno.env.get("UNSPLASH_ACCESS_KEY");
  const out: Candidata[] = [];
  const q = encodeURIComponent(consulta);
  try {
    if (pexels && tipo === "video") {
      const j = await (
        await fetch(`https://api.pexels.com/videos/search?query=${q}&per_page=${n}&orientation=portrait&size=medium`, {
          headers: { Authorization: pexels },
        })
      ).json();
      for (const v of j.videos ?? []) {
        const arq = (v.video_files ?? [])
          .filter((f: any) => f.file_type === "video/mp4" && Math.max(f.width, f.height) <= 1920)
          .sort((a: any, b: any) => b.height - a.height)[0];
        if (arq)
          out.push({
            url: arq.link,
            thumb: v.image,
            credito: `Vídeo de ${v.user?.name ?? "Pexels"} no Pexels`,
            fonte: "pexels",
            tipo: "video",
            largura: arq.width,
            altura: arq.height,
            duracao: v.duration,
          });
      }
    }
    if (pexels && tipo === "imagem") {
      const j = await (
        await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=${n}`, { headers: { Authorization: pexels } })
      ).json();
      for (const ph of j.photos ?? [])
        out.push({
          url: ph.src?.large2x ?? ph.src?.large,
          thumb: ph.src?.medium,
          credito: `Foto de ${ph.photographer} no Pexels`,
          fonte: "pexels",
          tipo: "imagem",
          largura: ph.width,
          altura: ph.height,
        });
    }
    if (unsplash && tipo === "imagem" && out.length < n) {
      const j = await (
        await fetch(`https://api.unsplash.com/search/photos?query=${q}&per_page=${n - out.length}`, {
          headers: { Authorization: `Client-ID ${unsplash}` },
        })
      ).json();
      for (const ph of j.results ?? [])
        out.push({
          url: `${ph.urls?.raw}&w=1600&q=85&fm=jpg`,
          thumb: ph.urls?.small,
          credito: `Foto de ${ph.user?.name} no Unsplash`,
          fonte: "unsplash",
          tipo: "imagem",
          largura: ph.width,
          altura: ph.height,
        });
    }
    // Sem chave (ou poucos resultados): Openverse, só licenças que permitem uso comercial.
    if (tipo === "imagem" && out.length < n) {
      const j = await (
        await fetch(
          `https://api.openverse.org/v1/images/?q=${q}&license_type=commercial,modification&page_size=${n - out.length}&mature=false`,
          { headers: { "User-Agent": "IAplicada-editor/1.0" } },
        )
      ).json();
      for (const im of j.results ?? [])
        out.push({
          url: im.url,
          thumb: im.thumbnail ?? im.url,
          credito: `${im.title ?? "Imagem"} — ${im.creator ?? "autor"} (${String(im.license ?? "").toUpperCase()} ${im.license_version ?? ""}, ${im.source})`,
          fonte: "openverse",
          tipo: "imagem",
          largura: im.width,
          altura: im.height,
        });
    }
  } catch (_) {
    /* devolve o que conseguiu */
  }
  return out.slice(0, n);
}

const FERRAMENTA = {
  name: "momentos",
  description: "Momentos do vídeo que ficam melhores com uma imagem ou vídeo de apoio.",
  input_schema: {
    type: "object",
    properties: {
      itens: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            de: { type: "number", description: "Segundo do ORIGINAL onde a imagem entra (início da frase)." },
            ate: { type: "number", description: "Segundo do ORIGINAL onde sai (2–5 s depois)." },
            frase: { type: "string", description: "O trecho falado (curto)." },
            tema: { type: "string", description: "Em português: o que a imagem mostra." },
            consulta: { type: "string", description: "Busca EM INGLÊS, concreta e visual, 2–5 palavras." },
            tipo: { type: "string", enum: ["imagem", "video"] },
            modo: {
              type: "string",
              enum: ["janela", "tela-cheia", "dividir", "fundo", "reagir", "celular"],
              description:
                "Como entrar: janela (b-roll em janela), tela-cheia (corte para a imagem), dividir (metade de cima), fundo (você na frente da imagem), reagir (imagem em tela cheia e você no cantinho), celular (dentro de um celular).",
            },
            motivo: { type: "string" },
          },
          required: ["de", "ate", "frase", "tema", "consulta", "tipo", "modo"],
        },
      },
    },
    required: ["itens"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === "buscar") return json({ candidatas: await buscar(String(body.consulta ?? ""), body.tipo ?? "imagem", 12) });

    if (body.acao === "salvar") {
      const { projeto_id, url, nome, credito, consulta, tipo } = body;
      const r = await fetch(url);
      if (!r.ok) return json({ error: `download ${r.status}` }, 502);
      const blob = await r.blob();
      const ext = tipo === "video" ? "mp4" : (blob.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      const path = `${projeto_id}/midias/${Date.now()}-${String(nome ?? "imagem").replace(/[^\w.-]+/g, "_").slice(0, 40)}.${ext}`;
      const up = await sb.storage
        .from("video-edicao")
        .upload(path, blob, { contentType: blob.type || (tipo === "video" ? "video/mp4" : "image/jpeg"), upsert: true });
      if (up.error) return json({ error: up.error.message }, 500);
      const { data, error } = await sb
        .from("vedit_midias")
        .insert({
          projeto_id,
          tipo: tipo === "video" ? "video" : "imagem",
          nome: `${nome ?? "imagem"}.${ext}`,
          path,
          descricao: `${consulta ?? ""} — ${credito ?? ""}`.slice(0, 500),
        })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ id: data.id, path });
    }

    if (body.acao === "sugerir") {
      const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
      if (!key) return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);
      const { data: proj } = await sb
        .from("vedit_projetos")
        .select("id, palavras, timeline, objetivo, estilo")
        .eq("id", body.projeto_id)
        .single();
      if (!proj) return json({ error: "projeto não encontrado" }, 404);
      const cortes = (proj.timeline?.cortes ?? []) as { de: number; ate: number }[];
      const dentro = (t: number) => !cortes.length || cortes.some((c) => t >= c.de && t <= c.ate);
      const fala = ((proj.palavras ?? []) as { p: string; i: number; f: number }[])
        .filter((w) => dentro(w.i))
        .map((w) => `[${w.i.toFixed(1)}] ${w.p}`)
        .join(" ");
      const ja = (proj.timeline?.efeitos ?? []).map((e: any) => `${e.tipo} ${e.de}-${e.ate}`).join(", ");
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: MODELO,
          max_tokens: 3000,
          system: `Você é editor de Reels da IAplicada. Escolha de 4 a 8 momentos da fala em que uma imagem ou vídeo de apoio deixa o vídeo melhor (ilustra o que é dito: WhatsApp, planilha, equipe, nota fiscal, dinheiro, cliente irritado, escritório…). Espalhe ao longo do vídeo, nunca nos 2 primeiros segundos (gancho) nem por cima do CTA final. Não sobreponha efeitos já aplicados: ${ja || "(nenhum)"}. Objetivo: ${proj.objetivo}; estilo: ${proj.estilo ?? "viral"}. Consultas em inglês, concretas, que um banco de imagens entende (ex.: "spreadsheet on laptop", "angry customer phone", "office team meeting").`,
          tools: [FERRAMENTA],
          tool_choice: { type: "tool", name: "momentos" },
          messages: [{ role: "user", content: `FALA (segundos do original):\n${fala.slice(0, 12000)}` }],
        }),
      });
      const txt = await r.text();
      if (!r.ok) return json({ error: `Claude ${r.status}: ${txt.slice(0, 300)}` }, 502);
      const itens = JSON.parse(txt).content?.find((c: any) => c.type === "tool_use")?.input?.itens ?? [];
      const momentos = await Promise.all(
        itens.map(async (m: any) => ({ ...m, candidatas: await buscar(m.consulta, m.tipo, 6) })),
      );
      return json({ momentos, temChave: !!(Deno.env.get("PEXELS_API_KEY") || Deno.env.get("UNSPLASH_ACCESS_KEY")) });
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
