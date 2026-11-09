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
/** Timbre de áudio de WhatsApp/celular sobre a voz já limpa (efeito "nota de voz"). */
export const CADEIA_AUDIO =
  // Faixa de telefone (300–3.400 Hz) com corte íngreme (3 filtros seguidos), médios na frente.
  "highpass=f=320,highpass=f=320,highpass=f=320,lowpass=f=3300,lowpass=f=3300,lowpass=f=3300," +
  "equalizer=f=1400:t=q:w=1:g=5,equalizer=f=2400:t=q:w=1.2:g=2," +
  "acompressor=threshold=0.12:ratio=4:attack=4:release=90:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000";

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
    for (const nivel of [...NIVEIS_VOZ, "audio"] as const) {
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
          nivel === "audio" ? `${cadeiaVoz("media")},${CADEIA_AUDIO}` : cadeiaVoz(nivel),
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

// ---------------------------------------------------------------------------------------------
// Juntar vídeos: o projeto continua com UM arquivo de vídeo (tudo no editor — cortes, legenda,
// recorte, voz — trabalha sobre ele). Os dois vídeos são padronizados (tamanho do original,
// 30 fps, áudio 48 kHz), emendados num arquivo novo, e a transcrição do vídeo novo é encaixada
// sem perder a edição: no "antes", os tempos e as correções da legenda andam junto.
// A emenda vira um ponto da timeline com a própria transição (timeline.emendas).
// ---------------------------------------------------------------------------------------------
const SYS = () => process.env.FFMPEG_SISTEMA ?? "ffmpeg";
const PROBE = () => process.env.FFPROBE_SISTEMA ?? "ffprobe";

async function sondar(arq: string) {
  const { stdout } = await execFileP(
    PROBE(),
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,duration",
      "-of",
      "json",
      arq,
    ],
    { maxBuffer: 1 << 22 },
  );
  const j = JSON.parse(stdout);
  const streams: any[] = j.streams ?? [];
  const total = Number(j.format?.duration) || 0;
  const v = streams.find((x) => x.codec_type === "video");
  return {
    dur: total,
    // Duração do vídeo (a imagem manda: o áudio é completado ou aparado até ela).
    video: Number(v?.duration) || total,
    audio: streams.some((x) => x.codec_type === "audio"),
  };
}

