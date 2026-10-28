import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { Marcado } from "../marcacao";
import { lista, Midia, ruido, u, useEntradaSaida, type EfeitoProps } from "./base";

// ─── B-roll (corte para outra imagem/vídeo) ──────────────────────────────
export function Broll({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, entrada, saida } = useEntradaSaida(dur, { saidaFrames: 5, damping: 20 });
  const modo = p.modo ?? "tela-cheia";
  const ken = interpolate(frame, [0, dur], [1.06, 1.16]);
  const conteudo = (
    <Midia
      ctx={ctx}
      midia={p.midia}
      tempo={p.tempo}
      // foco: recorte do vídeo deitado no quadro em pé (ex.: "80% 50%" mostra o lado direito)
      style={{ transform: `scale(${ken})`, ...(p.foco ? { objectPosition: String(p.foco) } : {}) }}
    />
  );
  if (modo === "janela") {
    return (
      <AbsoluteFill style={{ opacity: saida }}>
        <div
          style={{
            position: "absolute",
            left: "8%",
            right: "8%",
            top: height * 0.14,
            height: height * 0.34,
            borderRadius: 36 * k,
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,.5)",
            border: `4px solid rgba(255,255,255,.85)`,
            transform: `scale(${entrada}) rotate(${interpolate(entrada, [0, 1], [-4, 0])}deg)`,
          }}
        >
          {conteudo}
        </div>
        {p.legenda && (
          <div
            style={{
              position: "absolute",
              top: height * 0.49,
              width: "100%",
              textAlign: "center",
              fontFamily: f(ctx.tl.marca.fonteLegenda),
              fontWeight: 800,
              fontSize: 34 * k,
              color: "#fff",
              textShadow: "0 3px 14px rgba(0,0,0,.7)",
            }}
          >
            {p.legenda}
          </div>
        )}
      </AbsoluteFill>
    );
  }
  if (modo === "metade") {
    return (
      <AbsoluteFill style={{ opacity: saida }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: height * 0.5,
            overflow: "hidden",
            clipPath: `inset(0 0 ${interpolate(entrada, [0, 1], [100, 0])}% 0)`,
          }}
        >
          {conteudo}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * 0.5 - 3 * k,
            height: 6 * k,
            background: ctx.tl.marca.destaque,
            opacity: entrada,
          }}
        />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ opacity: Math.min(entrada * 2, 1) * saida }}>{conteudo}</AbsoluteFill>
  );
}

// ─── /colagem: seus vídeos caindo na mesa, você falando embaixo ──────────
export function Colagem({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida, entrada } = useEntradaSaida(dur);
  const midias = lista(p.midias);
  const n = Math.max(midias.length, Number(p.quantidade ?? 5));
  const altura = height * 0.5;
  const rotulos = lista(p.rotulos);
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: altura,
          overflow: "hidden",
          background: "radial-gradient(ellipse at 50% 40%, #fbf7ee, #e9dfcc)",
          clipPath: `inset(0 0 ${interpolate(entrada, [0, 1], [100, 0])}% 0)`,
        }}
      >
        {Array.from({ length: n }).map((_, i) => {
          const s = spring({
            frame: frame - 4 - i * 6,
            fps,
            config: { damping: 13, stiffness: 160 },
          });
          const cw = 230 * k;
          const x = width * (0.12 + ((i * 0.37) % 0.76));
          const y = altura * (0.12 + ((i * 0.29) % 0.5));
          const rot = (ruido(i + 11) - 0.5) * 26;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - cw / 2,
                top: y,
                width: cw,
                aspectRatio: "9/14",
                background: "#fff",
                padding: 10 * k,
                paddingBottom: 34 * k,
                boxShadow: `0 ${interpolate(s, [0, 1], [60, 10])}px ${interpolate(s, [0, 1], [80, 22])}px rgba(0,0,0,.28)`,
                transform: `translateY(${interpolate(s, [0, 1], [-altura, 0])}px) rotate(${rot * s}deg) scale(${interpolate(s, [0, 1], [1.5, 1])})`,
              }}
            >
              <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <Midia ctx={ctx} midia={midias[i]} tempo={(ctx.duracaoFonte / (n + 1)) * (i + 1)} />
              </div>
              {rotulos[i] && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 4 * k,
                    width: "100%",
                    left: 0,
                    textAlign: "center",
                    fontFamily: f("Caveat", "cursive"),
                    fontWeight: 700,
                    fontSize: 30 * k,
                    color: "#222",
                  }}
                >
                  {rotulos[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: altura - 2 * k,
          height: 4 * k,
          background: "rgba(0,0,0,.25)",
        }}
      />
    </AbsoluteFill>
  );
}

