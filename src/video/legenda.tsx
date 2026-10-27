import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Palavra, Timeline } from "./schema";
import { paraSaida, type Trecho } from "./tempo";
import { f } from "./fontes";
import { Marcado, semMarcas } from "./marcacao";

type Bloco = {
  palavras: { texto: string; idx: number; ini: number; fim: number }[];
  ini: number;
  fim: number;
};

/** Agrupa palavras em blocos curtos, quebrando em pontuação e pausas. Tempos já em frames de saída. */
export function montarBlocos(
  palavras: Palavra[],
  tl: Timeline,
  trechos: Trecho[],
  fps: number,
): Bloco[] {
  const leg = tl.legenda;
  const porBloco = leg.estilo === "impacto" ? 1 : leg.palavrasPorBloco;
  const visiveis = palavras
    .map((p, idx) => ({ p, idx }))
    // palavra inteira dentro de um corte some da legenda
    .filter(
      ({ p }) =>
        trechos.some((t) => p.i + 0.02 >= t.de && p.f - 0.02 <= t.ate) || trechos.length === 0,
    );
  const blocos: Bloco[] = [];
  let atual: Bloco["palavras"] = [];
  const fechar = () => {
    if (!atual.length) return;
    blocos.push({ palavras: atual, ini: atual[0].ini, fim: atual[atual.length - 1].fim });
    atual = [];
  };
  // Na ordem em que tocam no vídeo final (com ordem livre dos trechos, não é a do original).
  const tocando = visiveis
    .map((v) => {
      const ini = Math.round(paraSaida(trechos, v.p.i) * fps);
      return { ...v, ini, fim: Math.max(ini + 2, Math.round(paraSaida(trechos, v.p.f) * fps)) };
    })
    .sort((a, b) => a.ini - b.ini);
  tocando.forEach(({ p, idx, ini, fim }, k) => {
    const texto = leg.correcoes[String(idx)] ?? p.p.trim();
    if (!texto) return;
    const anterior = atual[atual.length - 1];
    if (anterior && (ini - anterior.fim > fps * 0.6 || idx < anterior.idx)) fechar();
    atual.push({ texto: leg.caixaAlta ? texto.toUpperCase() : texto, idx, ini, fim });
    const prox = tocando[k + 1];
    if (atual.length >= porBloco || /[.!?…,;:]$/.test(semMarcas(texto)) || !prox) fechar();
  });
  // Cada bloco fica na tela até o próximo começar (sem piscar), no máx +0,7s.
  for (let i = 0; i < blocos.length; i++) {
    const prox = blocos[i + 1];
    blocos[i].fim = prox
      ? Math.min(prox.ini, blocos[i].fim + Math.round(fps * 0.7))
      : blocos[i].fim + Math.round(fps * 0.5);
  }
  return blocos;
}

// Três alturas bem distintas. "inferior" fica logo acima da legenda/botões do Reels;
// para descer mais, use o ajuste fino (legenda.altura) — o guia de zona segura mostra o limite.
export const TOPO: Record<string, string> = { inferior: "71%", centro: "50%", superior: "22%" };

