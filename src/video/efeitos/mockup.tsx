// Grafismos de interface no estilo "tech dark": janelas/telas flutuando em 3D e cards de UI
// em volta da pessoa. Feitos para reproduzir referências com mockups e UI flutuante, sem depender
// de imagens soltas: o conteúdo vem da fala (títulos, itens, números). Tudo se mede pelo quadro
// (largura E altura), então cabe igual em 9:16, 4:5 e 1:1.
import { AbsoluteFill, Img, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { Marcado } from "../marcacao";
import { lista, Midia, u, useEntradaSaida, type EfeitoProps } from "./base";
import { urlIcone } from "./icones";
import { Pessoa } from "./recorte";

type Tema = "escuro" | "claro" | "vidro";

function estiloCartao(tema: Tema, k: number, primaria: string): React.CSSProperties {
  if (tema === "claro")
    return {
      background: "rgba(250,250,252,.96)",
      color: "#0B0B0F",
      border: "1px solid rgba(0,0,0,.06)",
      boxShadow: `0 ${30 * k}px ${80 * k}px rgba(0,0,0,.35)`,
    };
  if (tema === "vidro")
    return {
      background: "linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.06))",
      backdropFilter: "blur(22px) saturate(140%)",
      WebkitBackdropFilter: "blur(22px) saturate(140%)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,.35)",
      boxShadow: `0 ${30 * k}px ${80 * k}px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)`,
    };
  return {
    background: "linear-gradient(160deg, rgba(28,28,36,.94), rgba(12,12,18,.94))",
    color: "#fff",
    border: `1px solid ${primaria}55`,
    boxShadow: `0 ${30 * k}px ${90 * k}px rgba(0,0,0,.55), 0 0 ${60 * k}px ${primaria}33, inset 0 1px 0 rgba(255,255,255,.08)`,
  };
}

function IconeCard({ nome, k, cor }: { nome?: string; k: number; cor: string }) {
  const s = 64 * k;
  const url = nome ? urlIcone(nome) : null;
  if (!url)
    return (
      <div
        style={{
          width: s,
          height: s,
          borderRadius: 18 * k,
          background: `linear-gradient(135deg, ${cor}, ${cor}99)`,
          flex: "none",
        }}
      />
    );
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: 18 * k,
        background: "rgba(255,255,255,.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <Img src={url} style={{ width: s * 0.66, height: s * 0.66, objectFit: "contain" }} />
    </div>
  );
}

type Card = { titulo: string; sub?: string; icone?: string; valor?: string };

function lerCards(v: unknown): Card[] {
  if (!Array.isArray(v)) return lista(v).map((t) => ({ titulo: t }));
  return v
    .map((c) =>
      typeof c === "string"
        ? { titulo: c }
        : {
            titulo: String((c as any)?.titulo ?? (c as any)?.texto ?? ""),
            sub: (c as any)?.sub ?? (c as any)?.subtitulo,
            icone: (c as any)?.icone,
            valor: (c as any)?.valor,
          },
    )
    .filter((c) => c.titulo);
}