// ─── Antes e depois (cortina) ────────────────────────────────────────────
export function AntesDepois({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, entrada, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const corte = interpolate(frame, [dur * 0.25, dur * 0.6], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const painel = (titulo: string, itens: string[], midia: string | undefined, depois: boolean) => (
    <AbsoluteFill style={{ background: depois ? m.fundo : "#2a1d1d" }}>
      {midia ? (
        <Midia ctx={ctx} midia={midia} />
      ) : (
        <div style={{ position: "absolute", top: height * 0.3, left: "9%", right: "9%" }}>
          {itens.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16 * k,
                alignItems: "center",
                fontFamily: f(m.fonteLegenda),
                fontWeight: 700,
                fontSize: 46 * k,
                color: depois ? "#fff" : "#f3c7c7",
                marginBottom: 26 * k,
              }}
            >
              <span style={{ color: depois ? m.destaque : "#ff6b6b", fontSize: 50 * k }}>
                {depois ? "✓" : "✕"}
              </span>
              {t}
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: height * 0.15,
          left: "9%",
          fontFamily: f(m.fonteTitulo),
          fontWeight: 800,
          fontSize: 80 * k,
          color: depois ? m.destaque : "#ff8a8a",
          letterSpacing: -2 * k,
        }}
      >
        <Marcado texto={String(titulo ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
      </div>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ opacity: Math.min(entrada * 2, 1) * saida }}>
      {painel(
        p.rotuloDepois ?? "Depois",
        lista(p.depois, ["Lead respondido em 1 min", "Proposta automática", "Relatório pronto"]),
        p.midiaDepois,
        true,
      )}
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}>
        {painel(
          p.rotuloAntes ?? "Antes",
          lista(p.antes, ["Planilha manual", "Lead esfriando", "Fim de semana no WhatsApp"]),
          p.midiaAntes,
          false,
        )}
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${corte}%`,
          width: 8 * k,
          marginLeft: -4 * k,
          background: "#fff",
          boxShadow: "0 0 30px rgba(255,255,255,.6)",
          opacity: corte > 0.5 && corte < 99.5 ? 1 : 0,
        }}
      />
    </AbsoluteFill>
  );
}

// ─── /particulas: grãos enchem o celular e viram o vídeo ─────────────────
export function Particulas({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, saida, entrada } = useEntradaSaida(dur, { saidaFrames: 6 });
  const m = ctx.tl.marca;
  const w = 470 * k,
    h = w * 2.05,
    x0 = (width - w) / 2,
    y0 = (height - h) / 2;
  const enche = interpolate(frame, [0, dur * 0.55], [0, 1], { extrapolateRight: "clamp" });
  const revela = interpolate(frame, [dur * 0.5, dur * 0.72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const N = 260;
  const cel = 26 * k;
  const cols = Math.floor((w - 40 * k) / cel);
  return (
    <AbsoluteFill style={{ background: "#F2F2EF", opacity: Math.min(1, entrada * 1.6) * saida }}>
      <div
        style={{
          position: "absolute",
          left: x0,
          top: y0,
          width: w,
          height: h,
          borderRadius: 66 * k,
          background: "#0d0d0f",
          padding: 16 * k,
          boxShadow: "0 40px 100px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 52 * k,
            overflow: "hidden",
            background: "#050505",
          }}
        >
          {Array.from({ length: N }).map((_, i) => {
            const col = i % cols,
              lin = Math.floor(i / cols);
            const chegada = (lin / (N / cols)) * 0.9 + ruido(i) * 0.1; // de baixo pra cima
            const t = interpolate(enche, [chegada * 0.85, chegada * 0.85 + 0.15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const yFinal = h - 40 * k - lin * cel;
            const y = interpolate(t, [0, 1], [-60 * k - ruido(i + 5) * 300 * k, yFinal]);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 18 * k + col * cel,
                  top: y,
                  width: cel * 0.62,
                  height: cel * 0.62,
                  borderRadius: 3 * k,
                  background: ruido(i + 9) > 0.8 ? "#e8483b" : m.destaque,
                  opacity: t > 0 ? 1 - revela : 0,
                }}
              />
            );
          })}
          <AbsoluteFill style={{ opacity: revela }}>
            <Midia ctx={ctx} midia={p.midia} tempo={p.tempo} />
          </AbsoluteFill>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: y0 + h + 24 * k,
          width: "100%",
          textAlign: "center",
          fontFamily: f("DM Mono", "monospace"),
          fontSize: 26 * k,
          color: "#555",
        }}
      >
        {p.texto ?? `editando… ${Math.round(Math.min(1, enche + revela * 0.1) * 100)}%`}
      </div>
    </AbsoluteFill>
  );
}

// ─── Rabisco à mão (doodle boil) ─────────────────────────────────────────
const FORMAS: Record<string, string> = {
  circulo: "M50,8 C78,6 96,30 92,55 C88,82 60,96 36,90 C12,84 2,58 10,36 C16,20 30,10 52,9",
  seta: "M8,80 C30,70 50,52 72,26 M72,26 L52,30 M72,26 L70,46",
  sublinhado: "M4,60 C30,52 60,66 96,56 M10,72 C40,66 70,76 92,70",
  estrela: "M50,6 L61,38 L95,38 L67,58 L78,92 L50,71 L22,92 L33,58 L5,38 L39,38 Z",
  xis: "M15,15 L85,85 M85,15 L15,85",
};
export function Rabisco({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, saida } = useEntradaSaida(dur);
  const d = FORMAS[p.forma ?? "circulo"] ?? FORMAS.circulo;
  const tam = Number(p.tamanho ?? 360) * k;
  const seed = Math.floor(frame / 3);
  const desenho = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const cor = p.cor ?? ctx.tl.marca.destaque;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <svg
        width={tam}
        height={tam}
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          left: Number(p.x ?? 0.5) * width - tam / 2,
          top: Number(p.y ?? 0.35) * height - tam / 2,
          overflow: "visible",
        }}
      >
        <defs>
          <filter id={`boil-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed} />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
        <path
          d={d}
          fill="none"
          stroke={cor}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - desenho}
          filter={`url(#boil-${seed})`}
        />
      </svg>
      {p.texto && (
        <div
          style={{
            position: "absolute",
            left: Number(p.x ?? 0.5) * width - 300 * k,
            width: 600 * k,
            top: Number(p.y ?? 0.35) * height + tam / 2,
            textAlign: "center",
            fontFamily: f("Caveat", "cursive"),
            fontWeight: 700,
            fontSize: 64 * k,
            color: cor,
            transform: `rotate(-4deg)`,
            opacity: desenho,
          }}
        >
          <Marcado texto={String(p.texto ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
        </div>
      )}
    </AbsoluteFill>
  );
}