export function Legenda({
  tl,
  palavras,
  trechos,
}: {
  tl: Timeline;
  palavras: Palavra[];
  trechos: Trecho[];
}) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  if (!tl.legenda.ativa || !palavras.length) return null;
  const blocos = montarBlocos(palavras, tl, trechos, fps);
  const bloco = blocos.find((b) => frame >= b.ini && frame < b.fim);
  if (!bloco) return null;
  const m = tl.marca;
  const estilo = tl.legenda.estilo;
  const destaques = new Set(tl.legenda.destaques);
  const entrada = spring({
    frame: frame - bloco.ini,
    fps,
    config: { damping: 16, stiffness: 340, mass: 0.4 },
  });
  const u = (width / 1080) * (tl.legenda.tamanho ?? 1); // escala p/ formatos e tamanho escolhido

  const base: React.CSSProperties = {
    position: "absolute",
    left: "7%",
    right: "7%",
    top: tl.legenda.altura != null ? `${tl.legenda.altura * 100}%` : TOPO[tl.legenda.posicao],
    transform: `translateY(-50%) scale(${interpolate(entrada, [0, 1], [0.86, 1])})`,
    opacity: interpolate(entrada, [0, 1], [0, 1]),
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "baseline",
    textAlign: "center",
    gap: `${10 * u}px ${16 * u}px`,
  };

  const ativa = (w: Bloco["palavras"][number]) => frame >= w.ini && frame < w.fim;
  const ja = (w: Bloco["palavras"][number]) => frame >= w.ini;

  if (estilo === "caixa") {
    return (
      <AbsoluteFill>
        <div style={{ ...base, gap: 0 }}>
          <div
            style={{
              background: `${m.fundo}E6`,
              borderRadius: 14 * u,
              padding: `${14 * u}px ${26 * u}px`,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: `0 ${14 * u}px`,
            }}
          >
            {bloco.palavras.map((w) => (
              <span
                key={w.idx}
                style={{
                  fontFamily: f(m.fonteLegenda),
                  fontWeight: 600,
                  fontSize: 54 * u,
                  color: ativa(w) || destaques.has(w.idx) ? m.destaque : m.texto,
                  transition: "none",
                }}
              >
                <Marcado texto={w.texto} destaque={{ color: m.destaque }} escala={u} />
              </span>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (estilo === "editorial") {
    return (
      <AbsoluteFill>
        <div style={base}>
          {bloco.palavras.map((w) => (
            <span
              key={w.idx}
              style={{
                fontFamily: f(m.fonteSerif, "serif"),
                fontStyle: destaques.has(w.idx) ? "italic" : "normal",
                fontSize: (destaques.has(w.idx) ? 104 : 86) * u,
                lineHeight: 1,
                color: destaques.has(w.idx) ? m.destaque : m.texto,
                opacity: ja(w) ? 1 : 0.35,
                textShadow: "0 4px 30px rgba(0,0,0,.45)",
              }}
            >
              <Marcado texto={w.texto} destaque={{ color: m.destaque }} escala={u} />
            </span>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  if (estilo === "maquina") {
    const texto = semMarcas(bloco.palavras.map((w) => w.texto).join(" "));
    const total = bloco.fim - bloco.ini;
    const n = Math.round(
      interpolate(frame - bloco.ini, [0, Math.max(4, total * 0.6)], [0, texto.length], {
        extrapolateRight: "clamp",
      }),
    );
    return (
      <AbsoluteFill>
        <div style={{ ...base, transform: "translateY(-50%)", opacity: 1 }}>
          <span
            style={{
              fontFamily: f("DM Mono", "monospace"),
              fontSize: 44 * u,
              color: m.texto,
              background: "rgba(0,0,0,.55)",
              padding: `${6 * u}px ${14 * u}px`,
              letterSpacing: -0.5,
            }}
          >
            {texto.slice(0, n)}
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>▍</span>
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  if (estilo === "impacto") {
    const w = bloco.palavras[0];
    const s = spring({
      frame: frame - w.ini,
      fps,
      config: { damping: 9, stiffness: 260, mass: 0.6 },
    });
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top:
              tl.legenda.altura != null ? `${tl.legenda.altura * 100}%` : TOPO[tl.legenda.posicao],
            transform: `translateY(-50%) scale(${interpolate(s, [0, 1], [1.6, 1])})`,
            fontFamily: f("Anton", "Impact, sans-serif"),
            fontSize: 150 * u,
            lineHeight: 0.95,
            color: destaques.has(w.idx) ? m.destaque : m.texto,
            textTransform: "uppercase",
            WebkitTextStroke: `${3 * u}px rgba(0,0,0,.85)`,
            textShadow: "0 10px 40px rgba(0,0,0,.5)",
            maxWidth: "86%",
            textAlign: "center",
          }}
        >
          <Marcado texto={w.texto} destaque={{ color: m.destaque }} escala={u} />
        </div>
      </AbsoluteFill>
    );
  }

  if (estilo === "neon") {
    return (
      <AbsoluteFill>
        <div style={base}>
          {bloco.palavras.map((w) => {
            const on = ativa(w) || destaques.has(w.idx);
            return (
              <span
                key={w.idx}
                style={{
                  fontFamily: f(m.fonteTitulo),
                  fontWeight: 800,
                  fontSize: 66 * u,
                  lineHeight: 1.1,
                  color: on ? "#0B0B0F" : m.texto,
                  background: on ? m.destaque : "transparent",
                  padding: on ? `0 ${10 * u}px` : 0,
                  borderRadius: 10 * u,
                  textShadow: on ? "none" : "0 3px 18px rgba(0,0,0,.6)",
                }}
              >
                <Marcado texto={w.texto} destaque={{ color: m.destaque }} escala={u} />
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (estilo === "simples") {
    // Legenda comum: frase em letra normal, branca, contorno fino. Sem pulo nem pílula.
    const surge = interpolate(frame - bloco.ini, [0, 3], [0, 1], { extrapolateRight: "clamp" });
    return (
      <AbsoluteFill>
        <div
          style={{
            ...base,
            left: "9%",
            right: "9%",
            transform: "translateY(-50%)",
            opacity: surge,
            gap: `${4 * u}px ${12 * u}px`,
          }}
        >
          {bloco.palavras.map((w) => (
            <span
              key={w.idx}
              style={{
                fontFamily: f(m.fonteLegenda),
                fontWeight: 600,
                fontSize: 54 * u,
                lineHeight: 1.22,
                color: destaques.has(w.idx) ? m.destaque : "#FFFFFF",
                WebkitTextStroke: `${1.6 * u}px rgba(0,0,0,.85)`,
                paintOrder: "stroke fill",
                textShadow: `0 ${2 * u}px ${10 * u}px rgba(0,0,0,.55)`,
              }}
            >
              <Marcado texto={w.texto} destaque={{ color: m.destaque }} escala={u} />
            </span>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  // karaoke (padrão): caixa alta pesada, palavra da vez numa pílula.
  return (
    <AbsoluteFill>
      <div style={base}>
        {bloco.palavras.map((w) => {
          const on = ativa(w);
          const pulo = on
            ? spring({
                frame: frame - w.ini,
                fps,
                config: { damping: 12, stiffness: 300, mass: 0.4 },
              })
            : 1;
          const realce = destaques.has(w.idx);
          return (
            <span
              key={w.idx}
              style={{
                fontFamily: f("Montserrat"),
                fontWeight: 900,
                fontSize: (realce ? 80 : 68) * u,
                lineHeight: 1.08,
                textTransform: "uppercase",
                color: on ? "#0B0B0F" : realce ? m.destaque : m.texto,
                background: on ? m.destaque : "transparent",
                borderRadius: 12 * u,
                padding: `0 ${10 * u}px`,
                transform: `scale(${on ? interpolate(pulo, [0, 1], [1.18, 1.05]) : 1}) rotate(${on ? -1.5 : 0}deg)`,
                WebkitTextStroke: on ? "0" : `${2.5 * u}px rgba(0,0,0,.9)`,
                paintOrder: "stroke fill",
                textShadow: on ? "none" : "0 6px 24px rgba(0,0,0,.55)",
              }}
            >
              <Marcado texto={w.texto} destaque={{ color: m.destaque }} escala={u} />
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
