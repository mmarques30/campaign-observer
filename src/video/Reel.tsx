import {
  AbsoluteFill,
  Easing,
  Audio,
  getRemotionEnvironment,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useMemo } from "react";
import { garantirFontes } from "./fontes";
import { Legenda } from "./legenda";
import { EFEITO_POR_TIPO } from "./catalogo";
import { urlSom } from "./sons";
import { urlTrilhaBase } from "./trilhas";
import { normalizarTimeline, type ReelProps } from "./schema";
import { janelaFrames, paraSaida, trechosMantidos, type Trecho } from "./tempo";

const FILTRO_LOOK: Record<string, string> = {
  natural: "none",
  quente: "sepia(.14) saturate(1.12) hue-rotate(-6deg) contrast(1.04)",
  frio: "saturate(.92) hue-rotate(8deg) brightness(1.03) contrast(1.03)",
  cinema: "contrast(1.12) saturate(.82) brightness(.97)",
  pb: "grayscale(1) contrast(1.18)",
  vivo: "saturate(1.32) contrast(1.06)",
};

/** Correção de luz/cor em CSS (vale no preview e no render). */
export function filtroCorrecao(v: ReelProps["timeline"]["visual"]) {
  const partes: string[] = [];
  const brilho = v.brilho + v.sombras * 0.12;
  const contraste = v.contraste - v.sombras * 0.12;
  if (brilho !== 1) partes.push(`brightness(${brilho.toFixed(3)})`);
  if (contraste !== 1) partes.push(`contrast(${contraste.toFixed(3)})`);
  if (v.saturacao !== 1) partes.push(`saturate(${v.saturacao.toFixed(3)})`);
  if (v.temperatura > 0) partes.push(`sepia(${(v.temperatura * 0.28).toFixed(3)})`);
  if (v.temperatura < 0)
    partes.push(
      `hue-rotate(${(v.temperatura * -14).toFixed(1)}deg) saturate(${(1 + v.temperatura * 0.08).toFixed(3)})`,
    );
  if (v.nitidez > 0) partes.push("url(#vedit-nitidez)");
  return partes.join(" ");
}

/** Escala de zoom num frame de saída: alternância por trecho + eventos de ênfase. */
function zoomNoFrame(frame: number, fps: number, props: ReelProps, trechos: Trecho[]) {
  const tl = props.timeline;
  let escala = 1;
  let ox = tl.enquadramento.x,
    oy = tl.enquadramento.y;
  if (tl.zoom.alternar && trechos.length > 1) {
    const idx = trechos.findIndex((t, i) => {
      const fim = (trechos[i + 1]?.saidaDe ?? Infinity) * fps;
      return frame >= t.saidaDe * fps && frame < fim;
    });
    if (idx % 2 === 1) escala = 1.12;
  }
  for (const ev of tl.zoom.eventos) {
    const [ini, dur] = janelaFrames(trechos, ev.de, ev.ate, fps);
    if (frame < ini || frame > ini + dur) continue;
    const entra =
      ev.tipo === "soco"
        ? spring({ frame: frame - ini, fps, config: { damping: 18, stiffness: 320 } })
        : interpolate(frame - ini, [0, Math.min(dur, fps * 0.8)], [0, 1], {
            extrapolateRight: "clamp",
          });
    const sai = interpolate(frame, [ini + dur - 4, ini + dur], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    escala *= 1 + (ev.escala - 1) * entra * sai;
    ox = ev.x;
    oy = ev.y;
  }
  return { escala, ox, oy };
}

function Grao({ forca }: { forca: number }) {
  const frame = useCurrentFrame();
  if (forca <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: forca * 0.22, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`grao-${frame % 6}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={frame % 6}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grao-${frame % 6})`} />
      </svg>
    </AbsoluteFill>
  );
}

function Dissolve({
  src,
  trimBefore,
  dur,
  objectPosition,
}: {
  src: string;
  trimBefore: number;
  dur: number;
  objectPosition: string;
}) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(frame, [0, dur], [1, 0], {
          easing: Easing.inOut(Easing.quad),
          extrapolateRight: "clamp",
        }),
      }}
    >
      <OffthreadVideo
        src={src}
        trimBefore={trimBefore}
        muted
        pauseWhenBuffering
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition }}
      />
    </AbsoluteFill>
  );
}

