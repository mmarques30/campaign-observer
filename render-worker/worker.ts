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
import {
  renderMedia,
  selectComposition,
  ensureBrowser,
  makeCancelSignal,
} from "@remotion/renderer";
import { createRequire } from "node:module";
import { catalogoParaClaude } from "../src/video/catalogo";

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
  cancelSignal?: ReturnType<typeof makeCancelSignal>["cancelSignal"],
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
    cancelSignal,
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
/** Baixa o vídeo do link (Instagram, TikTok, YouTube…) com o yt-dlp para o disco, em H.264. */
async function baixarLocal(id: string, url: string) {
  if (!/^https?:\/\//.test(url)) throw new Error("link inválido");
  const base = path.join(os.tmpdir(), `ref-${id}`);
  try {
    await execFileP(
      process.env.YTDLP ?? "yt-dlp",
      [
        "--no-warnings",
        "--no-playlist",
        "--no-progress",
        "-f",
        "bv*[height<=1920][vcodec^=avc1]+ba/bv*[height<=1920]+ba/b[height<=1920]/b",
        "--merge-output-format",
        "mp4",
        "--write-info-json",
        "-o",
        `${base}.%(ext)s`,
        url,
      ],
      { timeout: 4 * 60 * 1000, maxBuffer: 1024 * 1024 * 20 },
    );
  } catch (e) {
    const msg = String((e as { stderr?: string }).stderr || (e as Error).message);
    if (/login|private|rate-limit|not available/i.test(msg))
      throw new Error(
        "o Instagram/TikTok bloqueou o download deste link (post privado ou exige login). Solte o arquivo do vídeo.",
      );
    throw new Error(
      `não consegui baixar o vídeo: ${msg.split("\n").filter(Boolean).pop()?.slice(0, 300)}`,
    );
  }
  let arquivo = `${base}.mp4`;
  const info = JSON.parse(await fs.readFile(`${base}.info.json`, "utf8").catch(() => "{}"));
  await fs.rm(`${base}.info.json`, { force: true });
  // Instagram costuma entregar VP9: converte para H.264 para abrir em qualquer navegador (Safari incluso).
  if (!/^(avc|h264)/i.test(String(info.vcodec ?? ""))) {
    const h264 = `${base}-h264.mp4`;
    await execFileP(
      process.env.FFMPEG_SISTEMA ?? "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        arquivo,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        h264,
      ],
      { maxBuffer: 1024 * 1024 * 20 },
    );
    await fs.rm(arquivo, { force: true });
    arquivo = h264;
  }
  return {
    arquivo,
    username: (info.channel || info.uploader_id || info.uploader || null) as string | null,
    legenda: (info.description || info.title || null) as string | null,
    curtidas: (info.like_count ?? null) as number | null,
  };
}

/** Só baixa e sobe (o navegador faz o resto). */
async function baixarPorLink(id: string, url: string) {
  const r = await baixarLocal(id, url);
  const destino = `referencias/links/${id}.mp4`;
  const up = await sbc()
    .storage.from(BUCKET)
    .upload(destino, await fs.readFile(r.arquivo), { contentType: "video/mp4", upsert: true });
  await fs.rm(r.arquivo, { force: true });
  if (up.error) throw new Error(up.error.message);
  return { path: destino, username: r.username, legenda: r.legenda, curtidas: r.curtidas };
}

const FONTE_CARIMBO =
  process.env.FONTE_CARIMBO ?? "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

async function chamarFuncao(nome: string, corpo: Record<string, unknown>) {
  const r = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${nome}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error ?? `${nome} ${r.status}`);
  return j;
}

/**
 * Referência inteira no servidor, sem depender da aba aberta: baixa pelo link, separa o áudio,
 * monta as folhas de quadros com o tempo carimbado (ffmpeg, segundos), sobe tudo, transcreve
 * e pede a análise ao Claude.
 */
