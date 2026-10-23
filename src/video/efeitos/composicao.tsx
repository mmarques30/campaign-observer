// Composição livre: o Claude desenha o layout do momento (textos, cards, molduras, brilhos, ícones,
// mídia) com fonte, cor, posição e animação próprias. É o que permite reproduzir referências que não
// cabem nos efeitos prontos. Posições em fração do quadro (0–1), então serve a 9:16, 4:5 e 1:1.
// Nenhum elemento fica em cima do rosto: se cair na zona do rosto, é empurrado para cima ou para baixo.
import { AbsoluteFill, Img, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { Marcado } from "../marcacao";
import { Midia, u, useEntradaSaida, type EfeitoProps } from "./base";
import { urlIcone } from "./icones";
import { Pessoa } from "./recorte";

type Caixa = { x: number; y: number; w: number; h: number };

/** Empurra a caixa (fração do quadro) para fora da zona do rosto, para o lado com mais espaço. */
export function desviarDoRosto(c: Caixa, rosto?: Caixa | null): Caixa {
  if (!rosto) return c;
  const cruza =
    c.x < rosto.x + rosto.w &&
    c.x + c.w > rosto.x &&
    c.y < rosto.y + rosto.h &&
    c.y + c.h > rosto.y;
  if (!cruza) return c;
  const acima = rosto.y; // espaço livre acima do rosto
  const abaixo = 1 - (rosto.y + rosto.h);
  if (abaixo >= c.h || abaixo >= acima)
    return { ...c, y: Math.min(1 - c.h, rosto.y + rosto.h + 0.01) };
  return { ...c, y: Math.max(0, rosto.y - c.h - 0.01) };
}

type Elemento = {
  tipo?: "texto" | "caixa" | "icone" | "midia" | "brilho" | "linha";
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  texto?: string;
  fonte?: string;
  peso?: number;
  tamanho?: number; // px num quadro de 1080 de largura
  cor?: string;
  destaque?: string;
  maiusculas?: boolean;
  espacamento?: number; // letter-spacing em px
  alinhar?: "esquerda" | "centro" | "direita";
  fundo?: string; // cor/gradiente CSS
  borda?: string; // cor da borda
  raio?: number;
  sombra?: boolean;
  vidro?: boolean; // desfoque do que está atrás
  brilho?: string; // cor do glow
  giro?: number; // rotação no plano (graus)
  giroY?: number; // inclinação 3D (graus)
  giroX?: number;
  opacidade?: number;
  icone?: string;
  midia?: string;
  entrada?:
    | "sobe"
    | "desce"
    | "esquerda"
    | "direita"
    | "zoom"
    | "fade"
    | "pop"
    | "desfoque"
    | "digita"
    | "nenhuma";
  atraso?: number; // segundos depois do início do efeito
  flutuar?: boolean;
  livreDoRosto?: boolean; // false = pode ficar sobre o rosto (raro)
};

function animacao(el: Elemento, frame: number, fps: number, k: number) {
  const atraso = Math.round((el.atraso ?? 0) * fps);
  const s = spring({
    frame: frame - atraso,
    fps,
    config:
      el.entrada === "pop"
        ? { damping: 9, stiffness: 220, mass: 0.6 }
        : { damping: 16, stiffness: 150, mass: 0.7 },
  });
  const d = 90 * k;
  let transform = "";
  let filter = "";
  switch (el.entrada ?? "sobe") {
    case "sobe":
      transform = `translateY(${interpolate(s, [0, 1], [d, 0])}px)`;
      break;
    case "desce":
      transform = `translateY(${interpolate(s, [0, 1], [-d, 0])}px)`;
      break;
    case "esquerda":
      transform = `translateX(${interpolate(s, [0, 1], [-d * 1.5, 0])}px)`;
      break;
    case "direita":
      transform = `translateX(${interpolate(s, [0, 1], [d * 1.5, 0])}px)`;
      break;
    case "zoom":
    case "pop":
      transform = `scale(${interpolate(s, [0, 1], [0.6, 1])})`;
      break;
    case "desfoque":
      filter = `blur(${interpolate(s, [0, 1], [18 * k, 0])}px)`;
      break;
  }
  const opacidade = el.entrada === "nenhuma" ? (frame >= atraso ? 1 : 0) : Math.min(1, s * 1.2);
  return { s, transform, filter, opacidade, atraso };
}

export function Composicao({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const rosto = ctx.tl.rosto ?? null;
  const els: Elemento[] = Array.isArray(p.elementos) ? p.elementos.slice(0, 14) : [];

  const fundo = p.fundo as string | undefined;
  const camadaFundo =
    fundo === "escurecer" ? (
      <AbsoluteFill style={{ background: `rgba(0,0,0,${0.55 * entrada})` }} />
    ) : fundo === "desfocar" ? (
      <AbsoluteFill
        style={{
          backdropFilter: `blur(${14 * entrada}px) brightness(${1 - 0.35 * entrada})`,
          WebkitBackdropFilter: `blur(${14 * entrada}px) brightness(${1 - 0.35 * entrada})`,
        }}
      />
    ) : fundo && fundo !== "nenhum" ? (
      <AbsoluteFill style={{ background: fundo, opacity: entrada }} />
    ) : null;

  const camada = (
    <AbsoluteFill style={{ perspective: 1500 * k, opacity: saida }}>
      {camadaFundo}
      {els.map((el, i) => {
        const tipo = el.tipo ?? "texto";
        let caixa: Caixa = {
          x: el.x ?? 0.08,
          y: el.y ?? 0.1,
          w: el.w ?? 0.84,
          h: el.h ?? (tipo === "texto" ? ((el.tamanho ?? 64) * 1.3 * k) / height : 0.12),
        };
        if (el.livreDoRosto !== false && tipo !== "brilho") caixa = desviarDoRosto(caixa, rosto);
        const a = animacao(el, frame, fps, k);
        const flutua = el.flutuar ? Math.sin((frame + i * 13) / (fps * 0.9)) * 9 * k : 0;
        const base: React.CSSProperties = {
          position: "absolute",
          left: caixa.x * width,
          top: caixa.y * height,
          width: caixa.w * width,
          height: tipo === "texto" ? undefined : caixa.h * height,
          opacity: a.opacidade * (el.opacidade ?? 1),
          transform: `${a.transform} translateY(${flutua}px) rotate(${el.giro ?? 0}deg) rotateY(${el.giroY ?? 0}deg) rotateX(${el.giroX ?? 0}deg)`,
          filter: a.filter || undefined,
          borderRadius: (el.raio ?? (tipo === "texto" ? 0 : 24)) * k,
          background: el.fundo,
          border: el.borda ? `${Math.max(1, 2 * k)}px solid ${el.borda}` : undefined,
          boxShadow:
            [
              el.sombra ? `0 ${30 * k}px ${90 * k}px rgba(0,0,0,.5)` : "",
              el.brilho ? `0 0 ${70 * k}px ${el.brilho}` : "",
            ]
              .filter(Boolean)
              .join(", ") || undefined,
          backdropFilter: el.vidro ? "blur(22px) saturate(140%)" : undefined,
          WebkitBackdropFilter: el.vidro ? "blur(22px) saturate(140%)" : undefined,
          overflow: tipo === "midia" ? "hidden" : undefined,
        };

        if (tipo === "brilho")
          return (
            <div
              key={i}
              style={{
                ...base,
                background: `radial-gradient(closest-side, ${el.cor ?? m.primaria}, transparent)`,
                filter: `blur(${30 * k}px)`,
                borderRadius: "50%",
                boxShadow: undefined,
              }}
            />
          );
        if (tipo === "linha")
          return (
            <div
              key={i}
              style={{
                ...base,
                height: Math.max(2, (el.tamanho ?? 4) * k),
                background: el.cor ?? m.destaque,
                transformOrigin: "left center",
                transform: `${base.transform} scaleX(${a.s})`,
              }}
            />
          );
        if (tipo === "midia")
          return (
            <div key={i} style={base}>
              <Midia ctx={ctx} midia={el.midia} />
            </div>
          );
        if (tipo === "icone") {
          const url = el.icone ? urlIcone(el.icone) : null;
          return (
            <div
              key={i}
              style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {url && (
                <Img src={url} style={{ width: "72%", height: "72%", objectFit: "contain" }} />
              )}
            </div>
          );
        }
        // texto (com ou sem caixa por trás) e caixa com texto dentro
        const txt = String(el.texto ?? "");
        const n =
          el.entrada === "digita"
            ? Math.round(
                interpolate(frame - a.atraso, [0, fps * 0.8], [0, txt.length], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              )
            : txt.length;
        return (
          <div
            key={i}
            style={{
              ...base,
              display: "flex",
              alignItems: "center",
              justifyContent:
                el.alinhar === "direita"
                  ? "flex-end"
                  : el.alinhar === "esquerda"
                    ? "flex-start"
                    : "center",
              padding: tipo === "caixa" || el.fundo ? `${18 * k}px ${24 * k}px` : 0,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontFamily: f(el.fonte ?? m.fonteTitulo),
                fontWeight: el.peso ?? 800,
                fontSize: (el.tamanho ?? (tipo === "caixa" ? 36 : 64)) * k,
                lineHeight: 1.08,
                letterSpacing: (el.espacamento ?? 0) * k,
                color: el.cor ?? m.texto,
                textAlign:
                  el.alinhar === "direita"
                    ? "right"
                    : el.alinhar === "esquerda"
                      ? "left"
                      : "center",
                textTransform: el.maiusculas ? "uppercase" : undefined,
                textShadow: el.fundo ? undefined : "0 4px 24px rgba(0,0,0,.45)",
                width: "100%",
                whiteSpace: "pre-line",
              }}
            >
              <Marcado
                texto={txt.slice(0, n)}
                destaque={{ color: el.destaque ?? m.destaque }}
                escala={k}
              />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );

  return p.atras && ctx.recorteUrl ? (
    <AbsoluteFill>
      {camada}
      <Pessoa ctx={ctx} dur={dur} />
    </AbsoluteFill>
  ) : (
    camada
  );
}
