import {
  getRemotionEnvironment,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Palavra, Timeline } from "../schema";
import type { Trecho } from "../tempo";

// No preview, um vídeo que não carrega não derruba a tela; no render, falha alto.
export const aoErrar = () =>
  getRemotionEnvironment().isRendering ? undefined : (e: Error) => console.warn("[vedit] mídia", e);

export type EfeitoCtx = {
  tl: Timeline;
  fonteUrl: string;
  duracaoFonte: number;
  midias: Record<string, string>;
  trechos: Trecho[];
  palavras: Palavra[];
  deFonte: number; // início do efeito no tempo do original
  modoGaleria?: boolean;
  recorteUrl?: string;
  // Transform/enquadramento do vídeo base no quadro atual (para a pessoa recortada encaixar).
  estiloBase?: { transform: string; transformOrigin: string; objectPosition: string; filter?: string };
};

export type EfeitoProps = { p: Record<string, any>; ctx: EfeitoCtx; dur: number };

/** Progresso de entrada (0→1 no começo) e saída (1→0 no fim) com mola. */
export function useEntradaSaida(
  dur: number,
  opts?: { saidaFrames?: number; damping?: number; stiffness?: number },
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sai = opts?.saidaFrames ?? Math.min(10, Math.floor(dur / 4));
  const entrada = spring({
    frame,
    fps,
    config: { damping: opts?.damping ?? 15, stiffness: opts?.stiffness ?? 180, mass: 0.7 },
  });
  const saida = interpolate(frame, [dur - sai, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { frame, fps, entrada, saida, vis: Math.min(entrada, saida) };
}

export const lista = (v: unknown, fallback: string[] = []): string[] =>
  Array.isArray(v)
    ? v.map(String).filter(Boolean)
    : typeof v === "string" && v.trim()
      ? v.split(/\s*[|\n]\s*/)
      : fallback;

export const u = (width: number) => width / 1080;

/** Mostra uma mídia enviada (id) ou um trecho do próprio vídeo (tempo do original). */
export function Midia({
  ctx,
  midia,
  tempo,
  style,
  mudo = true,
}: {
  ctx: EfeitoCtx;
  midia?: string;
  tempo?: number;
  style?: React.CSSProperties;
  mudo?: boolean;
}) {
  const { fps } = useVideoConfig();
  const url = midia
    ? (ctx.midias[midia] ?? (midia.startsWith("http") ? midia : undefined))
    : undefined;
  const s: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    ...style,
  };
  if (url && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)) return <Img src={url} style={s} />;
  if (url) return <OffthreadVideo src={url} muted={mudo} style={s} onError={aoErrar()} />;
  if (!ctx.fonteUrl)
    return <div style={{ ...s, background: "linear-gradient(135deg,#2a2a35,#111)" }} />;
  const t = tempo ?? ctx.deFonte;
  return (
    <OffthreadVideo
      src={ctx.fonteUrl}
      muted
      trimBefore={Math.max(0, Math.round(t * fps))}
      style={s}
      onError={aoErrar()}
    />
  );
}

/** Ruído determinístico (sem Math.random, que quebra o render). */
export function ruido(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