/** Mesmo tamanho (preenchendo o quadro, sem tarja), 30 fps, áudio estéreo 48 kHz do tamanho do vídeo. */
export async function padronizar(entrada: string, saida: string, W: number, H: number) {
  const { audio, video } = await sondar(entrada);
  const dur = video.toFixed(3);
  const args = ["-y", "-loglevel", "error", "-i", entrada];
  if (!audio) args.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");
  args.push(
    "-filter_complex",
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=30,format=yuv420p,trim=0:${dur}[v];` +
      `[${audio ? "0:a:0" : "1:a"}]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:${dur}[a]`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-g",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    saida,
  );
  await execFileP(SYS(), args, { maxBuffer: 1 << 24 });
  return (await sondar(saida)).video;
}

async function wav16k(entrada: string, saida: string) {
  await execFileP(
    SYS(),
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      entrada,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      saida,
    ],
    { maxBuffer: 1 << 24 },
  );
}

async function subir(destino: string, local: string, tipo: string) {
  const up = await sbc()
    .storage.from(BUCKET)
    .upload(destino, await fs.readFile(local), { contentType: tipo, upsert: true });
  if (up.error) throw new Error(`upload ${destino}: ${up.error.message}`);
}

/** Desloca no tempo (segundos do original) tudo da edição que é ancorado no vídeo. */
function deslocarTimeline(tl: any, d: number, nPalavras: number) {
  if (!d && !nPalavras) return tl;
  const s = (x: any) => (typeof x === "number" ? +(x + d).toFixed(3) : x);
  const out = { ...tl };
  out.cortes = (tl.cortes ?? []).map((c: any) => ({ ...c, de: s(c.de), ate: s(c.ate) }));
  out.efeitos = (tl.efeitos ?? []).map((e: any) => ({ ...e, de: s(e.de), ate: s(e.ate) }));
  out.sfx = (tl.sfx ?? []).map((x: any) => ({ ...x, em: s(x.em) }));
  out.emendas = (tl.emendas ?? []).map((x: any) => ({ ...x, em: s(x.em) }));
  if (tl.zoom)
    out.zoom = {
      ...tl.zoom,
      eventos: (tl.zoom.eventos ?? []).map((z: any) => ({ ...z, de: s(z.de), ate: s(z.ate) })),
    };
  if (tl.legenda && nPalavras) {
    const corr: Record<string, string> = {};
    for (const [k, v] of Object.entries(tl.legenda.correcoes ?? {}))
      corr[String(Number(k) + nPalavras)] = v as string;
    out.legenda = {
      ...tl.legenda,
      correcoes: corr,
      destaques: (tl.legenda.destaques ?? []).map((k: number) => k + nPalavras),
    };
  }
  return out;
}

const FOLGA_DISSOLVE = 0.5; // igual a FOLGA_EMENDA em src/video/tempo.ts

export async function juntarVideos(
  jobId: string,
  projetoId: string,
  params: { anexo_path?: string; posicao?: string; transicao?: string },
) {
  const anexoPath = String(params.anexo_path ?? "");
  if (!anexoPath.startsWith(`${projetoId}/`)) throw new Error("vídeo para juntar inválido");
  const antes = params.posicao === "antes";
  const transicao = params.transicao || "suave";
  const { data: proj0, error } = await sbc()
    .from("vedit_projetos")
    .select("id, fonte_path, fonte_largura, fonte_altura")
    .eq("id", projetoId)
    .single();
  if (error || !proj0?.fonte_path) throw new Error("projeto sem vídeo");
  const pasta = path.join(os.tmpdir(), `juntar-${jobId}`);
  await fs.mkdir(pasta, { recursive: true });
  const progresso = (etapa: string) =>
    sbc().from("vedit_jobs").update({ resultado: { etapa } }).eq("id", jobId);
  try {
    await progresso("Baixando os vídeos");
    const fonte = path.join(pasta, `fonte${path.extname(proj0.fonte_path) || ".mp4"}`);
    const anexo = path.join(pasta, `anexo${path.extname(anexoPath) || ".mp4"}`);
    await Promise.all([baixar(proj0.fonte_path, fonte), baixar(anexoPath, anexo)]);
    const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);
    const W = par(Number(proj0.fonte_largura) || 1080),
      H = par(Number(proj0.fonte_altura) || 1920);

    await progresso("Padronizando os vídeos");
    const pv = path.join(pasta, "velho.mp4"),
      pn = path.join(pasta, "novo.mp4");
    const dVelho = await padronizar(fonte, pv, W, H);
    const dNovo = await padronizar(anexo, pn, W, H);
    const [primeiro, segundo] = antes ? [pn, pv] : [pv, pn];
    const emenda = +(antes ? dNovo : dVelho).toFixed(3);

    await progresso("Emendando");
    const lista = path.join(pasta, "lista.txt");
    await fs.writeFile(lista, `file '${primeiro}'\nfile '${segundo}'\n`);
    const junto = path.join(pasta, "junto.mp4");
    await execFileP(
      SYS(),
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        lista,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        junto,
      ],
      { maxBuffer: 1 << 24 },
    );
    const total = (await sondar(junto)).video || dVelho + dNovo;
    const audioTodo = path.join(pasta, "audio.wav"),
      audioNovo = path.join(pasta, "anexo.wav");
    await Promise.all([wav16k(junto, audioTodo), wav16k(pn, audioNovo)]);

    await progresso("Subindo o vídeo emendado");
    const ts = Date.now();
    const fontePath = `${projetoId}/fonte-junto-${ts}.mp4`;
    const audioPath = `${projetoId}/audio-${ts}.wav`;
    const anexoWav = `${projetoId}/anexo-${ts}.wav`;
    await subir(fontePath, junto, "video/mp4");
    await subir(audioPath, audioTodo, "audio/wav");
    await subir(anexoWav, audioNovo, "audio/wav");

    await progresso("Transcrevendo o vídeo novo");
    const tr = await chamarFuncao("vedit-transcrever", {
      projeto_id: projetoId,
      arquivo: anexoWav,
    });
    const novas: { p: string; i: number; f: number }[] = tr.palavras ?? [];

    // Lê o projeto de novo AGORA: a pessoa pode ter editado enquanto o servidor trabalhava.
    // Grava só se a versão não mudou entre a leitura e a escrita (senão lê de novo e refaz).
    let gravado: { tl: any; versao: number } | null = null;
    for (let tentativa = 0; tentativa < 4 && !gravado; tentativa++) {
      const { data: proj } = await sbc()
        .from("vedit_projetos")
        .select("id, palavras, timeline, versao, transcricao_texto")
        .eq("id", projetoId)
        .single();
      const velhas: { p: string; i: number; f: number }[] = Array.isArray(proj?.palavras)
        ? proj!.palavras
        : [];
      const mover = (ws: typeof velhas, d: number) =>
        ws.map((w) => ({ ...w, i: +(w.i + d).toFixed(2), f: +(w.f + d).toFixed(2) }));
      const palavras = antes
        ? [...novas, ...mover(velhas, dNovo)]
        : [...velhas, ...mover(novas, dVelho)];

      let tl: any = proj?.timeline ?? {};
      if (antes) tl = deslocarTimeline(tl, dNovo, novas.length);
      // Trechos: o vídeo velho (os cortes que já existem) + o novo inteiro.
      const cortesVelhos: any[] = (tl.cortes ?? []).length
        ? tl.cortes
        : [{ de: antes ? dNovo : 0, ate: antes ? dNovo + dVelho : dVelho }];
      const trechoNovo = antes ? { de: 0, ate: dNovo } : { de: dVelho, ate: dVelho + dNovo };
      // O lado de antes da emenda termina um pouco antes do fim do arquivo: essa sobra é a imagem
      // que se dissolve por cima do vídeo seguinte. Nunca corta fala.
      const fimFalaAntes = Math.max(
        0,
        ...palavras.filter((w) => w.f <= emenda + 0.05).map((w) => w.f),
      );
      // (Vale para qualquer transição: assim dá para trocar para o dissolve depois.)
      const folga = Math.max(0.04, Math.min(FOLGA_DISSOLVE, emenda - fimFalaAntes - 0.08));
      const ajustar = (c: any) =>
        c.de < emenda && c.ate > emenda - folga
          ? { ...c, ate: +Math.max(c.de + 0.05, Math.min(c.ate, emenda - folga)).toFixed(3) }
          : c;
      const cortes = antes
        ? [ajustar(trechoNovo), ...cortesVelhos]
        : [...cortesVelhos.map(ajustar), trechoNovo];
      tl = {
        ...tl,
        cortes: tl.ordemLivre ? cortes : [...cortes].sort((a, b) => a.de - b.de),
        emendas: [...(tl.emendas ?? []), { em: emenda, transicao }].sort((a, b) => a.em - b.em),
      };

      const versao = (proj?.versao ?? 0) + 1;
      const { data: feito, error: e2 } = await sbc()
        .from("vedit_projetos")
        .update({
          fonte_path: fontePath,
          fonte_proxy_path: null,
          fonte_duracao: +total.toFixed(3),
          audio_path: audioPath,
          palavras,
          transcricao_texto: antes
            ? `${tr.texto ?? ""} ${proj?.transcricao_texto ?? ""}`.trim()
            : `${proj?.transcricao_texto ?? ""} ${tr.texto ?? ""}`.trim(),
          timeline: tl,
          versao,
        })
        .eq("id", projetoId)
        .eq("versao", proj?.versao ?? 0)
        .select("id");
      if (e2) throw new Error(e2.message);
      if (feito?.length) gravado = { tl, versao };
    }
    if (!gravado) throw new Error("o projeto foi editado sem parar; tente juntar de novo");
    const { tl, versao } = gravado;
    await sbc()
      .from("vedit_versoes")
      .insert({
        projeto_id: projetoId,
        versao,
        timeline: tl,
        origem: "manual",
        resumo: `Vídeo juntado ${antes ? "antes" : "depois"} do original (emenda em ${emenda.toFixed(1)}s, transição ${transicao})`,
      });
    // O recorte da pessoa era do vídeo antigo: sai, e o editor gera de novo quando precisar.
    await sbc()
      .from("vedit_midias")
      .delete()
      .eq("projeto_id", projetoId)
      .eq("nome", "recorte-pessoa.webm");
    // Voz limpa e versão leve do preview são refeitas para o vídeo novo.
    const tamanho = (await fs.stat(junto)).size;
    const jobs: any[] = [{ projeto_id: projetoId, tipo: "voz" }];
    if (Math.min(W, H) > 1080 || tamanho > 40 * 1024 * 1024)
      jobs.push({ projeto_id: projetoId, tipo: "proxy" });
    await sbc().from("vedit_jobs").insert(jobs);
    await sbc()
      .from("vedit_jobs")
      .update({ resultado: { etapa: "Pronto", emenda, duracao: total } })
      .eq("id", jobId);
  } finally {
    await fs.rm(pasta, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------
// Montar: grava a edição de cortes num arquivo novo. Os trechos que ficam, na ordem em que tocam
// (com ordem livre, a da lista), viram o vídeo do projeto; o que foi cortado deixa de existir.
// Transcrição, efeitos, sons, zooms e legenda são levados para o tempo do arquivo novo.
// ---------------------------------------------------------------------------------------------
export async function montarCortes(jobId: string, projetoId: string) {
  const { trechosMantidos, paraSaida } = await import("../src/video/tempo");
  const { normalizarTimeline } = await import("../src/video/schema");
  const { data: proj0, error } = await sbc()
    .from("vedit_projetos")
    .select("id, fonte_path, fonte_largura, fonte_altura, fonte_duracao, timeline")
    .eq("id", projetoId)
    .single();
  if (error || !proj0?.fonte_path) throw new Error("projeto sem vídeo");
  const pasta = path.join(os.tmpdir(), `montar-${jobId}`);
  await fs.mkdir(pasta, { recursive: true });
  const progresso = (etapa: string) =>
    sbc().from("vedit_jobs").update({ resultado: { etapa } }).eq("id", jobId);
  try {
    const tl0 = normalizarTimeline(proj0.timeline).timeline;
    const trechos = trechosMantidos(tl0, Number(proj0.fonte_duracao) || 0);
    if (!trechos.length) throw new Error("sem trechos para montar");
    await progresso("Baixando o vídeo");
    const fonte = path.join(pasta, `fonte${path.extname(proj0.fonte_path) || ".mp4"}`);
    await baixar(proj0.fonte_path, fonte);
    const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);
    const W = par(Number(proj0.fonte_largura) || 1080),
      H = par(Number(proj0.fonte_altura) || 1920);
    const { audio } = await sondar(fonte);

    await progresso("Recortando os trechos");
    const pedacos: string[] = [];
    for (const [k, t] of trechos.entries()) {
      const saida = path.join(pasta, `p${k}.mp4`);
      const dur = (t.ate - t.de).toFixed(3);
      const v = t.vel || 1;
      const tempo = (x: number) => {
        const f: string[] = [];
        while (x > 2) (f.push("atempo=2"), (x /= 2));
        while (x < 0.5) (f.push("atempo=0.5"), (x /= 0.5));
        f.push(`atempo=${x}`);
        return f.join(",");
      };
      const args = ["-y", "-loglevel", "error", "-ss", t.de.toFixed(3), "-t", dur, "-i", fonte];
      if (!audio) args.push("-f", "lavfi", "-t", dur, "-i", "anullsrc=r=48000:cl=stereo");
      const durSaida = ((t.ate - t.de) / v).toFixed(3);
      args.push(
        "-filter_complex",
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,setpts=(PTS-STARTPTS)/${v},fps=30,format=yuv420p,trim=0:${durSaida}[v];` +
          `[${audio ? "0:a:0" : "1:a"}]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,${v === 1 ? "" : tempo(v) + ","}apad,atrim=0:${durSaida}[a]`,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-g",
        "30",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        saida,
      );
      await execFileP(SYS(), args, { maxBuffer: 1 << 24 });
      pedacos.push(saida);
    }
    await progresso("Montando o vídeo");
    const lista = path.join(pasta, "lista.txt");
    await fs.writeFile(lista, pedacos.map((p) => `file '${p}'`).join("\n") + "\n");
    const montado = path.join(pasta, "montado.mp4");
    await execFileP(
      SYS(),
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        lista,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        montado,
      ],
      { maxBuffer: 1 << 24 },
    );
    const total = (await sondar(montado)).video;
    const audioWav = path.join(pasta, "audio.wav");
    await wav16k(montado, audioWav);

    await progresso("Subindo o vídeo montado");
    const ts = Date.now();
    const fontePath = `${projetoId}/fonte-montado-${ts}.mp4`;
    const audioPath = `${projetoId}/audio-${ts}.wav`;
    await subir(fontePath, montado, "video/mp4");
    await subir(audioPath, audioWav, "audio/wav");

    let gravado: { tl: any; versao: number } | null = null;
    for (let tentativa = 0; tentativa < 4 && !gravado; tentativa++) {
      const { data: proj } = await sbc()
        .from("vedit_projetos")
        .select("id, palavras, timeline, versao")
        .eq("id", projetoId)
        .single();
      const tlRaw: any = proj?.timeline ?? {};
      const dentro = (s: number) => trechos.find((t) => s >= t.de - 0.001 && s <= t.ate + 0.001);
      const novoT = (s: number) => +paraSaida(trechos, s).toFixed(3);
      // Palavras: só as que ficam, na ordem em que tocam, no tempo novo.
      const velhas: { p: string; i: number; f: number }[] = Array.isArray(proj?.palavras)
        ? proj!.palavras
        : [];
      const ficam = velhas
        .map((w, idx) => ({ w, idx }))
        .filter(({ w }) => {
          const t = dentro((w.i + w.f) / 2);
          return !!t;
        })
        .map(({ w, idx }) => {
          const t = dentro((w.i + w.f) / 2)!;
          const cl = (x: number) => Math.min(t.ate, Math.max(t.de, x));
          return {
            idx,
            w: {
              ...w,
              i: +(t.saidaDe + (cl(w.i) - t.de) / t.vel).toFixed(2),
              f: +(t.saidaDe + (cl(w.f) - t.de) / t.vel).toFixed(2),
            },
          };
        })
        .sort((a, b) => a.w.i - b.w.i);
      const novoIdx = new Map(ficam.map((x, k) => [x.idx, k]));
      const palavras = ficam.map((x) => x.w);
      // Efeitos/zooms: ficam os que começam num trecho mantido; o fim encosta no do trecho se
      // cair fora dele (nada atravessa para outro bloco).
      const janela = (de: number, ate: number) => {
        const t = dentro(de);
        if (!t) return null;
        const fimFonte = Math.min(ate > de ? ate : de, t.ate);
        return { de: novoT(de), ate: +(t.saidaDe + (fimFonte - t.de) / t.vel).toFixed(3) };
      };
      const efeitos = (tlRaw.efeitos ?? [])
        .map((e: any) => {
          const j = janela(Number(e.de), Number(e.ate));
          return j ? { ...e, ...j } : null;
        })
        .filter(Boolean);
      const sfx = (tlRaw.sfx ?? [])
        .filter((x: any) => dentro(Number(x.em)))
        .map((x: any) => ({ ...x, em: novoT(Number(x.em)) }));
      const eventos = (tlRaw.zoom?.eventos ?? [])
        .map((z: any) => {
          const j = janela(Number(z.de), Number(z.ate));
          return j ? { ...z, ...j } : null;
        })
        .filter(Boolean);
      const legenda = tlRaw.legenda
        ? {
            ...tlRaw.legenda,
            correcoes: Object.fromEntries(
              Object.entries(tlRaw.legenda.correcoes ?? {})
                .filter(([k]) => novoIdx.has(Number(k)))
                .map(([k, v]) => [String(novoIdx.get(Number(k))), v]),
            ),
            destaques: (tlRaw.legenda.destaques ?? [])
              .filter((k: number) => novoIdx.has(k))
              .map((k: number) => novoIdx.get(k)),
          }
        : tlRaw.legenda;
      const tl = {
        ...tlRaw,
        cortes: [],
        ordemLivre: false,
        emendas: [],
        efeitos,
        sfx,
        zoom: { ...(tlRaw.zoom ?? {}), eventos },
        legenda,
      };
      const versao = (proj?.versao ?? 0) + 1;
      const { data: feito, error: e2 } = await sbc()
        .from("vedit_projetos")
        .update({
          fonte_path: fontePath,
          fonte_proxy_path: null,
          fonte_duracao: +total.toFixed(3),
          audio_path: audioPath,
          palavras,
          transcricao_texto: palavras.map((w) => w.p).join(" "),
          timeline: tl,
          versao,
          render_path: null,
        })
        .eq("id", projetoId)
        .eq("versao", proj?.versao ?? 0)
        .select("id");
      if (e2) throw new Error(e2.message);
      if (feito?.length) gravado = { tl, versao };
    }
    if (!gravado) throw new Error("o projeto foi editado sem parar; tente de novo");
    await sbc()
      .from("vedit_versoes")
      .insert({
        projeto_id: projetoId,
        versao: gravado.versao,
        timeline: gravado.tl,
        origem: "manual",
        resumo: `Cortes gravados num vídeo novo (${trechos.length} trechos, ${total.toFixed(1)}s): o que foi cortado saiu do arquivo`,
      });
    await sbc()
      .from("vedit_midias")
      .delete()
      .eq("projeto_id", projetoId)
      .eq("nome", "recorte-pessoa.webm");
    const tamanho = (await fs.stat(montado)).size;
    const jobs: any[] = [{ projeto_id: projetoId, tipo: "voz" }];
    if (Math.min(W, H) > 1080 || tamanho > 40 * 1024 * 1024)
      jobs.push({ projeto_id: projetoId, tipo: "proxy" });
    await sbc().from("vedit_jobs").insert(jobs);
    await sbc()
      .from("vedit_jobs")
      .update({ resultado: { etapa: "Pronto", duracao: total } })
      .eq("id", jobId);
  } finally {
    await fs.rm(pasta, { recursive: true, force: true });
  }
}

