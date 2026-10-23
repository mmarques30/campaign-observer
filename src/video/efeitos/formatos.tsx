// Formatos de tela: dividida e react (você numa janelinha sobre outro vídeo/print).
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { Marcado } from "../marcacao";
import { Midia, u, useEntradaSaida, type EfeitoProps } from "./base";

// ─── Tela dividida: a mídia ocupa uma metade; você fica na outra ───────────
export function Dividir({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { entrada, saida } = useEntradaSaida(dur, { damping: 18, stiffness: 140 });
  const lado = String(p.lado ?? "cima"); // onde a MÍDIA entra: cima | baixo | esquerda | direita
  const vertical = lado === "cima" || lado === "baixo";
  const prop = Number(p.proporcao ?? 0.5);
  const avanco = interpolate(entrada, [0, 1], [0, 1]);
  const caixa: React.CSSProperties = vertical
    ? {
        left: 0,
        right: 0,
        [lado === "cima" ? "top" : "bottom"]: 0,
        height: `${prop * 100 * avanco}%`,
      }
    : {
        top: 0,
        bottom: 0,
        [lado === "esquerda" ? "left" : "right"]: 0,
        width: `${prop * 100 * avanco}%`,
      };
  const linha: React.CSSProperties = vertical
    ? {
        left: 0,
        right: 0,
        [lado === "cima" ? "top" : "bottom"]: `${prop * 100 * avanco}%`,
        height: 6 * k,
        marginTop: -3 * k,
      }
    : {
        top: 0,
        bottom: 0,
        [lado === "esquerda" ? "left" : "right"]: `${prop * 100 * avanco}%`,
        width: 6 * k,
        marginLeft: -3 * k,
      };
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div style={{ position: "absolute", overflow: "hidden", background: "#000", ...caixa }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: vertical ? "100%" : width * prop,
            height: vertical ? height * prop : "100%",
          }}
        >
          <Midia ctx={ctx} midia={p.midia} tempo={p.tempo} mudo={p.som !== true} />
        </div>
        {p.legenda && (
          <div
            style={{
              position: "absolute",
              left: 20 * k,
              bottom: 20 * k,
              fontFamily: f(ctx.tl.marca.fonteLegenda),
              fontWeight: 800,
              fontSize: 30 * k,
              color: "#fff",
              background: "rgba(0,0,0,.6)",
              padding: `${6 * k}px ${14 * k}px`,
              borderRadius: 10 * k,
            }}
          >
            {p.legenda}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", background: ctx.tl.marca.destaque, ...linha }} />
    </AbsoluteFill>
  );
}

// ─── React: mídia em tela cheia, você numa janelinha reagindo ─────────────
export function Reagir({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur, { damping: 14, stiffness: 160 });
  const canto = String(p.canto ?? "inferior-direito");
  const tam = Number(p.tamanho ?? 0.34) * width;
  const alt = tam * (p.janela === "redonda" ? 1 : 1.35);
  const pos: React.CSSProperties = {
    [canto.includes("superior") ? "top" : "bottom"]: canto.includes("superior")
      ? height * 0.16
      : height * 0.37,
    [canto.includes("esquerdo") ? "left" : "right"]: width * 0.05,
  };
  const pulso = 1 + Math.sin(frame / 9) * 0.004;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <AbsoluteFill style={{ background: "#000", opacity: Math.min(1, entrada * 1.4) }}>
        <Midia ctx={ctx} midia={p.midia} tempo={p.tempo} mudo={p.som !== true} />
      </AbsoluteFill>
      {p.titulo && (
        <div
          style={{
            position: "absolute",
            top: height * 0.16,
            left: "6%",
            right: "6%",
            textAlign: "center",
            fontFamily: f(ctx.tl.marca.fonteTitulo),
            fontWeight: 800,
            fontSize: 54 * k,
            color: "#fff",
            textShadow: "0 4px 24px rgba(0,0,0,.7)",
            opacity: entrada,
          }}
        >
          <Marcado texto={String(p.titulo ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          ...pos,
          width: tam,
          height: alt,
          borderRadius: p.janela === "redonda" ? "50%" : 28 * k,
          overflow: "hidden",
          border: `${5 * k}px solid ${ctx.tl.marca.destaque}`,
          boxShadow: "0 24px 60px rgba(0,0,0,.55)",
          transform: `scale(${spring({ frame, fps, config: { damping: 11, stiffness: 200 } }) * pulso})`,
        }}
      >
        {/* A pessoa: o próprio vídeo a partir do mesmo instante do original, com foco no rosto. */}
        <Midia
          ctx={ctx}
          tempo={ctx.deFonte}
          style={{
            objectPosition: `${ctx.tl.enquadramento.x * 100}% ${Math.max(0, ctx.tl.enquadramento.y - 0.15) * 100}%`,
            transform: "scale(1.25)",
            transformOrigin: "50% 30%",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

// ─── Imagem de fundo com você em janela (sem recorte): foto da internet atrás ─
export function FundoImagem({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur, { damping: 16, stiffness: 120 });
  const ken = interpolate(frame, [0, dur], [1.04, 1.14]);
  const w = width * Number(p.tamanho ?? 0.72);
  const h = w * 1.45;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <AbsoluteFill
        style={{
          opacity: Math.min(1, entrada * 1.5),
          filter: p.desfocar === false ? "none" : "blur(2px) brightness(.75)",
        }}
      >
        <Midia ctx={ctx} midia={p.midia} style={{ transform: `scale(${ken})` }} />
      </AbsoluteFill>
      {p.titulo && (
        <div
          style={{
            position: "absolute",
            top: height * 0.12,
            left: "6%",
            right: "6%",
            textAlign: "center",
            fontFamily: f(ctx.tl.marca.fonteTitulo),
            fontWeight: 800,
            fontSize: 60 * k,
            lineHeight: 1.05,
            color: "#fff",
            textShadow: "0 6px 30px rgba(0,0,0,.7)",
            opacity: entrada,
          }}
        >
          <Marcado texto={String(p.titulo ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: (width - w) / 2,
          top: height * 0.5 - h / 2 + height * 0.04,
          width: w,
          height: h,
          borderRadius: 36 * k,
          overflow: "hidden",
          border: `${6 * k}px solid rgba(255,255,255,.9)`,
          boxShadow: "0 40px 100px rgba(0,0,0,.6)",
          transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 15, stiffness: 120 } }), [0, 1], [height * 0.5, 0])}px)`,
        }}
      >
        <Midia
          ctx={ctx}
          tempo={ctx.deFonte}
          style={{
            objectPosition: `${ctx.tl.enquadramento.x * 100}% ${ctx.tl.enquadramento.y * 100}%`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
