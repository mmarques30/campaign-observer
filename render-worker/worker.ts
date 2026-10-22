// Worker de render: pega o próximo item de vedit_renders, renderiza com Remotion e sobe o MP4.
// Roda em qualquer container com Node 22 (Railway, Fly, Render, uma VPS). Variáveis:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (obrigatórias)
//   WORKER_NOME (opcional), CONCORRENCIA (threads do Chrome, padrão = metade dos núcleos)
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const execFileP = promisify(execFile);
/** ffmpeg que vem com o Remotion (sem instalar nada no container). */
function ffmpegBin() {
  const dir = path.dirname(require.resolve("@remotion/compositor-linux-x64-gnu/package.json"));
  return path.join(dir, "ffmpeg");
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let _sb: any = null;
const sbc = () =>
  (_sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  }));
const NOME = process.env.WORKER_NOME ?? `worker-${os.hostname()}`;
const BUCKET = "video-edicao";

export type PropsFila = {
  timeline: any;
  palavras: any[];
  duracaoFonte: number;
  fontePath: string;
  midiasPaths: Record<string, string>;
};

async function assinar(p: string) {
  const { data, error } = await sbc()
    .storage.from(BUCKET)
    .createSignedUrl(p, 60 * 60 * 6);
  if (error || !data) throw new Error(`não consegui assinar ${p}: ${error?.message}`);
  return data.signedUrl;
}

export async function prepararBundle() {
  await ensureBrowser();
  return bundle({
    entryPoint: path.join(raiz, "src/video/root.tsx"),
    publicDir: path.join(raiz, "public"),
  });
}

export async function renderizar(
  serveUrl: string,
  inputProps: Record<string, unknown>,
  saida: string,
  onProgresso?: (p: number) => void,
) {
  const comp = await selectComposition({ serveUrl, id: "Reel", inputProps });
  await renderMedia({
    serveUrl,
    composition: comp,
    inputProps,
    codec: "h264",
    crf: 18,
    audioBitrate: "192k",
    pixelFormat: "yuv420p",
    concurrency: Number(process.env.CONCORRENCIA) || Math.max(1, Math.floor(os.cpus().length / 2)),
    outputLocation: saida,
    timeoutInMilliseconds: 120_000,
    onProgress: ({ progress }) => onProgresso?.(progress),
  });
  return comp;
}

async function loop(serveUrl: string) {
  for (;;) {
    const { data, error } = await sbc().rpc("vedit_pegar_render", { p_worker: NOME });
    const job = Array.isArray(data) ? data[0] : null;
    if (error) console.error("[fila]", error.message);
    if (!job) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    console.log(`[render] ${job.id} projeto ${job.projeto_id}`);
    const saida = path.join(os.tmpdir(), `${job.id}.mp4`);
    try {
      const p = job.props as PropsFila;
      const midias: Record<string, string> = {};
      for (const [id, caminho] of Object.entries(p.midiasPaths ?? {}))
        midias[id] = await assinar(caminho);
      const inputProps = {
        timeline: p.timeline,
        palavras: p.palavras,
        duracaoFonte: p.duracaoFonte,
        fonteUrl: await assinar(p.fontePath),
        midias,
      };
      let ultimo = 0;
      await renderizar(serveUrl, inputProps, saida, (prog) => {
        if (prog - ultimo >= 0.05) {
          ultimo = prog;
          void sbc()
            .from("vedit_renders")
            .update({ progresso: Math.round(prog * 100) })
            .eq("id", job.id);
        }
      });
      const destino = `${job.projeto_id}/render-v${job.versao ?? 0}-${Date.now()}.mp4`;
      const up = await sbc()
        .storage.from(BUCKET)
        .upload(destino, await fs.readFile(saida), { contentType: "video/mp4", upsert: true });
      if (up.error) throw new Error(up.error.message);
      await sbc()
        .from("vedit_renders")
        .update({
          status: "pronto",
          progresso: 100,
          output_path: destino,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", job.id);
      await sbc()
        .from("vedit_projetos")
        .update({ render_path: destino, status: "renderizado" })
        .eq("id", job.projeto_id);
      console.log(`[render] ok → ${destino}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[render] erro", msg);
      await sbc()
        .from("vedit_renders")
        .update({
          status: "erro",
          erro: msg.slice(0, 2000),
          concluido_em: new Date().toISOString(),
        })
        .eq("id", job.id);
      await sbc()
        .from("vedit_projetos")
        .update({ status: "erro", erro: `Render: ${msg.slice(0, 300)}` })
        .eq("id", job.projeto_id);
    } finally {
      await fs.rm(saida, { force: true });
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const serveUrl = await prepararBundle();
  console.log(`[worker] ${NOME} pronto, bundle em ${serveUrl}`);
  await loop(serveUrl);
}