// ─── Cards de UI flutuando em volta da pessoa ──────────────────────────────
export function CardsFlutuantes({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = Math.min(u(width), height / 1350); // cabe também no 1:1
  const { frame, fps, saida } = useEntradaSaida(dur);
  const tema = (p.tema ?? "escuro") as Tema;
  const cards = lerCards(p.cards ?? p.itens).slice(0, 4);
  const primaria = ctx.tl.marca.primaria;
  const destaque = ctx.tl.marca.destaque;
  const disp = (p.disposicao ?? "lados") as "lados" | "topo" | "empilhado";
  const cw = disp === "lados" ? width * 0.46 : width * 0.8;
  // Posições: lados alterna esquerda/direita descendo; topo empilha no alto; empilhado no centro.
  const pos = cards.map((_, i) => {
    if (disp === "lados") {
      const esq = i % 2 === 0;
      return {
        x: esq ? width * 0.04 : width * 0.5,
        y: height * (0.14 + i * 0.13),
        rot: esq ? 16 : -16,
      };
    }
    const base = disp === "topo" ? 0.08 : 0.3;
    return { x: (width - cw) / 2, y: height * base + i * 150 * k, rot: 0 };
  });
  const atras = !!p.atras && !!ctx.recorteUrl;
  const camada = (
    <AbsoluteFill style={{ perspective: 1400 * k, opacity: saida }}>
      {cards.map((c, i) => {
        const s = spring({ frame: frame - i * 6, fps, config: { damping: 15, stiffness: 160 } });
        const flutua = Math.sin((frame + i * 17) / (fps * 0.9)) * 10 * k;
        const { x, y, rot } = pos[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: cw,
              transform: `translateY(${interpolate(s, [0, 1], [80 * k, 0]) + flutua}px) rotateY(${rot * (1 - 0.3 * s)}deg) scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              opacity: s,
              borderRadius: 26 * k,
              padding: `${20 * k}px ${22 * k}px`,
              display: "flex",
              alignItems: "center",
              gap: 16 * k,
              ...estiloCartao(tema, k, primaria),
            }}
          >
            <IconeCard nome={c.icone} k={k} cor={primaria} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: f("Inter"),
                  fontWeight: 800,
                  fontSize: 30 * k,
                  lineHeight: 1.15,
                }}
              >
                <Marcado texto={c.titulo} destaque={{ color: destaque }} escala={k} />
              </div>
              {c.sub && (
                <div
                  style={{
                    fontFamily: f("Inter"),
                    fontSize: 22 * k,
                    opacity: 0.7,
                    marginTop: 4 * k,
                    lineHeight: 1.25,
                  }}
                >
                  {c.sub}
                </div>
              )}
            </div>
            {c.valor && (
              <div
                style={{
                  fontFamily: f(ctx.tl.marca.fonteTitulo),
                  fontWeight: 800,
                  fontSize: 34 * k,
                  color: tema === "claro" ? primaria : destaque,
                  flex: "none",
                }}
              >
                {c.valor}
              </div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
  return atras ? (
    <AbsoluteFill>
      {camada}
      <Pessoa ctx={ctx} dur={dur} />
    </AbsoluteFill>
  ) : (
    camada
  );
}

// ─── Janela / celular / notebook flutuando em 3D ──────────────────────────
export function Mockup({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = Math.min(u(width), height / 1350);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur, { damping: 16, stiffness: 130 });
  const disp = (p.dispositivo ?? "janela") as "janela" | "celular" | "notebook";
  const tema = (p.tema ?? "escuro") as Tema;
  const primaria = ctx.tl.marca.primaria;
  const destaque = ctx.tl.marca.destaque;
  const posicao = (p.posicao ?? "centro") as "centro" | "topo" | "baixo";
  const inclina = p.inclinacao === "reto" ? 0 : 1;
  const linhas = lista(p.linhas ?? p.itens).slice(0, 5);
  const temMidia = !!p.midia;

  // Tamanho pelo quadro: largura limitada também pela altura disponível.
  let W: number, H: number;
  if (disp === "celular") {
    H = Math.min(height * 0.62, width * 0.9 * 2.05);
    W = H / 2.05;
  } else {
    W = Math.min(width * 0.88, height * 0.62 * 1.45);
    H = disp === "notebook" ? W * 0.64 : W * 0.7;
    // Interface montada (sem mídia): a janela tem a altura do conteúdo.
    if (!temMidia)
      H = Math.min(H, (40 + 56 + (p.app ? 40 : 0) + (p.titulo ? 70 : 0) + linhas.length * 82) * k);
  }
  const topoY =
    posicao === "topo" ? height * 0.1 : posicao === "baixo" ? height * 0.9 - H : (height - H) / 2.2;
  const flutua = Math.sin(frame / (fps * 1.1)) * 12 * k;
  const giro = inclina * interpolate(entrada, [0, 1], [28, 10]);
  const escuro = p.fundo === "escurecer";

  const conteudo = temMidia ? (
    <Midia ctx={ctx} midia={p.midia} tempo={p.tempo} />
  ) : (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: `${(disp === "celular" ? 46 : 28) * k}px ${26 * k}px`,
        display: "flex",
        flexDirection: "column",
        gap: 16 * k,
        color: tema === "claro" ? "#0B0B0F" : "#fff",
        fontFamily: f("Inter"),
      }}
    >
      {p.app && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 * k, opacity: 0.75 }}>
          <div
            style={{ width: 22 * k, height: 22 * k, borderRadius: 6 * k, background: primaria }}
          />
          <span style={{ fontSize: 22 * k, fontWeight: 700 }}>{p.app}</span>
        </div>
      )}
      {p.titulo && (
        <div style={{ fontSize: 40 * k, fontWeight: 800, lineHeight: 1.1 }}>
          <Marcado texto={String(p.titulo)} destaque={{ color: destaque }} escala={k} />
        </div>
      )}
      {linhas.map((l, i) => {
        const s = spring({
          frame: frame - 10 - i * 6,
          fps,
          config: { damping: 16, stiffness: 160 },
        });
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14 * k,
              padding: `${14 * k}px ${16 * k}px`,
              borderRadius: 16 * k,
              background: tema === "claro" ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.06)",
              border: `1px solid ${tema === "claro" ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)"}`,
              opacity: s,
              transform: `translateX(${interpolate(s, [0, 1], [40 * k, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 30 * k,
                height: 30 * k,
                borderRadius: 999,
                background: s > 0.9 ? destaque : "transparent",
                border: `2px solid ${destaque}`,
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0B0B0F",
                fontSize: 20 * k,
                fontWeight: 900,
              }}
            >
              {s > 0.9 ? "✓" : ""}
            </div>
            <div style={{ fontSize: 26 * k, fontWeight: 600, lineHeight: 1.2 }}>
              <Marcado texto={l} destaque={{ color: destaque }} escala={k} />
            </div>
          </div>
        );
      })}
    </div>
  );

  const moldura: React.CSSProperties =
    disp === "celular"
      ? { borderRadius: 54 * k, border: `${10 * k}px solid #111`, background: "#0B0B0F" }
      : { borderRadius: 22 * k, ...estiloCartao(tema, k, primaria) };

  const aparelho = (
    <div
      style={{
        position: "absolute",
        left: (width - W) / 2,
        top: topoY,
        width: W,
        height: H,
        transform: `translateY(${interpolate(entrada, [0, 1], [height * 0.12, 0]) + flutua}px) rotateX(${giro * 0.5}deg) rotateY(${-giro}deg) scale(${interpolate(entrada, [0, 1], [0.85, 1])})`,
        opacity: entrada,
        overflow: "hidden",
        boxShadow: `0 ${40 * k}px ${120 * k}px rgba(0,0,0,.6), 0 0 ${80 * k}px ${primaria}40`,
        ...moldura,
      }}
    >
      {disp !== "celular" && (
        <div
          style={{
            height: 40 * k,
            display: "flex",
            alignItems: "center",
            gap: 8 * k,
            padding: `0 ${16 * k}px`,
            background: tema === "claro" ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.05)",
            borderBottom: `1px solid ${tema === "claro" ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)"}`,
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div
              key={c}
              style={{ width: 12 * k, height: 12 * k, borderRadius: 99, background: c }}
            />
          ))}
          {p.url && (
            <div
              style={{
                marginLeft: 12 * k,
                flex: 1,
                height: 22 * k,
                borderRadius: 8 * k,
                background: tema === "claro" ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)",
                fontFamily: f("Inter"),
                fontSize: 15 * k,
                color: tema === "claro" ? "#555" : "#bbb",
                display: "flex",
                alignItems: "center",
                paddingLeft: 10 * k,
              }}
            >
              {p.url}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: disp === "celular" ? "100%" : `calc(100% - ${40 * k}px)`,
        }}
      >
        {conteudo}
      </div>
    </div>
  );

  const camada = (
    <AbsoluteFill style={{ perspective: 1600 * k, opacity: saida }}>
      {escuro && <AbsoluteFill style={{ background: `rgba(0,0,0,${0.55 * entrada})` }} />}
      {aparelho}
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
