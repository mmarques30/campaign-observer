// Cards modernos (vidro escuro, ícone na cor de destaque) que entram um a um no instante em
// que a pessoa fala de cada item e ficam na tela. "foco" acende um card e apaga os outros.
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { paraSaida } from "../tempo";
import { u, useEntradaSaida, type EfeitoProps } from "./base";
import { comAlfa, IconeCor } from "./falados";

type Item = { titulo: string; icone?: string; de?: number; detalhe?: string; tag?: string };
type Foco = { indice: number; de: number };

export function Cards({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur, { saidaFrames: 8 });
  const m = ctx.tl.marca;
  const t0 = paraSaida(ctx.trechos, ctx.deFonte);
  const quadro = (s: number | undefined) =>
    s == null ? 0 : Math.max(0, Math.round((paraSaida(ctx.trechos, s) - t0) * fps));
  const itens = (Array.isArray(p.itens) ? (p.itens as Item[]) : []).filter((it) => it?.titulo);
  const n = itens.length;
  const colunas = Number(p.colunas) || (n <= 3 ? n : n === 4 ? 2 : 3);
  const compacto = n > 3;
  const gap = 18 * k;
  const larguraTotal = width * 0.9;
  const larg = (larguraTotal - gap * (colunas - 1)) / colunas;
  const pos = String(p.posicao ?? "superior");
  const top =
    p.y != null
      ? Number(p.y) * height
      : pos === "inferior"
        ? height * 0.62
        : pos === "centro"
          ? height * 0.4
          : height * 0.07;
  // Foco atual: o último cujo instante já passou.
  const focos = (Array.isArray(p.foco) ? (p.foco as Foco[]) : [])
    .map((x) => ({ indice: Number(x.indice), ini: quadro(x.de) }))
    .filter((x) => frame >= x.ini)
    .sort((a, b) => a.ini - b.ini);
  const foco = focos.length ? focos[focos.length - 1] : null;
  const luz = foco
    ? spring({ frame: frame - foco.ini, fps, config: { damping: 18, stiffness: 160 } })
    : 0;

  return (
    <AbsoluteFill style={{ opacity: saida, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: (width - larguraTotal) / 2,
          top,
          width: larguraTotal,
          display: "grid",
          gridTemplateColumns: `repeat(${colunas}, ${larg}px)`,
          gridAutoRows: "auto",
          gap,
        }}
      >
        {itens.map((it, i) => {
          const ini = quadro(it.de ?? ctx.deFonte) + (it.de == null ? i * 4 : 0);
          const s = spring({
            frame: frame - ini,
            fps,
            config: { damping: 14, stiffness: 190, mass: 0.6 },
          });
          const emFoco = foco?.indice === i;
          const apagado = foco && !emFoco ? interpolate(luz, [0, 1], [1, 0.4]) : 1;
          return (
            <div
              key={i}
              style={{
                opacity: Math.min(1, s * 1.4) * apagado,
                transform: `translateY(${(1 - s) * 34 * k}px) scale(${interpolate(s, [0, 1], [0.88, 1]) * (emFoco ? 1 + 0.04 * luz : 1)})`,
                padding: compacto ? `${16 * k}px ${18 * k}px` : `${22 * k}px ${22 * k}px`,
                borderRadius: 26 * k,
                background: `linear-gradient(180deg, ${comAlfa(m.fundo, 0.86)}, ${comAlfa(m.fundo, 0.72)})`,
                border: emFoco
                  ? `${3 * k}px solid ${m.destaque}`
                  : `${1.5 * k}px solid ${comAlfa("#ffffff", 0.14)}`,
                boxShadow: emFoco
                  ? `0 0 ${40 * k}px ${comAlfa(m.destaque, 0.45 * luz)}, 0 ${16 * k}px ${40 * k}px rgba(0,0,0,.45)`
                  : `0 ${16 * k}px ${40 * k}px rgba(0,0,0,.45)`,
                backdropFilter: "blur(14px)",
                display: "flex",
                flexDirection: compacto ? "row" : "column",
                alignItems: compacto ? "center" : "flex-start",
                gap: (compacto ? 12 : 14) * k,
              }}
            >
              <div
                style={{
                  width: (compacto ? 56 : 72) * k,
                  height: (compacto ? 56 : 72) * k,
                  borderRadius: 18 * k,
                  flexShrink: 0,
                  background: emFoco ? m.destaque : comAlfa(m.destaque, 0.16),
                  border: `${1.5 * k}px solid ${comAlfa(m.destaque, 0.45)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconeCor
                  nome={it.icone ?? "ph:check-circle-bold"}
                  cor={emFoco ? m.fundo : m.destaque}
                  tamanho={(compacto ? 32 : 42) * k}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: f(m.fonteLegenda),
                    fontWeight: 800,
                    fontSize: (compacto ? 32 : 40) * k,
                    lineHeight: 1.1,
                    color: m.texto,
                    letterSpacing: -0.5 * k,
                  }}
                >
                  {it.titulo}
                </div>
                {it.detalhe && (
                  <div
                    style={{
                      fontFamily: f(m.fonteLegenda),
                      fontWeight: 500,
                      fontSize: 24 * k,
                      lineHeight: 1.25,
                      color: comAlfa(m.texto, 0.65),
                      marginTop: 6 * k,
                    }}
                  >
                    {it.detalhe}
                  </div>
                )}
                {it.tag && (
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 10 * k,
                      fontFamily: f(m.fonteLegenda),
                      fontWeight: 800,
                      fontSize: 20 * k,
                      letterSpacing: 2 * k,
                      textTransform: "uppercase",
                      color: m.destaque,
                      border: `${2 * k}px solid ${m.destaque}`,
                      borderRadius: 999,
                      padding: `${4 * k}px ${12 * k}px`,
                    }}
                  >
                    {it.tag}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
