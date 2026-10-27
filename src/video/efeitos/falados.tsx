// Efeitos presos à fala e ao gesto de quem grava:
// - NotaDeVoz: a fala vira um áudio tocando (player com onda andando, tempo correndo e a
//   transcrição aparecendo dentro do balão). A voz troca para timbre de áudio de celular no Reel.
// - ListaApontada: cada item aparece onde a pessoa aponta (ícone + situação + etapa),
//   no instante em que ela fala dele.
import { AbsoluteFill, Img, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { paraFonte, paraSaida } from "../tempo";
import { ICONES } from "./icones";
import { ICONES_PH, LADO_PH } from "./icones-ph";
import { ruido, u, useEntradaSaida, type EfeitoCtx, type EfeitoProps } from "./base";

/** "#a3cb20" + alfa → rgba(). Aceita #rgb e #rrggbb; outra coisa volta como está. */
export function comAlfa(cor: string, a: number) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(cor.trim());
  if (!m) return cor;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Ícone monocromático da Iconify na cor pedida (nome curto da lista ou id "prefixo:nome"). */
export function iconeNaCor(nome: string, cor: string) {
  const id = ICONES[nome.toLowerCase()] ?? nome;
  const [pre, ...resto] = id.split(":");
  if (!resto.length) return null;
  return `https://api.iconify.design/${pre}/${resto.join(":")}.svg?height=128&color=${encodeURIComponent(cor)}`;
}

/** Ícone na cor pedida: os Phosphor embutidos viram SVG inline (sem rede); outros vêm da Iconify. */
export function IconeCor({ nome, cor, tamanho }: { nome: string; cor: string; tamanho: number }) {
  const id = (ICONES[nome.toLowerCase()] ?? nome).replace(/^ph:/, "");
  const corpo = ICONES_PH[id] ?? ICONES_PH[`${id}-bold`];
  if (corpo)
    return (
      <svg
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${LADO_PH} ${LADO_PH}`}
        style={{ color: cor, display: "block" }}
        dangerouslySetInnerHTML={{ __html: corpo }}
      />
    );
  const url = iconeNaCor(nome, cor);
  return url ? (
    <Img
      src={url}
      onError={() => console.warn("[vedit] ícone não encontrado", nome)}
      style={{ width: tamanho, height: tamanho, objectFit: "contain" }}
    />
  ) : null;
}

/** Palavras faladas dentro da janela do efeito, com o tempo de SAÍDA (s) de cada uma. */
function palavrasDaJanela(ctx: EfeitoCtx, t0: number, t1: number) {
  const corr = ctx.tl.legenda.correcoes;
  return ctx.palavras
    .map((w, idx) => ({ w, idx }))
    .filter(
      ({ w }) =>
        ctx.trechos.length === 0 ||
        ctx.trechos.some((t) => w.i + 0.02 >= t.de && w.f - 0.02 <= t.ate),
    )
    .map(({ w, idx }) => ({
      texto: (corr[String(idx)] ?? w.p).trim(),
      ini: paraSaida(ctx.trechos, w.i),
      fim: paraSaida(ctx.trechos, w.f),
    }))
    .filter((w) => w.texto && w.ini >= t0 - 0.05 && w.ini < t1)
    .sort((a, b) => a.ini - b.ini);
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ─── Nota de voz ─────────────────────────────────────────────────────────
export function NotaDeVoz({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur, { saidaFrames: 8, damping: 17 });
  const m = ctx.tl.marca;
  const t0 = paraSaida(ctx.trechos, ctx.deFonte);
  const total = dur / fps;
  const agora = t0 + frame / fps;
  const prog = Math.min(1, Math.max(0, frame / Math.max(1, dur - 1)));

  const palavras = palavrasDaJanela(ctx, t0, t0 + total);
  const falando = palavras.some((w) => agora >= w.ini && agora <= w.fim + 0.05);
  // Transcrição: o que já foi dito, da última frase (ou das últimas ~14 palavras).
  const ditas = palavras.filter((w) => w.ini <= agora);
  let inicio = 0;
  for (let i = ditas.length - 2; i >= 0; i--)
    if (/[.!?…]$/.test(ditas[i].texto)) {
      inicio = i + 1;
      break;
    }
  const janela = ditas.slice(Math.max(inicio, ditas.length - 14));
  const atual = ditas.length ? ditas[ditas.length - 1] : null;

  const N = 38;
  const alturaMax = 70 * k;
  const pos = p.posicao ?? "inferior";
  const top = height * (pos === "superior" ? 0.1 : pos === "centro" ? 0.38 : 0.6);
  const mostrarTexto = p.transcricao !== false;

  return (
    <AbsoluteFill style={{ opacity: saida, pointerEvents: "none" }}>
      {/* Leve escurecida embaixo do balão para ele "assentar" sem tapar a pessoa. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, transparent ${Math.round((top / height) * 100) - 12}%, ${comAlfa(m.fundo, 0.45 * entrada)} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: width * 0.06,
          right: width * 0.06,
          top,
          padding: `${28 * k}px ${32 * k}px ${mostrarTexto ? 30 * k : 28 * k}px`,
          borderRadius: 46 * k,
          background: comAlfa(m.fundo, 0.86),
          border: `${1.5 * k}px solid ${comAlfa("#ffffff", 0.1)}`,
          boxShadow: `0 ${24 * k}px ${70 * k}px rgba(0,0,0,.45)`,
          backdropFilter: "blur(18px)",
          transform: `translateY(${interpolate(entrada, [0, 1], [70 * k, 0])}px) scale(${interpolate(entrada, [0, 1], [0.94, 1])})`,
          opacity: entrada,
        }}
      >
        {p.rotulo && (
          <div
            style={{
              fontFamily: f(m.fonteLegenda),
              fontWeight: 800,
              fontSize: 22 * k,
              letterSpacing: 3 * k,
              textTransform: "uppercase",
              color: m.destaque,
              marginBottom: 14 * k,
            }}
          >
            {String(p.rotulo)}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 24 * k }}>
          {/* Botão tocando (pausa) */}
          <div
            style={{
              width: 96 * k,
              height: 96 * k,
              borderRadius: "50%",
              background: m.destaque,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12 * k,
              boxShadow: `0 0 0 ${(falando ? 8 + Math.sin(frame / 3) * 4 : 0) * k}px ${comAlfa(m.destaque, 0.18)}`,
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{ width: 11 * k, height: 36 * k, borderRadius: 4 * k, background: m.fundo }}
              />
            ))}
          </div>
          {/* Onda: barras já tocadas na cor de destaque; perto da agulha elas "respiram" com a voz. */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                position: "relative",
                height: alturaMax,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {Array.from({ length: N }, (_, i) => {
                const base = 0.22 + 0.78 * Math.pow(ruido(i * 3.7 + 11), 1.4);
                const pi = i / (N - 1);
                const perto = Math.max(0, 1 - Math.abs(pi - prog) * 9);
                const vivo = falando ? perto * (0.25 + 0.25 * Math.sin(frame / 2.2 + i)) : 0;
                const h = Math.min(1, base + vivo) * alturaMax;
                return (
                  <div
                    key={i}
                    style={{
                      width: 7 * k,
                      height: Math.max(8 * k, h),
                      borderRadius: 4 * k,
                      background: pi <= prog ? m.destaque : comAlfa(m.texto, 0.32),
                    }}
                  />
                );
              })}
              <div
                style={{
                  position: "absolute",
                  left: `calc(${prog * 100}% - ${12 * k}px)`,
                  top: "50%",
                  width: 24 * k,
                  height: 24 * k,
                  marginTop: -12 * k,
                  borderRadius: "50%",
                  background: m.destaque,
                  boxShadow: `0 0 ${14 * k}px ${comAlfa(m.destaque, 0.7)}`,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10 * k,
                fontFamily: f(m.fonteLegenda),
                fontWeight: 600,
                fontSize: 26 * k,
                color: comAlfa(m.texto, 0.62),
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>{mmss(prog * total)}</span>
              <span>{mmss(total)}</span>
            </div>
          </div>
        </div>
        {mostrarTexto && (
          <div
            style={{
              marginTop: 20 * k,
              paddingTop: 20 * k,
              borderTop: `${1.5 * k}px solid ${comAlfa("#ffffff", 0.08)}`,
              fontFamily: f(m.fonteLegenda),
              fontWeight: 600,
              fontSize: 40 * k,
              lineHeight: 1.3,
              color: m.texto,
              minHeight: 52 * 2 * k,
              display: "flex",
              flexWrap: "wrap",
              alignContent: "flex-start",
              columnGap: 11 * k,
            }}
          >
            {janela.map((w, i) => {
              const s = Math.min(1, Math.max(0, (agora - w.ini) / 0.12));
              const eAtual = w === atual && agora <= w.fim + 0.15;
              return (
                <span
                  key={`${w.ini}-${i}`}
                  style={{
                    opacity: 0.35 + 0.65 * s,
                    color: eAtual ? m.destaque : m.texto,
                    transform: `translateY(${(1 - s) * 8 * k}px)`,
                  }}
                >
                  {w.texto}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// ─── Lista apontada ──────────────────────────────────────────────────────
type ItemApontado = {
  texto: string;
  etapa?: string;
  icone?: string;
  de: number; // s do ORIGINAL em que o item entra (quando a fala/gesto começa)
  x?: number; // âncora do card (0–1)
  y?: number;
  lado?: "direita" | "esquerda" | "centro"; // para que lado o card cresce a partir da âncora
  px?: number; // ponta do dedo (0–1): ganha um pulso no instante em que o item entra
  py?: number;
  // Caminho da ponta do dedo: [s do ORIGINAL, x, y] (0–1, quadro sem zoom). Com ele o card
  // anda junto com o dedo (fica logo acima da ponta; abaixo quando não cabe em cima).
  trilha?: [number, number, number][];
};

/** Ponto do dedo no instante (s do original), interpolado entre as amostras da trilha. */
function pontoNaTrilha(tr: [number, number, number][], s: number): [number, number] {
  if (s <= tr[0][0]) return [tr[0][1], tr[0][2]];
  for (let i = 1; i < tr.length; i++)
    if (s <= tr[i][0]) {
      const [ta, xa, ya] = tr[i - 1];
      const [tb, xb, yb] = tr[i];
      const f = tb > ta ? (s - ta) / (tb - ta) : 0;
      return [xa + (xb - xa) * f, ya + (yb - ya) * f];
    }
  const u = tr[tr.length - 1];
  return [u[1], u[2]];
}

/** Leva um ponto do quadro original para a tela, com o zoom/enquadramento deste quadro. */
function comZoom(ctx: EfeitoCtx, x: number, y: number, largura: number): [number, number] {
  const e = ctx.estiloBase;
  if (!e) return [x, y];
  const esc = Number(/scale\(([\d.]+)\)/.exec(e.transform)?.[1] ?? 1) || 1;
  const tx = Number(/translateX\((-?[\d.]+)px\)/.exec(e.transform)?.[1] ?? 0) || 0;
  const [ox, oy] = (e.transformOrigin.match(/-?[\d.]+/g) ?? ["50", "50"]).map(
    (v) => Number(v) / 100,
  );
  return [ox + (x - ox) * esc + tx / largura, oy + (y - oy) * esc];
}

export function ListaApontada({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur, { saidaFrames: 8 });
  const m = ctx.tl.marca;
  const t0 = paraSaida(ctx.trechos, ctx.deFonte);
  const itens = (Array.isArray(p.itens) ? (p.itens as ItemApontado[]) : [])
    .filter((it) => it && it.texto)
    .map((it, i) => ({
      ...it,
      ini: Math.max(
        0,
        Math.round((paraSaida(ctx.trechos, Number(it.de ?? ctx.deFonte)) - t0) * fps),
      ),
      i,
    }))
    .sort((a, b) => a.ini - b.ini);
  const numerar = p.numerar !== false;
  const totalItens = itens.length;
  const ladosPadrao: ItemApontado["lado"][] = ["direita", "esquerda"];

  return (
    <AbsoluteFill style={{ opacity: saida, pointerEvents: "none" }}>
      {itens.map((it, n) => {
        const fim = itens[n + 1]?.ini ?? dur;
        if (frame < it.ini - 1 || frame > fim + 8) return null;
        const g = frame - it.ini;
        const s = spring({ frame: g, fps, config: { damping: 14, stiffness: 200, mass: 0.6 } });
        const sai =
          n < totalItens - 1
            ? interpolate(frame, [fim - 2, fim + 6], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;
        let lado = it.lado ?? ladosPadrao[n % 2];
        let x = Math.min(0.96, Math.max(0.04, Number(it.x ?? (lado === "esquerda" ? 0.46 : 0.54))));
        let y = Math.min(0.9, Math.max(0.06, Number(it.y ?? 0.6)));
        let px = it.px,
          py = it.py;
        // Segue o dedo: o card fica logo acima da ponta (abaixo quando não cabe), centrado nela.
        if (Array.isArray(it.trilha) && it.trilha.length) {
          const agoraFonte = paraFonte(ctx.trechos, t0 + frame / fps);
          const [bx, by] = pontoNaTrilha(it.trilha, agoraFonte);
          [px, py] = comZoom(ctx, bx, by, width);
          const larg =
            ((170 +
              Math.max(String(it.texto).length * 25, String(it.etapa ?? "").length * 18 + 60)) *
              k) /
            width;
          const alt = (140 * k) / height;
          lado = "centro";
          x = Math.min(0.97 - larg / 2, Math.max(0.03 + larg / 2, px));
          y = py - 0.035 - alt / 2 < 0.04 ? py + 0.05 + alt / 2 : py - 0.035 - alt / 2;
          y = Math.min(0.84, y);
        }
        const pos: React.CSSProperties =
          lado === "esquerda"
            ? { right: (1 - x) * width, maxWidth: (x - 0.03) * width }
            : lado === "centro"
              ? { left: x * width, maxWidth: 0.9 * width, translate: "-50% 0" }
              : { left: x * width, maxWidth: (0.97 - x) * width };
        const deX = lado === "esquerda" ? 40 : lado === "direita" ? -40 : 0;
        const temPonto = px != null && py != null;
        const pulso = interpolate(g, [0, fps * 0.9], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div key={it.i} style={{ position: "absolute", inset: 0, opacity: sai }}>
            {temPonto && pulso < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: Number(px) * width - 30 * k,
                  top: Number(py) * height - 30 * k,
                  width: 60 * k,
                  height: 60 * k,
                  borderRadius: "50%",
                  border: `${4 * k}px solid ${m.destaque}`,
                  opacity: 1 - pulso,
                  transform: `scale(${0.4 + pulso * 1.4})`,
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                top: y * height,
                width: "max-content",
                ...pos,
                transform: `translateY(-50%) translateX(${(1 - s) * deX * k}px) scale(${interpolate(s, [0, 1], [0.7, 1])})`,
                transformOrigin:
                  lado === "esquerda"
                    ? "right center"
                    : lado === "direita"
                      ? "left center"
                      : "center",
                opacity: Math.min(1, s * 1.5),
                display: "flex",
                alignItems: "center",
                gap: 20 * k,
                padding: `${20 * k}px ${34 * k}px ${20 * k}px ${20 * k}px`,
                borderRadius: 30 * k,
                background: comAlfa(m.fundo, 0.88),
                border: `${1.5 * k}px solid ${comAlfa("#ffffff", 0.12)}`,
                boxShadow: `0 ${18 * k}px ${50 * k}px rgba(0,0,0,.4)`,
                backdropFilter: "blur(16px)",
              }}
            >
              <div
                style={{
                  width: 96 * k,
                  height: 96 * k,
                  borderRadius: 28 * k,
                  background: m.destaque,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconeCor
                  nome={it.icone ?? "ph:check-circle-bold"}
                  cor={m.fundo}
                  tamanho={56 * k}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                {(it.etapa || numerar) && (
                  <div
                    style={{
                      fontFamily: f(m.fonteLegenda),
                      fontWeight: 800,
                      fontSize: 26 * k,
                      letterSpacing: 3 * k,
                      textTransform: "uppercase",
                      color: m.destaque,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {[numerar ? String(n + 1).padStart(2, "0") : "", it.etapa ?? ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: f(m.fonteLegenda),
                    fontWeight: 700,
                    fontSize: 48 * k,
                    lineHeight: 1.12,
                    color: m.texto,
                  }}
                >
                  {it.texto}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