async function processarReferencia(jobId: string, refId: string, url: string) {
  const patch = (p: Record<string, unknown>) =>
    sbc().from("vedit_referencias").update(p).eq("id", refId);
  const pasta = path.join(os.tmpdir(), `refp-${jobId}`);
  await fs.mkdir(pasta, { recursive: true });
  try {
    const r = await baixarLocal(jobId, url);
    const sys = process.env.FFMPEG_SISTEMA ?? "ffmpeg";
    const { stdout } = await execFileP("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration",
      "-of",
      "json",
      r.arquivo,
    ]);
    const pr = JSON.parse(stdout);
    const dur = Number(pr.format?.duration ?? 0);
    const largura = pr.streams?.[0]?.width ?? null;
    const altura = pr.streams?.[0]?.height ?? null;
    const vertical = (altura ?? 1) >= (largura ?? 0);
    const [W, H] = vertical ? [324, 576] : [576, 324];
    const passo = dur > 60 ? 2 : dur > 35 ? 1.6 : 1.2;
    const audio = path.join(pasta, "audio.wav");
    const temAudio = await execFileP(sys, [
      "-y",
      "-loglevel",
      "error",
      "-i",
      r.arquivo,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      audio,
    ])
      .then(() => true)
      .catch(() => false);
    const carimbo = `drawbox=x=0:y=0:w=64:h=22:color=black@0.65:t=fill,drawtext=fontfile=${FONTE_CARIMBO}:fontsize=15:fontcolor=white:x=4:y=4:text='%{eif\\:t\\:d}.%{eif\\:t*10-10*trunc(t)\\:d}s'`;
    await execFileP(sys, [
      "-y",
      "-loglevel",
      "error",
      "-i",
      r.arquivo,
      "-vf",
      `fps=1/${passo},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x111111,${carimbo},tile=3x4:color=0x111111`,
      "-q:v",
      "4",
      path.join(pasta, "folha-%02d.jpg"),
    ]);
    const st = sbc().storage.from(BUCKET);
    const sobe = async (local: string, destino: string, tipo: string) => {
      const u = await st.upload(destino, await fs.readFile(local), {
        contentType: tipo,
        upsert: true,
      });
      if (u.error) throw new Error(u.error.message);
      return destino;
    };
    const arquivos = (await fs.readdir(pasta)).filter((f) => f.startsWith("folha-")).sort();
    const folhas = await Promise.all(
      arquivos.map((f) => sobe(path.join(pasta, f), `referencias/${refId}/${f}`, "image/jpeg")),
    );
    const videoPath = await sobe(r.arquivo, `referencias/${refId}/video.mp4`, "video/mp4");
    const audioPath = temAudio
      ? await sobe(audio, `referencias/${refId}/audio.wav`, "audio/wav")
      : null;
    const { data: atual } = await sbc()
      .from("vedit_referencias")
      .select("autor, legenda")
      .eq("id", refId)
      .single();
    await patch({
      folhas,
      video_path: videoPath,
      audio_path: audioPath,
      duracao: dur || null,
      largura,
      altura,
      autor: atual?.autor ?? r.username,
      legenda: atual?.legenda ?? r.legenda,
      status: "transcrevendo",
    });
    await fs.rm(r.arquivo, { force: true });
    if (audioPath) await chamarFuncao("vedit-referencia", { acao: "transcrever", id: refId });
    await chamarFuncao("vedit-referencia", {
      acao: "analisar",
      id: refId,
      catalogo: catalogoParaClaude(),
    });
    // A análise roda em segundo plano na função: espera o status final (até 6 min).
    for (let i = 0; i < 72; i++) {
      await new Promise((ok) => setTimeout(ok, 5000));
      const { data: r } = await sbc()
        .from("vedit_referencias")
        .select("status, erro")
        .eq("id", refId)
        .single();
      if (r?.status === "pronta") break;
      if (r?.status === "erro") throw new Error(r.erro ?? "a análise falhou");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await patch({ status: "erro", erro: msg.slice(0, 500) });
    throw e;
  } finally {
    await fs.rm(pasta, { recursive: true, force: true });
  }
}

/**
 * Referência de criativo (post/carrossel do Instagram): o yt-dlp traz as imagens de cada slide
 * (sem baixar vídeo), sobem para criativos/referencias/ e o cria-agente analisa.
 */
