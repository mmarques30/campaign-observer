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
  recortePath?: string | null;
  vozPaths?: Record<string, string> | null;
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
    // O container enxerga a CPU e a memória da máquina inteira (não o limite do Railway):
    // padrões conservadores evitam o "Compositor exited with signal SIGKILL" (falta de memória).
    concurrency: Number(process.env.CONCORRENCIA) || 2,
    offthreadVideoCacheSizeInBytes: (Number(process.env.CACHE_VIDEO_MB) || 256) * 1024 * 1024,
    offthreadVideoThreads: 2,
    mediaCacheSizeInBytes: 256 * 1024 * 1024,
    outputLocation: saida,
    timeoutInMilliseconds: 120_000,
    onProgress: ({ progress }) => onProgresso?.(progress),
  });
  return comp;
}

/** Baixa um arquivo do bucket para o disco (stream, sem carregar tudo em memória). */
async function baixar(caminho: string, destino: string) {
  const url = await assinar(caminho);
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`download falhou (${r.status}) ${caminho}`);
  const { Readable } = await import("node:stream");
  const { pipeline } = await import("node:stream/promises");
  const { createWriteStream } = await import("node:fs");
  await pipeline(Readable.fromWeb(r.body as any), createWriteStream(destino));
}

/**
 * Proxy 720p leve (~2 Mbps) para o preview no navegador: arquivos pesados ou acima de 1080p
 * engasgam no <video> do Chrome (imagem trava, som some). O render final usa o original.
 */
export async function gerarProxy(projetoId: string) {
  const { data: proj, error } = await sbc()
    .from("vedit_projetos")
    .select("id, fonte_path, fonte_largura, fonte_altura")
    .eq("id", projetoId)
    .single();
  if (error || !proj?.fonte_path) throw new Error("projeto sem vídeo");
  const entrada = path.join(
    os.tmpdir(),
    `${projetoId}-fonte${path.extname(proj.fonte_path) || ".mp4"}`,
  );
  const saida = path.join(os.tmpdir(), `${projetoId}-1080p.mp4`);
  try {
    await baixar(proj.fonte_path, entrada);
    const vertical = Number(proj.fonte_altura) >= Number(proj.fonte_largura);
    await execFileP(ffmpegBin(), [
      "-y",
      "-i",
      entrada,
      "-vf",
      vertical ? "scale=720:-2" : "scale=-2:720",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "26",
      "-maxrate",
      "2500k",
      "-bufsize",
      "5000k",
      "-g",
      "30",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      saida,
    ]);
    const destino = `${projetoId}/fonte-720p.mp4`;
    const up = await sbc()
      .storage.from(BUCKET)
      .upload(destino, await fs.readFile(saida), { contentType: "video/mp4", upsert: true });
    if (up.error) throw new Error(up.error.message);
    await sbc().from("vedit_projetos").update({ fonte_proxy_path: destino }).eq("id", projetoId);
    return destino;
  } finally {
    await fs.rm(entrada, { force: true });
    await fs.rm(saida, { force: true });
  }
}

/**
 * Voz limpa: o ffmpeg do Remotion não tem filtros de áudio, então usa o ffmpeg do sistema
 * (instalado no Dockerfile). RNNoise (rede neural de fala) + redução espectral + EQ de voz +
 * compressor + loudnorm (-15 LUFS). Gera as 3 intensidades de uma vez: trocar é instantâneo.
 * Atraso dos filtros (arnndn 10 ms, afftdn 25 ms) é descontado para o som bater com a boca.
 */
const MODELO_VOZ = path.join(raiz, "render-worker/modelos/voz-rnnoise.rnnn");
export function cadeiaVoz(nivel: "leve" | "media" | "forte", modelo = MODELO_VOZ) {
  const m = modelo.replace(/\\/g, "/").replace(/:/g, "\\:");
  const atraso = (s: number) => `atrim=start=${s},asetpts=PTS-STARTPTS,apad=pad_dur=${s}`;
  const eq = "equalizer=f=220:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1:g=2.5,treble=g=1.5:f=8000";
  const comp = "acompressor=threshold=0.1:ratio=3:attack=8:release=120:makeup=1.5";
  const norm = "loudnorm=I=-15:TP=-1.5:LRA=9,aresample=48000";
  if (nivel === "leve")
    return `aresample=48000,highpass=f=70,arnndn=m=${m}:mix=0.85,${atraso(0.01)},${eq},${comp},${norm}`;
  if (nivel === "media")
    return `aresample=48000,highpass=f=80,arnndn=m=${m},afftdn=nr=8:nf=-45:tn=1,${atraso(0.035)},${eq},deesser=i=0.4,${comp},${norm}`;
  return `aresample=48000,highpass=f=90,arnndn=m=${m},afftdn=nr=14:nf=-40:tn=1,${atraso(0.035)},agate=threshold=0.015:ratio=3:range=0.1:attack=5:release=120,${eq},deesser=i=0.4,${comp},${norm}`;
}
export const NIVEIS_VOZ = ["leve", "media", "forte"] as const;