function Transicao({ tipo }: { tipo: string }) {
  const frame = useCurrentFrame();
  if (tipo === "flash")
    return (
      <AbsoluteFill
        style={{
          background: "#fff",
          opacity: interpolate(frame, [0, 4], [0.85, 0], { extrapolateRight: "clamp" }),
        }}
      />
    );
  if (tipo === "glitch") {
    if (frame > 5) return null;
    return (
      <AbsoluteFill style={{ mixBlendMode: "screen" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${(i * 37 + frame * 23) % 90}%`,
              height: `${4 + ((i * 13) % 7)}%`,
              background: i % 2 ? "rgba(255,0,80,.55)" : "rgba(0,255,220,.5)",
              transform: `translateX(${(i % 2 ? 1 : -1) * 40}px)`,
            }}
          />
        ))}
      </AbsoluteFill>
    );
  }
  return null;
}

export function Reel(bruto: ReelProps) {
  garantirFontes();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // O JSON vem do Claude: sempre normaliza (completa defaults) antes de usar.
  const tl = useMemo(() => normalizarTimeline(bruto.timeline).timeline, [bruto.timeline]);
  const props = { ...bruto, timeline: tl };
  const trechos = useMemo(() => trechosMantidos(tl, props.duracaoFonte), [tl, props.duracaoFonte]);

  // Quadros em que alguém está falando (para abaixar a música).
  const falando = useMemo(() => {
    const arr = new Uint8Array(durationInFrames + 1);
    for (const w of props.palavras) {
      const a = Math.max(0, Math.round((paraSaida(trechos, w.i) - 0.15) * fps));
      const b = Math.min(durationInFrames, Math.round((paraSaida(trechos, w.f) + 0.25) * fps));
      for (let i = a; i <= b; i++) arr[i] = 1;
    }
    return arr;
  }, [props.palavras, trechos, fps, durationInFrames]);

  const { escala, ox, oy } = zoomNoFrame(frame, fps, props, trechos);
  // Música: biblioteca/trilhas de base ("trilha:...") ou mídia do projeto.
  const urlMusica = tl.musica.midia
    ? (props.midias[tl.musica.midia] ?? urlTrilhaBase(tl.musica.midia))
    : undefined;
  // Ducking suave: média móvel de ~0,3 s sobre "está falando" (sem degrau no volume).
  const duck = useMemo(() => {
    const alvo = tl.musica.abaixarNaVoz ? tl.musica.abaixarPara : 1;
    const n = durationInFrames;
    const acum = new Float64Array(n + 1); // soma prefixada de "volume alvo" por quadro
    for (let i = 0; i < n; i++) acum[i + 1] = acum[i] + (falando[i] ? alvo : 1);
    const r = Math.round(fps * 0.15);
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - r),
        b = Math.min(n, i + r + 1);
      out[i] = (acum[b] - acum[a]) / (b - a);
    }
    return out;
  }, [falando, durationInFrames, fps, tl.musica.abaixarNaVoz, tl.musica.abaixarPara]);
  // Preview: áudio do WAV (leve, exato com a legenda) e vídeo mudo. Render: áudio do vídeo.
  const audioSeparado = !!props.audioUrl && !getRemotionEnvironment().isRendering;
  // Voz limpa (quando já foi gerada) manda no som, no preview e no render.
  const vozLimpa = tl.audio.limpar ? props.vozUrls?.[tl.audio.intensidade] : undefined;
  const somExterno = vozLimpa ?? (audioSeparado ? props.audioUrl : undefined);
  const volumeVoz = tl.audio.volumeVoz;

  // Efeito de transição no início de cada trecho (menos o primeiro).
  const inicioTrechoAtual = [...trechos]
    .reverse()
    .find((t) => frame >= Math.round(t.saidaDe * fps));
  const desdeCorte =
    inicioTrechoAtual && inicioTrechoAtual.saidaDe > 0
      ? frame - Math.round(inicioTrechoAtual.saidaDe * fps)
      : 999;
  const trans = tl.visual.transicao;
  let extraEscala = 1,
    extraX = 0,
    blur = 0;
  // Quadros até o próximo corte (para transições que começam antes dele).
  const proxTrecho = trechos.find((t) => Math.round(t.saidaDe * fps) > frame);
  const ateCorte = proxTrecho ? Math.round(proxTrecho.saidaDe * fps) - frame : 999;
  // Curva em "pico" no corte: sobe nos últimos quadros do trecho e desce nos primeiros do próximo.
  const picoNoCorte = (antes: number, depois: number) =>
    Math.max(
      ateCorte <= antes
        ? interpolate(ateCorte, [1, antes + 1], [1, 0], { extrapolateRight: "clamp" })
        : 0,
      desdeCorte < depois ? interpolate(desdeCorte, [0, depois], [1, 0]) : 0,
    );
  let escuro = 0,
    brilho = 1;
  if (trans === "zoom" && desdeCorte < 7) extraEscala = interpolate(desdeCorte, [0, 7], [1.25, 1]);
  if (trans === "zoom-suave" && desdeCorte < 12)
    extraEscala = interpolate(desdeCorte, [0, 12], [1.07, 1], { easing: Easing.out(Easing.cubic) });
  if (trans === "escurecer") escuro = 0.9 * picoNoCorte(3, 4);
  if (trans === "desfoque") {
    const k = picoNoCorte(3, 5);
    blur = 12 * k;
    brilho = 1 + 0.1 * k;
  }
  if (trans === "chicote" && desdeCorte < 6) {
    extraX = interpolate(desdeCorte, [0, 6], [120, 0]);
    blur = interpolate(desdeCorte, [0, 6], [14, 0]);
  }

  const enq = tl.enquadramento;
  const ctxBase = {
    tl,
    fonteUrl: props.fonteUrl,
    duracaoFonte: props.duracaoFonte,
    midias: props.midias,
    trechos,
    palavras: props.palavras,
    modoGaleria: props.modoGaleria,
    recorteUrl: props.recorteUrl,
    estiloBase: {
      transform: `translateX(${extraX}px) scale(${escala * extraEscala * enq.escala})`,
      transformOrigin: `${ox * 100}% ${oy * 100}%`,
      objectPosition: `${enq.x * 100}% ${enq.y * 100}%`,
      filter:
        [
          filtroCorrecao(tl.visual),
          FILTRO_LOOK[tl.visual.look] === "none" ? "" : FILTRO_LOOK[tl.visual.look],
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    },
  };
  const efeitos = tl.efeitos.filter((e) => EFEITO_POR_TIPO[e.tipo]?.componente);
  const camada = (cheia: boolean) =>
    efeitos
      .filter((e) => !!EFEITO_POR_TIPO[e.tipo].telaCheia === cheia)
      .map((e) => {
        const def = EFEITO_POR_TIPO[e.tipo];
        const Comp = def.componente!;
        const [ini, dur] = janelaFrames(
          trechos,
          e.de,
          e.ate > e.de ? e.ate : e.de + def.duracaoPadrao,
          fps,
        );
        return (
          <Sequence key={e.id} from={ini} durationInFrames={dur} name={`${def.nome}`}>
            <Comp p={e.props ?? {}} dur={dur} ctx={{ ...ctxBase, deFonte: e.de }} />
          </Sequence>
        );
      });

  return (
    <AbsoluteFill style={{ background: tl.marca.fundo, overflow: "hidden" }}>
      {tl.visual.nitidez > 0 && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="vedit-nitidez">
            <feConvolveMatrix
              order="3"
              preserveAlpha="true"
              kernelMatrix={(() => {
                const a = tl.visual.nitidez * 0.9;
                return `0 ${-a} 0 ${-a} ${1 + 4 * a} ${-a} 0 ${-a} 0`;
              })()}
            />
          </filter>
        </svg>
      )}
      {/* Vídeo base, já cortado */}
      <AbsoluteFill
        style={{
          transform: `translateX(${extraX}px) scale(${escala * extraEscala * enq.escala})`,
          transformOrigin: `${ox * 100}% ${oy * 100}%`,
          filter:
            [
              filtroCorrecao(tl.visual),
              FILTRO_LOOK[tl.visual.look] === "none" ? "" : FILTRO_LOOK[tl.visual.look],
              blur ? `blur(${blur.toFixed(2)}px)` : "",
              brilho !== 1 ? `brightness(${brilho.toFixed(3)})` : "",
            ]
              .filter(Boolean)
              .join(" ") || "none",
        }}
      >
        {props.modoGaleria || !props.fonteUrl ? (
          <AbsoluteFill
            style={{ background: "radial-gradient(ellipse at 50% 35%, #3a3a48 0%, #15151c 70%)" }}
          >
            <div
              style={{
                position: "absolute",
                left: "30%",
                right: "30%",
                top: "24%",
                height: "22%",
                borderRadius: "50%",
                background: "#4a4a5a",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "16%",
                right: "16%",
                top: "47%",
                bottom: "-10%",
                borderRadius: "45% 45% 0 0",
                background: "#40404e",
              }}
            />
          </AbsoluteFill>
        ) : (
          trechos.map((t, i) => (
            <Sequence
              key={i}
              from={Math.round(t.saidaDe * fps)}
              durationInFrames={Math.max(1, Math.round((t.ate - t.de) * fps))}
              name={`Trecho ${i + 1}`}
              // Pré-monta o próximo trecho 1s antes: o <video> já chega carregado no corte.
              premountFor={fps}
            >
              <OffthreadVideo
                src={props.fonteUrl}
                trimBefore={Math.round(t.de * fps)}
                // Som: voz limpa se existir; senão, no preview o WAV leve e no render o do vídeo.
                muted={!!somExterno}
                volume={somExterno ? undefined : volumeVoz}
                pauseWhenBuffering
                onError={
                  getRemotionEnvironment().isRendering
                    ? undefined
                    : (e) => console.warn("[vedit] vídeo", e)
                }
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${enq.x * 100}% ${enq.y * 100}%`,
                }}
              />
              {somExterno && (
                <Audio src={somExterno} trimBefore={Math.round(t.de * fps)} volume={volumeVoz} />
              )}
            </Sequence>
          ))
        )}
        {/* Dissolve: a imagem do trecho anterior continua alguns quadros por cima e some aos poucos. */}
        {trans === "suave" &&
          !props.modoGaleria &&
          props.fonteUrl &&
          trechos.slice(1).map((t, k) => {
            const ant = trechos[k];
            const d = Math.min(8, Math.round((t.ate - t.de) * fps) - 1);
            if (d < 3 || (props.duracaoFonte && ant.ate + d / fps > props.duracaoFonte))
              return null;
            return (
              <Sequence
                key={`d${k}`}
                from={Math.round(t.saidaDe * fps)}
                durationInFrames={d}
                premountFor={fps}
                name={`Dissolve ${k + 2}`}
              >
                <Dissolve
                  src={props.fonteUrl}
                  trimBefore={Math.round(ant.ate * fps)}
                  dur={d}
                  objectPosition={`${enq.x * 100}% ${enq.y * 100}%`}
                />
              </Sequence>
            );
          })}
        {escuro > 0 && <AbsoluteFill style={{ background: "#000", opacity: escuro }} />}
      </AbsoluteFill>

      {tl.visual.vinheta > 0 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${tl.visual.vinheta}) 100%)`,
          }}
        />
      )}
      <Grao forca={tl.visual.grao} />

      {camada(false)}
      {!efeitos.some((e) => {
        if (!EFEITO_POR_TIPO[e.tipo].escondeLegenda) return false;
        const [ini, dur] = janelaFrames(
          trechos,
          e.de,
          e.ate > e.de ? e.ate : e.de + EFEITO_POR_TIPO[e.tipo].duracaoPadrao,
          fps,
        );
        return frame >= ini && frame < ini + dur;
      }) && <Legenda tl={tl} palavras={props.palavras} trechos={trechos} />}
      {camada(true)}

      {trans !== "nenhuma" &&
        trechos.slice(1).map((t, i) => (
          <Sequence key={`tr${i}`} from={Math.round(t.saidaDe * fps)} durationInFrames={8}>
            <Transicao tipo={trans} />
          </Sequence>
        ))}

      {tl.visual.barraProgresso && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 10,
            width: `${(frame / durationInFrames) * 100}%`,
            background: tl.marca.destaque,
          }}
        />
      )}

      {/* Áudio: música com ducking + efeitos sonoros */}
      {urlMusica && (
        <Audio
          src={urlMusica}
          loop
          trimBefore={Math.round(tl.musica.inicio * fps)}
          volume={(f) => {
            const fadeIn = tl.musica.fade ? Math.min(1, f / (fps * 0.8)) : 1;
            const fadeOut = tl.musica.fade ? Math.min(1, (durationInFrames - f) / (fps * 1.5)) : 1;
            return (
              tl.musica.volume * tl.musica.ganho * duck[f] * Math.max(0, Math.min(fadeIn, fadeOut))
            );
          }}
        />
      )}
      {tl.sfx.map((s, i) => (
        <Sequence
          key={`sfx${i}`}
          from={Math.round(paraSaida(trechos, s.em) * fps)}
          durationInFrames={fps * 3}
        >
          <Audio src={urlSom(s.som)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

export function calcularDuracao(props: Pick<ReelProps, "timeline" | "duracaoFonte">, fps = 30) {
  const tr = trechosMantidos(normalizarTimeline(props.timeline).timeline, props.duracaoFonte);
  const u = tr[tr.length - 1];
  const s = u ? u.saidaDe + (u.ate - u.de) : props.duracaoFonte;
  return Math.max(fps, Math.round(s * fps));
}