async function processarCriaReferencia(jobId: string, refId: string, url: string) {
  const patch = (p: Record<string, unknown>) =>
    sbc().from("cria_referencias").update(p).eq("id", refId);
  const pasta = path.join(os.tmpdir(), `cref-${jobId}`);
  await fs.mkdir(pasta, { recursive: true });
  try {
    if (!/^https?:\/\//.test(url)) throw new Error("link inválido");
    const args = [
      "--no-warnings",
      "--no-progress",
      "--skip-download",
      "--ignore-no-formats-error",
      "--write-thumbnail",
      "--write-info-json",
      "-o",
      path.join(pasta, "s-%(autonumber)03d.%(ext)s"),
      url,
    ];
    let ultimoErro = "";
    for (let t = 0; t < 3; t++) {
      try {
        await execFileP(process.env.YTDLP ?? "yt-dlp", args, { maxBuffer: 1 << 24 });
        ultimoErro = "";
        break;
      } catch (e) {
        ultimoErro = e instanceof Error ? e.message : String(e);
        // 429 do Instagram: espera e tenta de novo.
        await new Promise((ok) => setTimeout(ok, 8000 * (t + 1)));
      }
    }
    let arquivos = (await fs.readdir(pasta))
      .filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f))
      .sort();
    if (!arquivos.length)
      throw new Error(
        ultimoErro
          ? `não consegui abrir o post (${ultimoErro.split("\n").find((l) => /ERROR/.test(l)) ?? "Instagram recusou"})`
          : "o post não tem imagens",
      );
    arquivos = arquivos.slice(0, 15);
    const sys = process.env.FFMPEG_SISTEMA ?? "ffmpeg";
    const imagens: string[] = [];
    for (let i = 0; i < arquivos.length; i++) {
      const origem = path.join(pasta, arquivos[i]);
      const jpg = path.join(pasta, `final-${i}.jpg`);
      // Normaliza para JPEG de até 1080px de largura (o Claude e o navegador abrem sem surpresa).
      await execFileP(sys, [
        "-y",
        "-loglevel",
        "error",
        "-i",
        origem,
        "-vf",
        "scale='min(1080,iw)':-2",
        "-q:v",
        "3",
        jpg,
      ]);
      const destino = `criativos/referencias/${refId}-${String(i + 1).padStart(2, "0")}.jpg`;
      const up = await sbc()
        .storage.from(BUCKET)
        .upload(destino, await fs.readFile(jpg), { contentType: "image/jpeg", upsert: true });
      if (up.error) throw new Error(up.error.message);
      imagens.push(destino);
    }
    const infos = (await fs.readdir(pasta)).filter((f) => f.endsWith(".info.json")).sort();
    let autor: string | null = null;
    let legenda: string | null = null;
    if (infos.length) {
      const info = JSON.parse(await fs.readFile(path.join(pasta, infos[0]), "utf8"));
      autor = (info.channel || info.uploader_id || info.uploader || null) as string | null;
      legenda = (info.description || info.title || null) as string | null;
    }
    const { data: atual } = await sbc()
      .from("cria_referencias")
      .select("autor, legenda")
      .eq("id", refId)
      .single();
    await patch({
      imagens,
      autor: atual?.autor ?? autor,
      legenda: atual?.legenda ?? legenda,
      status: "analisando",
      erro: null,
    });
    await chamarFuncao("cria-agente", { acao: "analisar_referencia", id: refId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await patch({ status: "erro", erro: msg.slice(0, 500) });
    await chamarFuncao("cria-agente", { acao: "liberar_pendentes", id: refId }).catch(() => {});
    throw e;
  } finally {
    await fs.rm(pasta, { recursive: true, force: true });
  }
}

/**
 * Carrossel com música: o Instagram só aceita música (em alta) pela API em Reels. Os slides viram
 * um vídeo 9:16 (cada slide inteiro no centro, com fundo desfocado dele mesmo) e a publicação
 * segue para a fila como Reel com a música escolhida.
 */
async function gerarSlideshow(jobId: string, publicacaoId: string) {
  const { data: p, error } = await sbc()
    .from("publicacoes")
    .select("*")
    .eq("id", publicacaoId)
    .single();
  if (error || !p) throw new Error("publicação não encontrada");
  const pasta = path.join(os.tmpdir(), `slides-${jobId}`);
  await fs.mkdir(pasta, { recursive: true });
  try {
    const imgs: string[] = [];
    for (let i = 0; i < (p.midias ?? []).length; i++) {
      const local = path.join(pasta, `s${String(i).padStart(2, "0")}.jpg`);
      await baixar(p.midias[i], local);
      imgs.push(local);
    }
    if (!imgs.length) throw new Error("sem slides para montar o vídeo");
    const seg = Math.min(8, Math.max(1.5, Number(p.slides_seg ?? 3)));
    const sys = process.env.FFMPEG_SISTEMA ?? "ffmpeg";
    const entradas = imgs.flatMap((f) => ["-loop", "1", "-t", String(seg), "-i", f]);
    const filtros = imgs
      .map(
        (_, i) =>
          `[${i}:v]split[a${i}][b${i}];` +
          `[a${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:2,eq=brightness=-0.12[bg${i}];` +
          `[b${i}]scale=1080:1920:force_original_aspect_ratio=decrease[fg${i}];` +
          `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p[v${i}]`,
      )
      .join(";");
    const concat = `${imgs.map((_, i) => `[v${i}]`).join("")}concat=n=${imgs.length}:v=1:a=0[v]`;
    const saida = path.join(pasta, "reel.mp4");
    const total = seg * imgs.length;
    await execFileP(
      sys,
      [
        "-y",
        "-loglevel",
        "error",
        ...entradas,
        "-f",
        "lavfi",
        "-t",
        String(total),
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-filter_complex",
        `${filtros};${concat}`,
        "-map",
        "[v]",
        "-map",
        `${imgs.length}:a`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-t",
        String(total),
        "-movflags",
        "+faststart",
        saida,
      ],
      { maxBuffer: 1 << 24 },
    );
    const destino = `criativos/publicacoes/${publicacaoId}.mp4`;
    const up = await sbc()
      .storage.from(BUCKET)
      .upload(destino, await fs.readFile(saida), { contentType: "video/mp4", upsert: true });
    if (up.error) throw new Error(up.error.message);
    await sbc()
      .from("publicacoes")
      .update({ midias: [destino], tipo: "reel", status: "agendado", erro: null })
      .eq("id", publicacaoId);
    // Já está na hora (publicar agora): publica em seguida; senão o cron publica no horário.
    if (new Date(p.agendado_para).getTime() <= Date.now() + 60_000)
      await chamarFuncao("publicar-agendados", { acao: "agora", id: publicacaoId }).catch((e) =>
        console.error("[slideshow] publicar", e),
      );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sbc()
      .from("publicacoes")
      .update({ status: "erro", erro: `montar o vídeo dos slides: ${msg}`.slice(0, 500) })
      .eq("id", publicacaoId);
    throw e;
  } finally {
    await fs.rm(pasta, { recursive: true, force: true });
  }
}

/** Tipos leves que rodam numa fila paralela, sem esperar o render terminar. */
const JOBS_RAPIDOS = ["baixar", "referencia", "cria_referencia", "slideshow"];

async function rodarJobs(tipos?: string[]): Promise<boolean> {
  const { data, error } = tipos
    ? await sbc().rpc("vedit_pegar_job_tipos", { p_worker: NOME, p_tipos: tipos })
    : await sbc().rpc("vedit_pegar_job", { p_worker: NOME });
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
    else if (job.tipo === "referencia")
      await processarReferencia(
        job.id,
        String(job.params?.referencia_id),
        String(job.params?.url ?? ""),
      );
    else if (job.tipo === "slideshow")
      await gerarSlideshow(job.id, String(job.params?.publicacao_id));
    else if (job.tipo === "cria_referencia")
      await processarCriaReferencia(
        job.id,
        String(job.params?.referencia_id),
        String(job.params?.url ?? ""),
      );
    else if (job.tipo === "baixar") {
      const resultado = await baixarPorLink(job.id, String(job.params?.url ?? ""));
      await sbc().from("vedit_jobs").update({ resultado }).eq("id", job.id);
    } else throw new Error(`tipo desconhecido: ${job.tipo}`);
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

async function loopRapido() {
  for (;;) {
    try {
      if (await rodarJobs(JOBS_RAPIDOS)) continue;
    } catch (e) {
      console.error("[rapido]", e);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function loop(serveUrl: string) {
  void loopRapido();
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
    let cancelado = false;
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
      // Cancelar pela tela marca o render como "cancelado"; aqui conferimos a cada 3 s e paramos o Remotion.
      const { cancelSignal, cancel } = makeCancelSignal();
      const vigia = setInterval(async () => {
        const { data: r } = await sbc()
          .from("vedit_renders")
          .select("status")
          .eq("id", job.id)
          .maybeSingle();
        if (r?.status === "cancelado") {
          cancelado = true;
          cancel();
        }
      }, 3000);
      try {
        await renderizar(
          serveUrl,
          inputProps,
          saida,
          (prog) => {
            if (prog - ultimo >= 0.05) {
              ultimo = prog;
              void sbc()
                .from("vedit_renders")
                .update({ progresso: Math.round(prog * 100) })
                .eq("id", job.id)
                .neq("status", "cancelado");
            }
          },
          cancelSignal,
        );
      } finally {
        clearInterval(vigia);
      }
      // Nitidez fica fora do render do navegador (lento demais) e entra aqui, no ffmpeg.
      const nitidez = Number(p.timeline?.visual?.nitidez ?? 0);
      if (nitidez > 0) {
        const nitida = saida.replace(/\.mp4$/, "-nitida.mp4");
        const forca = Math.min(1.5, nitidez * 2.5).toFixed(2);
        await execFileP(
          process.env.FFMPEG_SISTEMA ?? "ffmpeg",
          [
            "-y",
            "-loglevel",
            "error",
            "-i",
            saida,
            "-vf",
            `unsharp=5:5:${forca}:5:5:0`,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-c:a",
            "copy",
            nitida,
          ],
          { maxBuffer: 1024 * 1024 * 20 },
        );
        await fs.rename(nitida, saida);
      }
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
      if (cancelado) {
        console.log(`[render] ${job.id} cancelado`);
        continue;
      }
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