export async function gerarVoz(projetoId: string) {
  const { data: proj, error } = await sbc()
    .from("vedit_projetos")
    .select("id, fonte_path")
    .eq("id", projetoId)
    .single();
  if (error || !proj?.fonte_path) throw new Error("projeto sem vídeo");
  const entrada = path.join(
    os.tmpdir(),
    `${projetoId}-voz${path.extname(proj.fonte_path) || ".mp4"}`,
  );
  const saidas: string[] = [];
  try {
    await baixar(proj.fonte_path, entrada);
    for (const nivel of NIVEIS_VOZ) {
      const saida = path.join(os.tmpdir(), `${projetoId}-voz-${nivel}.m4a`);
      saidas.push(saida);
      await execFileP(
        process.env.FFMPEG_SISTEMA ?? "ffmpeg",
        [
          "-y",
          "-loglevel",
          "error",
          "-i",
          entrada,
          "-vn",
          "-af",
          cadeiaVoz(nivel),
          "-ac",
          "1",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          saida,
        ],
        { maxBuffer: 1 << 24 },
      );
      const up = await sbc()
        .storage.from(BUCKET)
        .upload(`${projetoId}/voz-${nivel}.m4a`, await fs.readFile(saida), {
          contentType: "audio/mp4",
          upsert: true,
        });
      if (up.error) throw new Error(up.error.message);
    }
  } finally {
    await fs.rm(entrada, { force: true });
    for (const s of saidas) await fs.rm(s, { force: true });
  }
}

/** Fila leve (vedit_jobs): proxy e afins. Tem prioridade sobre o render. Devolve true se rodou algo. */
async function rodarJobs(): Promise<boolean> {
  const { data, error } = await sbc().rpc("vedit_pegar_job", { p_worker: NOME });
  if (error) {
    console.error("[jobs]", error.message);
    return false;
  }
  const job = Array.isArray(data) ? data[0] : null;
  if (!job) return false;
  console.log(`[job] ${job.tipo} ${job.id} projeto ${job.projeto_id}`);
  try {
    if (job.tipo === "proxy") await gerarProxy(job.projeto_id);
    else if (job.tipo === "voz") await gerarVoz(job.projeto_id);
    else throw new Error(`tipo desconhecido: ${job.tipo}`);
    await sbc()
      .from("vedit_jobs")
      .update({ status: "pronto", concluido_em: new Date().toISOString() })
      .eq("id", job.id);
    console.log(`[job] ok ${job.id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[job] erro", msg);
    await sbc()
      .from("vedit_jobs")
      .update({ status: "erro", erro: msg.slice(0, 2000), concluido_em: new Date().toISOString() })
      .eq("id", job.id);
  }
  return true;
}

async function loop(serveUrl: string) {
  for (;;) {
    if (await rodarJobs()) continue;
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
        recorteUrl: p.recortePath ? await assinar(p.recortePath) : undefined,
        vozUrls: p.vozPaths
          ? Object.fromEntries(
              await Promise.all(
                Object.entries(p.vozPaths).map(async ([k, v]) => [k, await assinar(v)]),
              ),
            )
          : undefined,
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
  // Um deploy novo mata o container no meio do trabalho: o que ficou "rodando" com este nome volta pra fila.
  for (const [t, rodando] of [
    ["vedit_jobs", "rodando"],
    ["vedit_renders", "renderizando"],
  ] as const) {
    const { data } = await sbc()
      .from(t)
      .update({ status: "fila", worker: null, iniciado_em: null })
      .eq("status", rodando)
      .eq("worker", NOME)
      .select("id");
    if (data?.length) console.log(`[worker] ${data.length} item(ns) de ${t} devolvido(s) à fila`);
  }
  console.log(`[worker] ${NOME} pronto, bundle em ${serveUrl}`);
  await loop(serveUrl);
}
