// Fase 2: efeitos que usam a pessoa recortada (WebM com fundo transparente gerado no navegador).
// O recorte segue os mesmos cortes e o mesmo zoom do vídeo base, então encaixa por cima dele.
import {
  AbsoluteFill,
  getRemotionEnvironment,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { f } from "../fontes";
import { paraSaida } from "../tempo";
import { aoErrar, Midia, ruido, u, useEntradaSaida, type EfeitoCtx, type EfeitoProps } from "./base";

/**
 * Vídeo que respeita os cortes da edição dentro de um efeito: o quadro 0 do efeito é o instante
 * `ctx.deFonte` do original; cada trecho mantido vira uma sub-sequência com o trimBefore certo.
 */
export function VideoNosCortes({
  ctx,
  src,
  dur,
  style,
}: {
  ctx: EfeitoCtx;
  src: string;
  dur: number;
  style?: React.CSSProperties;
}) {
  const { fps } = useVideoConfig();
  const inicio = paraSaida(ctx.trechos, ctx.deFonte);
  const fim = inicio + dur / fps;
  const s: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", ...style };
  return (
    <>
      {ctx.trechos
        .filter((t) => t.saidaDe < fim && t.saidaDe + (t.ate - t.de) > inicio)
        .map((t, i) => (
          <Sequence
            key={i}
            from={Math.round((t.saidaDe - inicio) * fps)}
            durationInFrames={Math.max(1, Math.round((t.ate - t.de) * fps))}
            layout="none"
          >
            <AbsoluteFill>
              <OffthreadVideo
                src={src}
                muted
                transparent
                trimBefore={Math.round(t.de * fps)}
                style={s}
                onError={aoErrar()}
              />
            </AbsoluteFill>
          </Sequence>
        ))}
    </>
  );
}

/** A pessoa recortada, com o mesmo enquadramento/zoom do vídeo base (encaixa por cima dele). */
export function Pessoa({
  ctx,
  dur,
  extra,
  filtro,
}: {
  ctx: EfeitoCtx;
  dur: number;
  extra?: string; // transform adicional (ex.: scale da moldura)
  filtro?: string;
}) {
  if (!ctx.recorteUrl) return <AvisoRecorte />;
  const b = ctx.estiloBase;
  return (
    <AbsoluteFill
      style={{
        transform: `${extra ?? ""} ${b?.transform ?? ""}`.trim(),
        transformOrigin: b?.transformOrigin,
        filter: [b?.filter, filtro].filter(Boolean).join(" ") || undefined,
      }}
    >
      <VideoNosCortes ctx={ctx} src={ctx.recorteUrl} dur={dur} style={{ objectPosition: b?.objectPosition }} />
    </AbsoluteFill>
  );
}

/** Só no preview: lembra de gerar o recorte. No render não desenha nada. */
function AvisoRecorte() {
  if (getRemotionEnvironment().isRendering) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "6%",
        right: "6%",
        top: "40%",
        padding: 18,
        borderRadius: 14,
        background: "rgba(0,0,0,.75)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        fontSize: 26,
        textAlign: "center",
      }}
    >
      Este efeito precisa do recorte da pessoa. Clique em <b>Recortar pessoa</b> no topo do editor.
    </div>
  );
}

// ─── Texto atrás da pessoa ─────────────────────────────────────────────────
export function TextoAtras({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur, { damping: 16, stiffness: 120 });
  const texto = String(p.texto ?? "IA").toUpperCase();
  const linhas = texto.split(/\s*\|\s*|\n/).slice(0, 3);
  const tam = Math.min(420 * k, (width * 1.9) / Math.max(...linhas.map((l) => l.length), 1));
  const cor = p.cor ?? ctx.tl.marca.destaque;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          top: `${Number(p.altura ?? 0.3) * 100 - 30}%`,
        }}
      >
        {linhas.map((l, i) => {
          const s = spring({ frame: frame - i * 4, fps, config: { damping: 14, stiffness: 140 } });
          return (
            <div
              key={i}
              style={{
                fontFamily: f(ctx.tl.marca.fonteTitulo, "Impact"),
                fontWeight: 900,
                fontSize: tam,
                lineHeight: 0.86,
                letterSpacing: -4 * k,
                color: cor,
                textShadow: "0 10px 40px rgba(0,0,0,.35)",
                transform: `translateY(${interpolate(s, [0, 1], [height * 0.25, 0])}px) scale(${interpolate(entrada, [0, 1], [1.15, 1])})`,
                opacity: s,
                whiteSpace: "nowrap",
              }}
            >
              {l}
            </div>
          );
        })}
      </AbsoluteFill>
      <Pessoa ctx={ctx} dur={dur} />
    </AbsoluteFill>
  );
}

