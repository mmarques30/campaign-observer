// vedit-publicar — leva o vídeo renderizado para fora do editor.
//   acao "para_criativos": copia o MP4 para o bucket público mads-creatives e devolve a URL,
//        que entra no fluxo de anúncio que já existe (meta-add-entity, sempre PAUSED).
//   acao "instagram": publica como Reel orgânico (Graph API: container REELS → status → publish).
//        Aceita trial=true para publicar como Trial Reel (só para não seguidores).
//   acao "status_instagram": consulta um container que ainda estava processando.
// O token Meta vem do mesmo cofre usado pelas outras funções (rpc get_secret META_ADS_TOKEN).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const V = "v20.0";
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

async function tokenMeta(sb: any): Promise<string> {
  const { data } = await sb.rpc("get_secret", { secret_name: "META_ADS_TOKEN" });
  const t = typeof data === "string" ? data : data?.secret;
  return String(t || Deno.env.get("META_ACCESS_TOKEN") || "").replace(/^"|"$/g, "");
}

async function graph(
  method: string,
  path: string,
  token: string,
  params: Record<string, string> = {},
) {
  const url = new URL(`https://graph.facebook.com/${V}/${path}`);
  const init: RequestInit = { method };
  if (method === "GET") {
    for (const [k, v] of Object.entries({ ...params, access_token: token }))
      url.searchParams.set(k, v);
  } else {
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    init.body = new URLSearchParams({ ...params, access_token: token }).toString();
  }
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`Meta ${path}: ${j.error?.message ?? r.status}`);
  return j;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const b = await req.json().catch(() => ({}));
  const { projeto_id, acao } = b;
  const { data: proj } = await sb.from("vedit_projetos").select("*").eq("id", projeto_id).single();
  if (!proj) return json({ error: "projeto não encontrado" }, 404);

  try {
    if (acao === "status_instagram") {
      const token = await tokenMeta(sb);
      const st = await graph("GET", b.container_id, token, { fields: "status_code,status" });
      if (st.status_code === "FINISHED") {
        const pub = await graph("POST", `${b.ig_user_id}/media_publish`, token, {
          creation_id: b.container_id,
        });
        await sb
          .from("vedit_projetos")
          .update({
            ig_media_id: pub.id,
            publicado_em: new Date().toISOString(),
            status: "publicado",
          })
          .eq("id", projeto_id);
        return json({ ok: true, publicado: true, ig_media_id: pub.id });
      }
      return json({ ok: true, publicado: false, status: st.status_code, detalhe: st.status });
    }

    if (!proj.render_path) return json({ error: "renderize o vídeo antes de publicar" }, 400);

    if (acao === "para_criativos") {
      const { data: blob, error } = await sb.storage
        .from("video-edicao")
        .download(proj.render_path);
      if (error || !blob) throw new Error(`render não encontrado: ${error?.message}`);
      const destino = `edicao/${projeto_id}-v${proj.versao}.mp4`;
      const up = await sb.storage
        .from("mads-creatives")
        .upload(destino, blob, { contentType: "video/mp4", upsert: true });
      if (up.error) throw new Error(up.error.message);
      const { data } = sb.storage.from("mads-creatives").getPublicUrl(destino);
      return json({ ok: true, url: data.publicUrl });
    }

    if (acao === "instagram") {
      const token = await tokenMeta(sb);
      let igUser = b.ig_user_id || Deno.env.get("IG_USER_ID");
      if (!igUser) {
        const { data: c } = await sb
          .from("mads_creatives")
          .select("meta_instagram_actor_id")
          .not("meta_instagram_actor_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        igUser = c?.meta_instagram_actor_id;
      }
      if (!igUser) throw new Error("conta do Instagram não configurada (IG_USER_ID)");
      const { data: assinada } = await sb.storage
        .from("video-edicao")
        .createSignedUrl(proj.render_path, 60 * 60 * 3);
      const params: Record<string, string> = {
        media_type: "REELS",
        video_url: assinada!.signedUrl,
        caption: String(b.legenda ?? ""),
        share_to_feed: b.trial ? "false" : "true",
      };
      if (b.trial) params.trial_params = JSON.stringify({ graduation_strategy: "SS_PERFORMANCE" });
      const cont = await graph("POST", `${igUser}/media`, token, params);
      // Processamento costuma levar 20–90s. Espera até ~100s; depois o front consulta com status_instagram.
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const st = await graph("GET", cont.id, token, { fields: "status_code" });
        if (st.status_code === "ERROR")
          throw new Error("o Instagram recusou o vídeo (formato/duração)");
        if (st.status_code === "FINISHED") {
          const pub = await graph("POST", `${igUser}/media_publish`, token, {
            creation_id: cont.id,
          });
          await sb
            .from("vedit_projetos")
            .update({
              ig_media_id: pub.id,
              publicado_em: new Date().toISOString(),
              status: "publicado",
            })
            .eq("id", projeto_id);
          return json({ ok: true, publicado: true, ig_media_id: pub.id });
        }
      }
      return json({ ok: true, publicado: false, container_id: cont.id, ig_user_id: igUser });
    }

    return json({ error: "acao inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