/** Fila leve (vedit_jobs): proxy e afins. Tem prioridade sobre o render. Devolve true se rodou algo. */
const EH_AD_LIBRARY = /facebook\.com\/ads\/library/i;

/** Caminho do Chrome que o Remotion já baixou (chrome-headless-shell) para usar no Playwright. */
async function chromeDoRemotion() {
  const raiz = path.join(process.cwd(), "node_modules", ".remotion");
  const candidatos = [
    path.join(
      raiz,
      "chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell",
    ),
    path.join(
      raiz,
      "chrome-headless-shell/mac_arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell",
    ),
  ];
  for (const c of candidatos)
    if (
      await fs.stat(c).then(
        () => true,
        () => false,
      )
    )
      return c;
  const { ensureBrowser } = await import("@remotion/renderer");
  await ensureBrowser();
  for (const c of candidatos)
    if (
      await fs.stat(c).then(
        () => true,
        () => false,
      )
    )
      return c;
  throw new Error("navegador do Remotion não encontrado");
}

/**
 * Biblioteca de Anúncios da Meta (facebook.com/ads/library/?id=…): a página exige rodar o
 * desafio em JavaScript, então abre no Chrome do Remotion, lê o JSON embutido (vídeo HD, texto,
 * anunciante, CTA, link, data de início, plataformas) e baixa o MP4 com a sessão do navegador.
 */
