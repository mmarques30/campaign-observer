// Kit das referências (nov/2026): engenharia reversa de 12 Reels (kalylsfilms, kallawaymarketing,
// gen.figgy, laraacostar, david_knowsai, abigaildaniellla, celfstudies, ignaciovasconez, dash.werk).
// Cada efeito reproduz um recurso visto nos quadros: título de cartaz empilhado (com pincel e
// atrás da cabeça), tela tripla de b-roll, carrossel de telas em fundo de cor, capítulo colorido,
// painel escuro com a pessoa num card no rodapé e cartela de cor granulada de transição.
// Cores sempre partem da marca (marca.destaque/primaria/texto); a referência dá a forma.
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { Marcado } from "../marcacao";
import { lista, Midia, ruido, u, useEntradaSaida, type EfeitoProps } from "./base";
import { Pessoa } from "./recorte";

/** Altura (0–1) do rosto no quadro, para recortes do próprio vídeo não cortarem a cabeça. */
function focoRosto(ctx: EfeitoProps["ctx"]) {
  const r = ctx.tl.rosto;
  // objectPosition y: 0% = topo do vídeo visível. O rosto um pouco acima do centro da faixa.
  return r ? Math.max(0, Math.min(1, (r.y + r.h * 0.4 - 0.18) / 0.76)) : 0.25;
}

/** Pisca nos primeiros quadros (flicker de cartaz): alterna visível/invisível de forma determinística. */
function piscar(frame: number, ligado: boolean, semente = 1) {
  if (!ligado || frame > 9) return 1;
  return ruido(frame * 7 + semente) > 0.45 ? 1 : 0;
}

// ─── Título de cartaz ─────────────────────────────────────────────────────────
// Linhas empilhadas em fonte condensada pesada, alternando duas cores; uma linha começando com
// "~" vira sobreposição a pincel (branca, inclinada, por cima da junção das linhas).
export function TituloCartaz({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const linhas = lista(p.linhas ?? p.texto, ["SEU", "TÍTULO"]).slice(0, 4);
  const cores = lista(p.cores, [m.destaque, m.texto]);
  const topo = Number(p.altura ?? 0.05);
  const fortes = linhas.filter((l) => !l.startsWith("~") && !l.startsWith("^"));
  const maior = Math.max(1, ...fortes.map((l) => l.length));
  // Anton tem ~0,46 em de largura por caractere: a linha mais longa ocupa ~88% da largura.
  const tam0 = Math.min(230 * k, (width * 0.88) / (maior * 0.46));
  // Sem a pessoa recortada não há como passar por trás da cabeça: o título encolhe para caber
  // acima do rosto (nunca por cima dele). Com recorte + atras, fica grande e a cabeça cobre.
  const atrasDeVerdade = !!p.atras && !!ctx.recorteUrl;
  const rosto = ctx.tl.rosto ?? null;
  const nPincel = linhas.length - fortes.length;
  const alturaEst = (k0: number) => fortes.length * k0 * 0.92 + nPincel * k0 * 0.5;
  let escala = 1;
  if (!atrasDeVerdade && rosto) {
    const livre = (rosto.y - 0.015 - topo) * height;
    if (livre > 0 && alturaEst(tam0) > livre) escala = Math.max(0.5, livre / alturaEst(tam0));
  }
  const tam = tam0 * escala;
  let iForte = 0;
  const conteudo = (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: topo * height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {linhas.map((l, i) => {
        const pincel = l.startsWith("~") || l.startsWith("^");
        const caligrafia = l.startsWith("^");
        const atraso = Math.round(i * fps * 0.1);
        const s = spring({
          frame: frame - atraso,
          fps,
          config: { damping: 11, stiffness: 260, mass: 0.6 },
        });
        const vis = frame >= atraso ? piscar(frame - atraso, !!p.piscar, i + 1) : 0;
        if (pincel)
          return (
            <div
              key={i}
              style={{
                fontFamily: caligrafia
                  ? f("Great Vibes", "cursive")
                  : f("Permanent Marker", "cursive"),
                fontSize: Math.min(tam * 0.95, (width * 0.8) / Math.max(4, l.length * 0.62)),
                lineHeight: 0.9,
                margin: `${-tam * 0.42}px 0 ${-tam * 0.12}px`,
                color: p.corPincel ?? "#FFFFFF",
                transform: `rotate(-6deg) scale(${interpolate(s, [0, 1], [1.4, 1])})`,
                opacity: Math.min(1, s * 1.3) * vis,
                textShadow: `0 ${6 * k}px ${22 * k}px rgba(0,0,0,.55)`,
                zIndex: 2,
                whiteSpace: "nowrap",
              }}
            >
              {l.slice(1).trim()}
            </div>
          );
        const cor = cores[iForte++ % cores.length];
        return (
          <div
            key={i}
            style={{
              fontFamily: f("Anton", "Impact, sans-serif"),
              fontSize: tam,
              lineHeight: 0.92,
              letterSpacing: -1 * k,
              textTransform: "uppercase",
              color: cor,
              transform: `scale(${interpolate(s, [0, 1], [1.35, 1])})`,
              opacity: Math.min(1, s * 1.4) * vis,
              textShadow: `0 ${8 * k}px ${30 * k}px rgba(0,0,0,.35)`,
              whiteSpace: "nowrap",
            }}
          >
            <Marcado texto={l} destaque={{ color: cores[1] ?? m.texto }} escala={k} />
          </div>
        );
      })}
    </div>
  );
  // "atras": o título passa por trás da cabeça (precisa da pessoa recortada).
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      {conteudo}
      {atrasDeVerdade ? <Pessoa ctx={ctx} dur={dur} /> : null}
    </AbsoluteFill>
  );
}

