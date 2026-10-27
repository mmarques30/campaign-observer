// Estilo "editorial" (referência: justyn.ai). Serifa, paleta verde-musgo/creme,
// números de capítulo, crachá, letras de azulejo e frase em caixa.
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { Marcado } from "../marcacao";
import { lista, u, useEntradaSaida, type EfeitoProps } from "./base";
import { comAlfa } from "./falados";

const VERDE = "#2F4A3A";
const CREME = "#F3EFE6";

// ─── Número de capítulo gigante em serifa ("1", "2") ─────────────────────
export function NumeroCapitulo({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur, { saidaFrames: 8 });
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const numero = String(p.numero ?? "1");
  const lado = p.lado ?? "esquerda";
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          top: height * 0.06,
          [lado === "direita" ? "right" : "left"]: width * 0.08,
          fontFamily: f(ctx.tl.marca.fonteSerif, "serif"),
          fontWeight: 400,
          fontSize: 460 * k,
          lineHeight: 0.85,
          color: p.cor ?? ctx.tl.marca.destaque,
          opacity: interpolate(s, [0, 1], [0, 0.95]),
          transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`,
          textShadow: "0 20px 60px rgba(0,0,0,.35)",
          letterSpacing: -10 * k,
        }}
      >
        {numero}
      </div>
      {p.texto && (
        <div
          style={{
            position: "absolute",
            top: height * 0.06 + 400 * k,
            [lado === "direita" ? "right" : "left"]: width * 0.09,
            fontFamily: f("Instrument Serif", "serif"),
            fontSize: 54 * k,
            color: p.cor ?? ctx.tl.marca.texto,
            opacity: interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" }),
            letterSpacing: 1 * k,
          }}
        >
          <Marcado texto={String(p.texto ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─── Crachá "HELLO my name is" com nome sendo escrito à mão ──────────────
export function Cracha({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const s = spring({ frame, fps, config: { damping: 11, stiffness: 180 } });
  const nome = String(p.nome ?? "Mari");
  const n = Math.round(
    interpolate(frame, [10, 10 + nome.length * 3], [0, nome.length], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    }),
  );
  const w = 520 * k;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: (width - w) / 2 + Number(p.deslocX ?? 0) * width,
          top: height * (p.posicao === "centro" ? 0.4 : 0.1),
          width: w,
          background: "#fff",
          borderRadius: 18 * k,
          boxShadow: "0 18px 50px rgba(0,0,0,.35)",
          overflow: "hidden",
          transform: `rotate(${interpolate(s, [0, 1], [-14, -3])}deg) scale(${s})`,
        }}
      >
        <div
          style={{
            background: p.cor ?? VERDE,
            padding: `${16 * k}px 0 ${10 * k}px`,
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div
            style={{
              fontFamily: f("Archivo Black", "Impact"),
              fontSize: 54 * k,
              letterSpacing: 4 * k,
            }}
          >
            {p.titulo ?? "HELLO"}
          </div>
          <div style={{ fontFamily: f("Inter"), fontWeight: 600, fontSize: 22 * k, opacity: 0.9 }}>
            {p.subtitulo ?? "my name is"}
          </div>
        </div>
        <div
          style={{
            height: 150 * k,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: f("Caveat", "cursive"),
            fontWeight: 700,
            fontSize: 92 * k,
            color: "#1d1d1d",
          }}
        >
          {nome.slice(0, n)}
          <span style={{ opacity: frame % 14 < 7 && n < nome.length ? 1 : 0, color: VERDE }}>
            |
          </span>
        </div>
        <div style={{ height: 14 * k, background: p.cor ?? VERDE }} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Letras de azulejo caindo (E D I T) ──────────────────────────────────
export function Azulejos({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const texto = String(p.texto ?? "EDIT").toUpperCase();
  const tam = Math.min(200 * k, (width * 0.84) / texto.length - 14 * k);
  const total = texto.length * (tam + 14 * k);
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: (width - total) / 2,
          top: height * (p.posicao === "centro" ? 0.42 : 0.1),
          display: "flex",
          gap: 14 * k,
        }}
      >
        {texto.split("").map((c, i) => {
          const s = spring({
            frame: frame - i * 4,
            fps,
            config: { damping: 10, stiffness: 210, mass: 0.8 },
          });
          if (c === " ") return <div key={i} style={{ width: tam * 0.5 }} />;
          return (
            <div
              key={i}
              style={{
                width: tam,
                height: tam,
                borderRadius: 14 * k,
                background: CREME,
                border: `${3 * k}px solid #d9d2c3`,
                boxShadow: `0 ${10 * k}px 0 #cfc7b6, 0 ${22 * k}px 40px rgba(0,0,0,.3)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: f("Playfair Display", "serif"),
                fontWeight: 700,
                fontSize: tam * 0.62,
                color: p.cor ?? VERDE,
                transform: `translateY(${interpolate(s, [0, 1], [-height * 0.4, 0])}px) rotate(${interpolate(s, [0, 1], [i % 2 ? 18 : -18, i % 2 ? 2 : -2])}deg)`,
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ─── Frase em caixa (serifa itálica sobre verde) ─────────────────────────
export function FraseCaixa({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 150 } });
  const texto = String(p.texto ?? "que até sua *avó* consegue");
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: "7%",
          right: "7%",
          top:
            p.y != null
              ? Number(p.y) * height
              : height * (p.posicao === "superior" ? 0.12 : p.posicao === "inferior" ? 0.6 : 0.42),
          background: p.cor ?? comAlfa(ctx.tl.marca.fundo, 0.9),
          border: p.cor ? undefined : `${1.5 * k}px solid ${comAlfa("#ffffff", 0.12)}`,
          padding: `${34 * k}px ${40 * k}px`,
          borderRadius: 28 * k,
          boxShadow: "0 24px 70px rgba(0,0,0,.4)",
          textAlign: "center",
          transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
          opacity: s,
        }}
      >
        <div
          style={{
            fontFamily: f(ctx.tl.marca.fonteLegenda),
            fontWeight: 700,
            fontSize: 48 * k,
            lineHeight: 1.25,
            color: ctx.tl.marca.texto,
          }}
        >
          <Marcado
            texto={texto}
            escala={k}
            destaque={{
              fontFamily: f(ctx.tl.marca.fonteSerif, "serif"),
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 64 * k,
              color: ctx.tl.marca.destaque,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Lista editorial (itens com número em serifa, à esquerda) ─────────────
export function ListaEditorial({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const itens = lista(p.itens, [
    "Escolher o modelo certo",
    "Dar o guia de marca",
    "Aprovar o storyboard",
  ]);
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div style={{ position: "absolute", left: "7%", right: "7%", top: height * 0.1 }}>
        {p.titulo && (
          <div
            style={{
              fontFamily: f(ctx.tl.marca.fonteSerif, "serif"),
              fontStyle: "italic",
              fontSize: 60 * k,
              color: ctx.tl.marca.texto,
              marginBottom: 20 * k,
              textShadow: "0 4px 20px rgba(0,0,0,.5)",
            }}
          >
            <Marcado texto={String(p.titulo ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
          </div>
        )}
        {itens.slice(0, 5).map((t, i) => {
          const s = spring({ frame: frame - 6 - i * 8, fps, config: { damping: 15 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 22 * k,
                marginBottom: 14 * k,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-50, 0])}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: f(ctx.tl.marca.fonteSerif, "serif"),
                  fontWeight: 700,
                  fontSize: 86 * k,
                  color: ctx.tl.marca.destaque,
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: f(ctx.tl.marca.fonteLegenda),
                  fontWeight: 700,
                  fontSize: 42 * k,
                  color: ctx.tl.marca.texto,
                  background: comAlfa(ctx.tl.marca.fundo, 0.7),
                  padding: `${4 * k}px ${14 * k}px`,
                  borderRadius: 8 * k,
                }}
              >
                {t}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