async function baixarAdLibrary(id: string, url: string) {
  const idAd = url.match(/[?&]id=(\d+)/)?.[1];
  if (!idAd) throw new Error("link da Biblioteca de Anúncios sem id (?id=…)");
  let pw: typeof import("playwright-core");
  try {
    pw = await import("playwright-core");
  } catch {
    throw new Error(
      "worker sem playwright-core: refaça o build do worker (render-worker/Dockerfile)",
    );
  }
  const exe = await chromeDoRemotion();
  const navegador = await pw.chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  try {
    const ctx = await navegador.newContext({
      locale: "pt-BR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 1000 },
    });
    const pagina = await ctx.newPage();
    await pagina.goto(`https://www.facebook.com/ads/library/?id=${idAd}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // O desafio resolve e a página recarrega com o anúncio; espera o JSON do snapshot aparecer.
    let html = "";
    for (let i = 0; i < 40; i++) {
      await pagina.waitForTimeout(1500);
      html = await pagina.content().catch(() => "");
      if (
        /"video_hd_url"|"video_sd_url"|"original_image_url"|"page_name"/.test(html) &&
        /"page_name"/.test(html)
      ) {
        if (/"video_hd_url"|"video_sd_url"|"original_image_url"/.test(html)) break;
      }
    }
    const campo = (re: RegExp) => {
      const m = html.match(re);
      if (!m) return null;
      try {
        return JSON.parse(`"${m[1]}"`) as string;
      } catch {
        return m[1];
      }
    };
    const video = campo(/"video_hd_url":"([^"]+)"/) ?? campo(/"video_sd_url":"([^"]+)"/);
    const imagem =
      campo(/"original_image_url":"([^"]+)"/) ?? campo(/"resized_image_url":"([^"]+)"/);
    const anunciante = campo(/"page_name":"([^"]*)"/);
    const corpo = campo(/"body":\{"text":"((?:[^"\\]|\\.)*)"/);
    const titulo = campo(/"title":"((?:[^"\\]|\\.)*)"/);
    const cta = campo(/"cta_text":"([^"]*)"/);
    const link = campo(/"link_url":"([^"]*)"/);
    const inicio = html.match(/"start_date":(\d+)/)?.[1];
    const plataformas =
      html
        .match(/"publisher_platform":\[([^\]]*)\]/)?.[1]
        ?.replace(/"/g, "")
        .toLowerCase() ?? null;
    if (!anunciante && !video && !imagem)
      throw new Error(
        "a Biblioteca de Anúncios não mostrou esse anúncio (link errado, anúncio removido ou bloqueio da Meta)",
      );
    if (!video)
      throw new Error(
        `este anúncio de ${anunciante ?? "?"} é só imagem${corpo ? ` ("${corpo.slice(0, 80)}…")` : ""}: a análise de vídeo precisa de um anúncio em vídeo`,
      );
    const r = await ctx.request.get(video, { timeout: 120000 });
    if (!r.ok()) throw new Error(`download do vídeo do anúncio falhou (${r.status()})`);
    const arquivo = path.join(os.tmpdir(), `ref-${id}.mp4`);
    await fs.writeFile(arquivo, await r.body());
    return {
      arquivo,
      username: anunciante,
      legenda: [titulo, corpo].filter(Boolean).join("\n\n") || null,
      curtidas: null as number | null,
      metricas: {
        origem: "ads_library",
        id_anuncio: idAd,
        anunciante,
        cta,
        link,
        inicio: inicio ? new Date(Number(inicio) * 1000).toISOString() : null,
        plataformas,
        imagem,
      },
    };
  } finally {
    await navegador.close().catch(() => null);
  }
}

/** Baixa o vídeo do link (Instagram, TikTok, YouTube…) com o yt-dlp para o disco, em H.264. */
async function baixarLocal(id: string, url: string) {
  if (!/^https?:\/\//.test(url)) throw new Error("link inválido");
  if (EH_AD_LIBRARY.test(url)) return baixarAdLibrary(id, url);
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
    metricas: {
      curtidas: info.like_count ?? null,
      comentarios: info.comment_count ?? null,
      visualizacoes: info.view_count ?? null,
      publicado_em: info.timestamp ? new Date(info.timestamp * 1000).toISOString() : null,
    } as Record<string, unknown>,
  };
}

/** Link de compartilhamento do Google Drive → link de download direto (arquivo público). */
function linkDiretoDrive(url: string) {
  const id =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1] ??
    url.match(/[?&]id=([\w-]+)/)?.[1] ??
    null;
  if (!id || !/google\.com/.test(url)) return null;
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
}

/**
 * Importa o vídeo cru de um link (Google Drive ou link direto do arquivo) para um projeto
 * novo do editor, no lugar do upload pelo navegador: baixa, padroniza em H.264 até 1080p,
 * separa o áudio da transcrição e segue o mesmo caminho do upload (transcrição, voz, proxy).
 */
async function importarDoLink(jobId: string, projetoId: string, url: string) {
  if (!/^https?:\/\//.test(url)) throw new Error("link inválido");
  const marcar = (patch: Record<string, unknown>) =>
    sbc().from("vedit_projetos").update(patch).eq("id", projetoId);
  const bruto = path.join(os.tmpdir(), `imp-${jobId}.bin`);
  const fonte = path.join(os.tmpdir(), `imp-${jobId}.mp4`);
  const wav = path.join(os.tmpdir(), `imp-${jobId}.wav`);
  try {
    const direto = linkDiretoDrive(url);
    if (direto || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url)) {
      const r = await fetch(direto ?? url, { redirect: "follow" });
      const tipo = r.headers.get("content-type") ?? "";
      if (!r.ok || !r.body || /text\/html/i.test(tipo))
        throw new Error(
          direto
            ? "não consegui baixar do Drive. Deixe o arquivo com acesso \"Qualquer pessoa com o link\" e tente de novo."
            : `download falhou (${r.status})`,
        );
      const total = Number(r.headers.get("content-length")) || 0;
      const { Readable, Transform } = await import("node:stream");
      const { pipeline } = await import("node:stream/promises");
      const { createWriteStream } = await import("node:fs");
      let lidos = 0;
      let ultimo = -1;
      const contar = new Transform({
        transform(chunk, _enc, cb) {
          lidos += chunk.length;
          const pct = total ? Math.floor((lidos / total) * 90) : 0;
          if (pct >= ultimo + 5) {
            ultimo = pct;
            void marcar({ upload_progresso: pct });
          }
          cb(null, chunk);
        },
      });
      await pipeline(Readable.fromWeb(r.body as any), contar, createWriteStream(bruto));
    } else {
      // Outros links (YouTube, Instagram…): o yt-dlp resolve.
      const r = await baixarLocal(jobId, url);
      await fs.rename(r.arquivo, bruto);
    }

    // Padroniza: H.264 até 1080p (gira conforme a orientação gravada), áudio AAC.
    const { stdout } = await execFileP(
      PROBE(),
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation:stream_tags=rotate", "-of", "json", bruto],
      { maxBuffer: 1 << 22 },
    );
    const st = JSON.parse(stdout).streams?.[0] ?? {};
    const rot = Math.abs(
      Number(st.tags?.rotate ?? st.side_data_list?.find((d: any) => d.rotation != null)?.rotation ?? 0),
    );
    let w = Number(st.width) || 1080,
      h = Number(st.height) || 1920;
    if (rot === 90 || rot === 270) [w, h] = [h, w];
    if (!w || !h) throw new Error("não reconheci o vídeo (arquivo corrompido ou sem imagem)");
    const vertical = h >= w;
    const escala = Math.min(w, h) > 1080 ? (vertical ? "scale=1080:-2" : "scale=-2:1080") : "scale=trunc(iw/2)*2:trunc(ih/2)*2";
    await marcar({ upload_progresso: 92 });
    await execFileP(
      SYS(),
      ["-y", "-loglevel", "error", "-i", bruto, "-vf", escala, "-fpsmax", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", fonte],
      { maxBuffer: 1 << 24 },
    );
    await fs.rm(bruto, { force: true });
    await execFileP(SYS(), ["-y", "-loglevel", "error", "-i", fonte, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], { maxBuffer: 1 << 24 });
    const s = await sondar(fonte);
    const { stdout: dims } = await execFileP(PROBE(), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", fonte]);
    const [lg, al] = dims.trim().split(",").map(Number);

    for (const [arq, destino, tipo] of [
      [wav, `${projetoId}/audio.wav`, "audio/wav"],
      [fonte, `${projetoId}/fonte.mp4`, "video/mp4"],
    ] as const) {
      const up = await sbc()
        .storage.from(BUCKET)
        .upload(destino, await fs.readFile(arq), { contentType: tipo, upsert: true });
      if (up.error) throw new Error(`subir ${destino}: ${up.error.message}`);
    }
    const tamanho = (await fs.stat(fonte)).size;
    await marcar({
      fonte_path: `${projetoId}/fonte.mp4`,
      audio_path: `${projetoId}/audio.wav`,
      fonte_duracao: s.dur,
      fonte_largura: lg,
      fonte_altura: al,
      upload_progresso: 100,
      status: "transcrevendo",
      erro: null,
    });
    if (tamanho > 40 * 1024 * 1024)
      await sbc().from("vedit_jobs").insert({ projeto_id: projetoId, tipo: "proxy" });
    await sbc().from("vedit_jobs").insert({ projeto_id: projetoId, tipo: "voz" });
    await chamarFuncao("vedit-transcrever", { projeto_id: projetoId });
  } catch (e) {
    await marcar({ status: "erro", erro: `Importar do link: ${(e as Error).message}`.slice(0, 500) });
    throw e;
  } finally {
    for (const a of [bruto, fonte, wav]) await fs.rm(a, { force: true });
  }
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
      metricas: r.metricas ?? {},
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

/**
 * Busca por tema na Biblioteca de Anúncios da Meta (anúncios de vídeo ativos no país): abre a
 * página de busca no navegador, lê os cartões visíveis e grava em vedit_nicho_ads. A "prova" de
 * performance é tempo no ar e quantas variações usam o mesmo criativo.
 */
const MESES_PT: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};
function dataPt(s: string | null): string | null {
  const m = s?.match(/(\d{1,2}) de (\w{3})\w* de (\d{4})/);
  if (!m) return null;
  const mes = MESES_PT[m[2].toLowerCase()];
  return mes ? `${m[3]}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
async function buscarAdsLibrary(jobId: string, tema: string, pais: string) {
  let pw: typeof import("playwright-core");
  try {
    pw = await import("playwright-core");
  } catch {
    throw new Error(
      "worker sem playwright-core: refaça o build do worker (render-worker/Dockerfile)",
    );
  }
  const exe = await chromeDoRemotion();
  const navegador = await pw.chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  try {
    const ctx = await navegador.newContext({
      locale: "pt-BR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 1000 },
    });
    const pagina = await ctx.newPage();
    const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${encodeURIComponent(pais)}&q=${encodeURIComponent(tema)}&search_type=keyword_unordered&media_type=video`;
    await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    let achou = false;
    for (let i = 0; i < 40; i++) {
      await pagina.waitForTimeout(1500);
      const t = await pagina.evaluate(() => document.body.innerText).catch(() => "");
      if (/Identificação da biblioteca|Library ID/i.test(t)) {
        achou = true;
        break;
      }
      if (/Nenhum resultado|No results/i.test(t)) break;
    }
    if (!achou) return 0;
    for (let i = 0; i < 5; i++) {
      await pagina.mouse.wheel(0, 3000);
      await pagina.waitForTimeout(1800);
    }
    const cartoes: { id: string; txt: string; poster: string | null }[] = await pagina.evaluate(
      () => {
        const res: Record<string, { id: string; txt: string; poster: string | null }> = {};
        const nos = [...document.querySelectorAll("div,span")].filter(
          (d) =>
            d.childElementCount === 0 &&
            /^(Identificação da biblioteca|Library ID):\s*\d+/.test((d.textContent ?? "").trim()),
        );
        for (const el of nos) {
          const id = (el.textContent?.match(/(\d{10,})/) ?? [])[1];
          if (!id || res[id]) continue;
          let card: HTMLElement = el as HTMLElement;
          for (let k = 0; k < 14 && card.parentElement; k++) {
            card = card.parentElement;
            if (
              (card.innerText ?? "").includes("Patrocinado") ||
              (card.innerText ?? "").includes("Sponsored")
            )
              break;
          }
          const vid = card.querySelector("video");
          const imgs = [...card.querySelectorAll("img")]
            .map((i) => ({
              src: i.src,
              w: i.naturalWidth || i.width,
              h: i.naturalHeight || i.height,
            }))
            .filter((i) => i.w >= 100)
            .sort((a, b) => b.w * b.h - a.w * a.h);
          res[id] = { id, txt: card.innerText ?? "", poster: vid?.poster || imgs[0]?.src || null };
        }
        return Object.values(res);
      },
    );
    const agora = new Date().toISOString();
    const linhas = cartoes.map((c) => {
      const linhas = c.txt
        .split("\n")
        .map((x) => x.trim())
        .filter((x) => x && x !== "\u200b");
      const inicio = dataPt(
        (c.txt.match(/(?:Veiculação iniciada em|Started running on) (.+)/) ?? [])[1] ?? null,
      );
      const variantes = Number((c.txt.match(/(\d+) (?:anúncios usam|ads use)/) ?? [])[1] ?? 1);
      const iP = linhas.findIndex((l) => l === "Patrocinado" || l === "Sponsored");
      const anunciante = iP > 0 ? linhas[iP - 1] : null;
      const corpo =
        iP >= 0
          ? linhas
              .slice(iP + 1)
              .filter(
                (l) =>
                  !/^(Saiba mais|Learn More|Cadastre-se|Sign Up|Enviar mensagem|Comprar agora|Shop Now|Estamos com problemas|Ver resumo|Abrir menu suspenso|Ver detalhes do anúncio|See ad details|See Details)/i.test(
                    l,
                  ),
              )
              .join(" ")
          : "";
      return {
        id: c.id,
        tema,
        pais,
        anunciante,
        inicio,
        variantes,
        texto: corpo.slice(0, 1500),
        poster: c.poster,
        url: `https://www.facebook.com/ads/library/?id=${c.id}`,
        buscado_em: agora,
      };
    });
    if (linhas.length) {
      const { error } = await sbc().from("vedit_nicho_ads").upsert(linhas, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
    await sbc()
      .from("vedit_jobs")
      .update({ resultado: { encontrados: linhas.length } })
      .eq("id", jobId);
    return linhas.length;
  } finally {
    await navegador.close().catch(() => {});
  }
}

/** Tipos leves que rodam numa fila paralela, sem esperar o render terminar. */
const JOBS_RAPIDOS = ["baixar", "referencia", "cria_referencia", "slideshow", "ads_busca"];

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
    else if (job.tipo === "juntar") await juntarVideos(job.id, job.projeto_id, job.params ?? {});
    else if (job.tipo === "montar") await montarCortes(job.id, job.projeto_id);
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
    else if (job.tipo === "ads_busca")
      await buscarAdsLibrary(
        job.id,
        String(job.params?.tema ?? ""),
        String(job.params?.pais ?? "BR"),
      );
    else if (job.tipo === "importar")
      await importarDoLink(job.id, job.projeto_id, String(job.params?.url ?? ""));
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
      // Só assina as mídias que a edição usa, e uma mídia sem arquivo (busca que falhou no upload,
      // arquivo apagado) não derruba o render inteiro: o elemento dela é pulado na composição.
      const usadas = JSON.stringify(p.timeline ?? {});
      const midias: Record<string, string> = {};
      for (const [id, caminho] of Object.entries(p.midiasPaths ?? {})) {
        if (!usadas.includes(id)) continue;
        try {
          midias[id] = await assinar(caminho);
        } catch (e) {
          console.warn(
            `[render] ${job.id} mídia ${id} sem arquivo, seguindo sem ela:`,
            (e as Error).message,
          );
        }
      }
      const inputProps = {
        timeline: p.timeline,
        palavras: p.palavras,
        duracaoFonte: p.duracaoFonte,
        fonteUrl: await assinar(p.fontePath),
        recorteUrl: p.recortePath ? await assinar(p.recortePath) : undefined,
        vozUrls: p.vozPaths
          ? Object.fromEntries(
              await Promise.all(
                Object.entries(p.vozPaths).map(async ([k, v]) => [
                  k,
                  // A versão "áudio" (nota de voz) pode não existir em projetos antigos.
                  k === "audio" ? await assinar(v).catch(() => undefined) : await assinar(v),
                ]),
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