// ─── Troca de fundo ────────────────────────────────────────────────────────
export function TrocaFundo({ p, ctx, dur }: EfeitoProps) {
  const { frame, entrada, saida } = useEntradaSaida(dur, { damping: 18, stiffness: 120 });
  const ken = interpolate(frame, [0, dur], [1.05, 1.15]);
  return (
    <AbsoluteFill style={{ opacity: Math.min(entrada * 1.5, saida) }}>
      <AbsoluteFill style={{ filter: p.desfocar ? "blur(6px) brightness(.85)" : "brightness(.9)" }}>
        <Midia ctx={ctx} midia={p.midia} style={{ transform: `scale(${ken})` }} />
      </AbsoluteFill>
      <Pessoa ctx={ctx} dur={dur} />
    </AbsoluteFill>
  );
}

// ─── Contorno rabiscado (doodle boil) ──────────────────────────────────────
export function Contorno({ p, ctx, dur }: EfeitoProps) {
  const { width } = useVideoConfig();
  const k = u(width);
  const frame = useCurrentFrame();
  const { entrada, saida } = useEntradaSaida(dur);
  const cor = p.cor ?? ctx.tl.marca.destaque;
  const e = Number(p.espessura ?? 7) * k * entrada;
  // "Ferve" a linha a cada 3 quadros, como desenho à mão.
  const q = Math.floor(frame / 3);
  const j = (n: number) => (ruido(q * 7 + n) - 0.5) * 3 * k;
  const sombras = [
    [e + j(1), j(2)],
    [-e + j(3), j(4)],
    [j(5), e + j(6)],
    [j(7), -e + j(8)],
    [e * 0.7 + j(9), e * 0.7],
    [-e * 0.7, -e * 0.7 + j(10)],
  ]
    .map(([x, y]) => `drop-shadow(${x.toFixed(1)}px ${y.toFixed(1)}px 0 ${cor})`)
    .join(" ");
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <Pessoa ctx={ctx} dur={dur} filtro={sombras} />
    </AbsoluteFill>
  );
}

// ─── Moldura quebrada (a pessoa sai de dentro do quadro) ──────────────────
export function MolduraQuebrada({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const escala = interpolate(s, [0, 1], [1, Number(p.escala ?? 0.74)]);
  const borda = 14 * k;
  // Área da moldura (em % do quadro já reduzido): corta a cabeça para fora em cima.
  const topo = Number(p.topo ?? 0.3);
  return (
    <AbsoluteFill style={{ opacity: saida, background: p.fundo ?? ctx.tl.marca.fundo }}>
      <AbsoluteFill style={{ transform: `scale(${escala})` }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * topo,
            bottom: 0,
            overflow: "hidden",
            outline: `${borda}px solid ${p.cor ?? "#fff"}`,
            boxShadow: `0 40px 120px rgba(0,0,0,.55)`,
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, top: -height * topo, height }}>
            <Midia ctx={ctx} tempo={ctx.deFonte} style={{ objectPosition: ctx.estiloBase?.objectPosition }} />
          </div>
        </div>
      </AbsoluteFill>
      <Pessoa ctx={ctx} dur={dur} extra={`scale(${escala})`} />
    </AbsoluteFill>
  );
}

// ─── Vertigo (dolly zoom: pessoa parada, fundo esticando) ─────────────────
export function Vertigo({ p, ctx, dur }: EfeitoProps) {
  const frame = useCurrentFrame();
  const { saida } = useEntradaSaida(dur, { saidaFrames: 6 });
  const forca = Number(p.forca ?? 0.45);
  const fundo = interpolate(frame, [0, dur], [1, 1 + forca], { extrapolateRight: "clamp" });
  const b = ctx.estiloBase;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <AbsoluteFill
        style={{
          transform: `scale(${fundo}) ${b?.transform ?? ""}`,
          transformOrigin: b?.transformOrigin,
          filter: `${b?.filter ?? ""} blur(${interpolate(frame, [0, dur], [0, 2])}px)`,
        }}
      >
        {ctx.fonteUrl && (
          <VideoNosCortes ctx={ctx} src={ctx.fonteUrl} dur={dur} style={{ objectPosition: b?.objectPosition }} />
        )}
      </AbsoluteFill>
      <Pessoa ctx={ctx} dur={dur} />
    </AbsoluteFill>
  );
}