// ─── Tela tripla ──────────────────────────────────────────────────────────────
// Três faixas horizontais de b-roll empilhadas (split frame), com fio preto entre elas.
export function TelaTripla({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const midias = lista(p.midias).slice(0, 3);
  const tempos: number[] = Array.isArray(p.tempos) ? p.tempos.map(Number) : [];
  const faixas = Array.from({ length: 3 }, (_, i) => ({
    midia: midias[i],
    tempo: tempos[i] ?? (midias[i] ? undefined : ctx.deFonte + i * 1.5),
  }));
  const fio = 6 * k;
  const h = (height - fio * 2) / 3;
  return (
    <AbsoluteFill style={{ background: "#000", opacity: saida }}>
      {faixas.map((fx, i) => {
        const s = spring({
          frame: frame - i * 3,
          fps,
          config: { damping: 18, stiffness: 160, mass: 0.7 },
        });
        const lado = i % 2 === 0 ? -1 : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: i * (h + fio),
              width,
              height: h,
              overflow: "hidden",
              transform: `translateX(${interpolate(s, [0, 1], [lado * width * 0.4, 0])}px)`,
              opacity: Math.min(1, s * 1.5),
            }}
          >
            <Midia
              ctx={ctx}
              midia={fx.midia}
              tempo={fx.tempo}
              style={{
                transform: "scale(1.05)",
                transformOrigin: `50% ${focoRosto(ctx) * 100}%`,
                objectPosition: fx.midia ? undefined : `50% ${focoRosto(ctx) * 100}%`,
                filter: p.pb ? "grayscale(1) contrast(1.1)" : "",
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ─── Carrossel de telas ───────────────────────────────────────────────────────
// Fundo de cor cheia com telas verticais (cards 9:16) deslizando; opcional piscar a cor entre trocas.
export function Carrossel({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur);
  const fundo = String(p.fundo ?? ctx.tl.marca.destaque);
  const midias = lista(p.midias).slice(0, 6);
  const tempos: number[] = Array.isArray(p.tempos) ? p.tempos.map(Number) : [];
  const n = Math.max(1, midias.length || tempos.length || 3);
  const cw = width * 0.5,
    ch = cw * (16 / 9);
  const gap = 28 * k;
  // Desliza da direita para a esquerda ao longo do efeito, um card por vez no centro.
  const passo = cw + gap;
  const t = interpolate(frame, [0, Math.max(1, dur - 6)], [0, (n - 1) * passo], {
    extrapolateRight: "clamp",
  });
  const corte = Math.floor(frame / Math.max(1, Math.round(dur / n)));
  const flash = p.piscar && frame % Math.max(1, Math.round(dur / n)) < 2 && corte > 0;
  return (
    <AbsoluteFill style={{ background: fundo, opacity: Math.min(entrada * 1.4, saida) }}>
      {!flash &&
        Array.from({ length: n }, (_, i) => {
          const x = width / 2 - cw / 2 + i * passo - t;
          const dist = Math.abs(x + cw / 2 - width / 2) / width;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: (height - ch) / 2,
                width: cw,
                height: ch,
                borderRadius: 18 * k,
                overflow: "hidden",
                boxShadow: `0 ${24 * k}px ${70 * k}px rgba(0,0,0,.45)`,
                transform: `scale(${interpolate(dist, [0, 0.6], [1, 0.9], { extrapolateRight: "clamp" })})`,
              }}
            >
              <Midia
                ctx={ctx}
                midia={midias[i]}
                tempo={tempos[i] ?? ctx.deFonte + i * 1.2}
                style={midias[i] ? undefined : { objectPosition: `50% ${focoRosto(ctx) * 100}%` }}
              />
            </div>
          );
        })}
    </AbsoluteFill>
  );
}

// ─── Capítulo colorido ────────────────────────────────────────────────────────
// "1. COLOR": número + palavra com cada letra numa cor (paleta doce), entrando letra a letra.
export function CapituloColorido({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const num = p.numero != null ? `${p.numero}.` : "";
  const texto = String(p.texto ?? "TÍTULO").toUpperCase();
  const paleta = lista(p.paleta, [m.destaque, "#FFFFFF", "#F9D56E", "#9AD7F5", "#F7A6C8"]);
  const tam = Math.min(120 * k, (width * 0.86) / Math.max(4, (num + texto).length * 0.62));
  const letras = [
    ...(num ? [...num.split("").map((c) => ({ c, cor: m.destaque })), { c: " ", cor: "" }] : []),
    ...texto.split("").map((c, i) => ({ c, cor: paleta[i % paleta.length] })),
  ];
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          top: Number(p.altura ?? 0.1) * height,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          fontFamily: f("Archivo Black"),
          fontSize: tam,
          lineHeight: 1,
        }}
      >
        {letras.map((l, i) => {
          const s = spring({
            frame: frame - i * 1.5,
            fps,
            config: { damping: 8, stiffness: 240, mass: 0.5 },
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                color: l.cor,
                WebkitTextStroke: `${3 * k}px rgba(0,0,0,.18)`,
                paintOrder: "stroke fill",
                textShadow: `0 ${6 * k}px ${18 * k}px rgba(0,0,0,.3)`,
                transform: `translateY(${interpolate(s, [0, 1], [40 * k, 0])}px) scale(${interpolate(s, [0, 1], [0.4, 1])})`,
                opacity: Math.min(1, s * 1.5),
              }}
            >
              {l.c}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ─── Painel escuro ────────────────────────────────────────────────────────────
// Layout "dashboard editorial": fundo escuro, título (bold + *itálico serifado*) e um grafismo no
// alto; a pessoa vai para um card no rodapé (o Reel encolhe o vídeo base para o card).
export const CARD_PAINEL = { x: 0.06, y: 0.7, w: 0.88, h: 0.27, raio: 22 };

function TituloMisto({ texto, k, cor }: { texto: string; k: number; cor: string }) {
  // *trecho* sai em serifada itálica; o resto em sans pesada.
  const partes = texto.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <div
      style={{
        textAlign: "center",
        color: cor,
        fontSize: 64 * k,
        lineHeight: 1.04,
        letterSpacing: -1.5 * k,
      }}
    >
      {partes.map((pt, i) =>
        pt.startsWith("*") ? (
          <span
            key={i}
            style={{
              fontFamily: f("Instrument Serif", "serif"),
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 72 * k,
              letterSpacing: 0,
            }}
          >
            {pt.slice(1, -1)}
          </span>
        ) : (
          <span key={i} style={{ fontFamily: f("Inter"), fontWeight: 800 }}>
            {pt}
          </span>
        ),
      )}
    </div>
  );
}

export function Painel({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const acento = String(p.cor ?? m.destaque);
  const itens = lista(p.itens).slice(0, 5);
  const modo = String(p.modo ?? "lista");
  const ent = (i: number, atraso = 0.12) =>
    spring({
      frame: frame - Math.round((0.25 + i * atraso) * fps),
      fps,
      config: { damping: 16, stiffness: 150, mass: 0.7 },
    });
  const area = { top: 0.17 * height, bottom: (CARD_PAINEL.y - 0.03) * height };
  const alturaArea = area.bottom - area.top;
  const cartao: React.CSSProperties = {
    background: "rgba(255,255,255,.06)",
    border: `${1.5 * k}px solid rgba(255,255,255,.12)`,
    borderRadius: 16 * k,
    color: "#EDEDED",
    fontFamily: f("Inter"),
    fontWeight: 600,
    fontSize: 44 * k,
    backdropFilter: "blur(10px)",
  };

  let grafismo: React.ReactNode = null;
  if (modo === "linha-do-tempo") {
    const y = area.top + alturaArea * 0.45;
    const passo = (width * 0.66) / Math.max(1, itens.length - 1);
    const ativo = Math.min(
      itens.length - 1,
      Math.floor(
        interpolate(frame, [fps * 0.4, dur - 6], [0, itens.length], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      ),
    );
    grafismo = (
      <>
        <div
          style={{
            position: "absolute",
            left: width * 0.17,
            top: y,
            height: 3 * k,
            width: width * 0.66 * Math.min(1, ent(0) * 1.1),
            background: "rgba(255,255,255,.35)",
          }}
        />
        {itens.map((it, i) => {
          const s = ent(i, 0.18);
          const on = i === ativo;
          return (
            <div
              key={i}
              style={{ position: "absolute", left: width * 0.17 + i * passo, top: y, opacity: s }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -16 * k,
                  top: -15 * k,
                  width: 32 * k,
                  height: 32 * k,
                  borderRadius: "50%",
                  background: on ? acento : "#2A2A2E",
                  border: `${3 * k}px solid ${acento}`,
                  boxShadow: on ? `0 0 ${30 * k}px ${acento}` : undefined,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  transform: "translateX(-50%)",
                  top: -130 * k,
                  whiteSpace: "nowrap",
                  fontFamily: f("Inter"),
                  fontWeight: 800,
                  fontSize: (on ? 92 : 60) * k,
                  color: on ? "#FFFFFF" : "rgba(255,255,255,.45)",
                }}
              >
                {it}
              </div>
            </div>
          );
        })}
      </>
    );
  } else if (modo === "mapa") {
    const cx = width * 0.26,
      cy = area.top + alturaArea * 0.5;
    const r = 130 * k;
    const s0 = ent(0);
    grafismo = (
      <>
        <div
          style={{
            position: "absolute",
            left: cx - r,
            top: cy - r,
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, ${acento}, color-mix(in srgb, ${acento} 35%, #000))`,
            boxShadow: `0 0 ${60 * k}px ${acento}80`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "#FFF",
            fontFamily: f("Inter"),
            fontWeight: 800,
            fontSize: 34 * k,
            padding: 18 * k,
            boxSizing: "border-box",
            transform: `scale(${s0})`,
          }}
        >
          {String(p.centro ?? "")}
        </div>
        {itens.map((it, i) => {
          const s = ent(i + 1, 0.15);
          const n = itens.length;
          const y = area.top + (alturaArea * (i + 0.5)) / n - 32 * k;
          return (
            <div key={i}>
              <svg
                style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
                width={width}
                height={height}
              >
                <path
                  d={`M ${cx + r} ${cy} C ${cx + r + 80 * k} ${cy}, ${width * 0.5} ${y + 32 * k}, ${width * 0.56} ${y + 32 * k}`}
                  stroke="rgba(255,255,255,.4)"
                  strokeWidth={2.5 * k}
                  fill="none"
                  strokeDasharray={600 * k}
                  strokeDashoffset={600 * k * (1 - s)}
                />
              </svg>
              <div
                style={{
                  ...cartao,
                  position: "absolute",
                  left: width * 0.56,
                  top: y,
                  width: width * 0.38,
                  padding: `${14 * k}px ${20 * k}px`,
                  boxSizing: "border-box",
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [40 * k, 0])}px)`,
                }}
              >
                {it}
              </div>
            </div>
          );
        })}
      </>
    );
  } else if (modo === "documento") {
    const texto = itens.join(" ");
    const nch = Math.round(
      interpolate(frame, [fps * 0.4, Math.max(fps, dur * 0.8)], [0, texto.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
    grafismo = (
      <div
        style={{
          ...cartao,
          position: "absolute",
          left: width * 0.16,
          top: area.top + alturaArea * 0.04,
          width: width * 0.68,
          height: alturaArea * 0.92,
          padding: 30 * k,
          boxSizing: "border-box",
          fontSize: 42 * k,
          lineHeight: 1.35,
          fontWeight: 500,
          opacity: ent(0),
          transform: `translateY(${interpolate(ent(0), [0, 1], [40 * k, 0])}px)`,
        }}
      >
        {texto.slice(0, nch)}
        <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color: acento }}>▍</span>
      </div>
    );
  } else {
    // lista: cards de vidro escuro empilhados com marcador na cor de destaque
    grafismo = (
      <div
        style={{
          position: "absolute",
          left: width * 0.1,
          right: width * 0.1,
          top: area.top,
          height: alturaArea,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22 * k,
        }}
      >
        {itens.map((it, i) => {
          const s = ent(i);
          return (
            <div
              key={i}
              style={{
                ...cartao,
                display: "flex",
                alignItems: "center",
                gap: 22 * k,
                padding: `${26 * k}px ${30 * k}px`,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [60 * k, 0])}px)`,
              }}
            >
              <span
                style={{
                  width: 16 * k,
                  height: 16 * k,
                  borderRadius: "50%",
                  background: acento,
                  boxShadow: `0 0 ${16 * k}px ${acento}`,
                  flex: "none",
                }}
              />
              {it}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: width * 0.06,
          right: width * 0.06,
          top: 0.055 * height,
          opacity: entrada,
          transform: `translateY(${interpolate(entrada, [0, 1], [-30 * k, 0])}px)`,
        }}
      >
        <TituloMisto texto={String(p.titulo ?? "")} k={k} cor="#FFFFFF" />
      </div>
      {grafismo}
    </AbsoluteFill>
  );
}

// ─── Cartela de cor ───────────────────────────────────────────────────────────
// Transição: tela cheia de cor com grão e clarão branco no topo (0,4–1s), entrando num flash.
export function Cartela({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const { frame } = useEntradaSaida(dur);
  const cor = String(p.cor ?? ctx.tl.marca.destaque);
  const vis = interpolate(frame, [0, 2, dur - 3, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sem = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <AbsoluteFill style={{ background: cor }} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 38%)",
        }}
      />
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.55 }}
      >
        <filter id={`grao-${sem}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={sem} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grao-${sem})`} />
      </svg>
      {p.texto ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: f("Anton", "Impact"),
              fontSize: 150 * u(width),
              color: "#FFFFFF",
              textTransform: "uppercase",
              textShadow: "0 10px 40px rgba(0,0,0,.35)",
            }}
          >
            {String(p.texto)}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}
