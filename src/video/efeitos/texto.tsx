import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { lista, ruido, u, useEntradaSaida, type EfeitoProps } from "./base";
import { cssDe, Marcado, palavrasMarcadas } from "../marcacao";

// ─── Título / gancho no topo ─────────────────────────────────────────────
export function TituloGancho({ p, ctx, dur }: EfeitoProps) {
  const { width } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const estilo = p.estilo ?? "bloco";
  const palavras = palavrasMarcadas(String(p.texto ?? "Seu gancho aqui"));
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          top: "13%",
          left: "6%",
          right: "6%",
          textAlign: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `0 ${16 * k}px`,
        }}
      >
        {palavras.map((w, i) => {
          const s = spring({ frame: frame - i * 2, fps, config: { damping: 14, stiffness: 200 } });
          const marcada = w.destaque;
          const txt = w.pedacos.map((pd, j) => (
            <span key={j} style={cssDe(pd.e, k)}>
              {pd.t}
            </span>
          ));
          const comum: React.CSSProperties = {
            display: "inline-block",
            opacity: s,
            transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
          };
          if (estilo === "serif")
            return (
              <span
                key={i}
                style={{
                  ...comum,
                  fontFamily: f(m.fonteSerif, "serif"),
                  fontStyle: marcada ? "italic" : "normal",
                  fontSize: 104 * k,
                  lineHeight: 1,
                  color: marcada ? m.destaque : m.texto,
                  textShadow: "0 6px 40px rgba(0,0,0,.5)",
                }}
              >
                {txt}
              </span>
            );
          return (
            <span
              key={i}
              style={{
                ...comum,
                fontFamily: f(m.fonteTitulo),
                fontWeight: 800,
                fontSize: 84 * k,
                lineHeight: 1.05,
                letterSpacing: -2 * k,
                color: marcada ? "#0B0B0F" : m.texto,
                background: marcada ? m.destaque : "transparent",
                borderRadius: 12 * k,
                padding: marcada ? `0 ${12 * k}px` : 0,
                textShadow: marcada ? "none" : "0 6px 30px rgba(0,0,0,.55)",
              }}
            >
              {txt}
            </span>
          );
        })}
        {p.subtitulo && (
          <div
            style={{
              width: "100%",
              marginTop: 14 * k,
              fontFamily: f(m.fonteLegenda),
              fontWeight: 600,
              fontSize: 38 * k,
              color: m.texto,
              opacity: interpolate(frame, [8, 18], [0, 0.85], {
                extrapolateRight: "clamp",
                extrapolateLeft: "clamp",
              }),
              textShadow: "0 3px 16px rgba(0,0,0,.6)",
            }}
          >
            <Marcado
              texto={String(p.subtitulo ?? "")}
              destaque={{ color: ctx.tl.marca.destaque }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// ─── Palavra / número gigante ────────────────────────────────────────────
export function PalavraGigante({ p, ctx, dur }: EfeitoProps) {
  const { width } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur, { saidaFrames: 6 });
  const m = ctx.tl.marca;
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 240, mass: 0.6 } });
  const fundo = p.fundo ?? "escurecer";
  const texto = String(p.texto ?? "26");
  const tam = texto.length <= 3 ? 420 : texto.length <= 8 ? 230 : 150;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: saida }}>
      {fundo !== "nenhum" && (
        <AbsoluteFill
          style={{
            background: fundo === "marca" ? m.primaria : "rgba(0,0,0,.45)",
            backdropFilter: fundo === "desfocar" ? "blur(18px)" : undefined,
            opacity: interpolate(s, [0, 1], [0, 1]),
          }}
        />
      )}
      <div
        style={{
          fontFamily: f(p.fonte ?? "Anton", "Impact"),
          fontSize: tam * k,
          lineHeight: 0.9,
          color: p.cor ?? m.destaque,
          textTransform: "uppercase",
          transform: `scale(${interpolate(s, [0, 1], [2.2, 1])}) rotate(${interpolate(s, [0, 1], [-8, -2])}deg)`,
          textShadow: "0 20px 60px rgba(0,0,0,.45)",
          textAlign: "center",
          maxWidth: "90%",
        }}
      >
        <Marcado texto={String(texto ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
      </div>
      {p.legenda && (
        <div
          style={{
            marginTop: 20 * k,
            fontFamily: f(m.fonteLegenda),
            fontWeight: 800,
            fontSize: 46 * k,
            color: m.texto,
            textTransform: "uppercase",
            letterSpacing: 4 * k,
            opacity: interpolate(frame, [6, 14], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {p.legenda}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─── Capa de revista ─────────────────────────────────────────────────────
export function Capa({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const chamadas = lista(p.chamadas, ["Como a IA virou o novo time", "O método por trás"]);
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg,rgba(0,0,0,.35),transparent 30%,transparent 65%,rgba(0,0,0,.5))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: height * 0.075,
          width: "100%",
          textAlign: "center",
          fontFamily: f("Playfair Display", "serif"),
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: (p.titulo?.length > 8 ? 150 : 210) * k,
          lineHeight: 0.85,
          letterSpacing: -6 * k,
          color: p.cor ?? m.texto,
          transform: `translateY(${interpolate(s, [0, 1], [-80, 0])}px)`,
          opacity: s,
          mixBlendMode: "normal",
          textShadow: "0 6px 30px rgba(0,0,0,.25)",
        }}
      >
        {p.titulo ?? "REVISTA"}
      </div>
      <div
        style={{
          position: "absolute",
          top: height * 0.075 + 190 * k,
          left: "8%",
          fontFamily: f(m.fonteLegenda),
          fontWeight: 800,
          fontSize: 24 * k,
          letterSpacing: 6 * k,
          color: m.destaque,
          opacity: s,
        }}
      >
        {p.edicao ?? "EDIÇÃO ESPECIAL · 2026"}
      </div>
      <div style={{ position: "absolute", bottom: "17%", left: "7%", width: "52%" }}>
        {chamadas.map((c, i) => {
          const si = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{
                marginTop: 18 * k,
                opacity: si,
                transform: `translateX(${interpolate(si, [0, 1], [-60, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 60 * k,
                  height: 6 * k,
                  background: m.destaque,
                  marginBottom: 8 * k,
                }}
              />
              <div
                style={{
                  fontFamily: f(m.fonteTitulo),
                  fontWeight: 800,
                  fontSize: 44 * k,
                  lineHeight: 1,
                  color: m.texto,
                  textShadow: "0 3px 18px rgba(0,0,0,.6)",
                }}
              >
                {c}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "17%",
          right: "7%",
          width: 150 * k,
          height: 150 * k,
          borderRadius: "50%",
          background: m.destaque,
          color: "#0B0B0F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: f(m.fonteTitulo),
          fontWeight: 800,
          fontSize: 30 * k,
          lineHeight: 1,
          transform: `rotate(-12deg) scale(${spring({ frame: frame - 14, fps, config: { damping: 9 } })})`,
        }}
      >
        {p.selo ?? "NOVO"}
      </div>
    </AbsoluteFill>
  );
}

// ─── /trava: páginas passando, uma palavra travada no centro ─────────────
export function Trava({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, saida, entrada } = useEntradaSaida(dur, { saidaFrames: 6 });
  const m = ctx.tl.marca;
  const palavra = String(p.palavra ?? "IAplicada");
  // Corpo: o que a pessoa falou perto deste ponto (ou texto passado).
  const perto = ctx.palavras
    .filter((w) => Math.abs(w.i - ctx.deFonte) < 25)
    .map((w) => w.p.trim())
    .join(" ");
  const corpo = String(
    p.texto ??
      (perto ||
        "você não precisa saber editar para ter um vídeo profissional com inteligência artificial aplicada ao seu negócio"),
  );
  const linhas: string[] = [];
  const palavrasCorpo = corpo.split(/\s+/);
  for (let i = 0; i < 60; i++)
    linhas.push(
      palavrasCorpo
        .slice((i * 4) % palavrasCorpo.length, ((i * 4) % palavrasCorpo.length) + 6)
        .join(" ") || corpo,
    );
  const lh = 92 * k;
  const desloc = (frame * 26 * k) % (lh * 20);
  const desacel = interpolate(frame, [0, dur * 0.7], [1, 0.15], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: "#F4F1EA",
        opacity: Math.min(entrada * 1.4, 1) * saida,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "-4%",
          right: "-4%",
          top: -desloc * desacel - lh * 10,
          filter: `blur(${2.4 * desacel}px)`,
        }}
      >
        {linhas.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: f("Fraunces", "serif"),
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 74 * k,
              lineHeight: `${lh}px`,
              color: "#1b1b1b",
              whiteSpace: "nowrap",
              opacity: 0.85,
            }}
          >
            {l}
          </div>
        ))}
      </div>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(244,241,234,0) 25%, rgba(244,241,234,.92) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: height / 2,
          left: 0,
          right: 0,
          transform: "translateY(-50%)",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: f("Fraunces", "serif"),
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: 120 * k,
            background: m.destaque,
            color: "#111",
            padding: `0 ${18 * k}px`,
            boxShadow: "0 18px 50px rgba(0,0,0,.18)",
          }}
        >
          {palavra}
        </span>
      </div>
    </AbsoluteFill>
  );
}

// ─── /letreiro: painel de LED ────────────────────────────────────────────
export function Letreiro({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida, entrada } = useEntradaSaida(dur, { saidaFrames: 6 });
  const cor = p.cor ?? ctx.tl.marca.destaque;
  const texto = String(p.texto ?? "IAPLICADA").toUpperCase();
  const empurra = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 90 } }),
    [0, 1],
    [width * 1.1, 0],
  );
  const ponto = 14 * k;
  const pisca = 0.85 + 0.15 * Math.sin(frame / 2);
  return (
    <AbsoluteFill
      style={{
        background: "#050605",
        opacity: Math.min(1, entrada * 1.5) * saida,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,.07) 28%, transparent 32%)`,
          backgroundSize: `${ponto}px ${ponto}px`,
        }}
      />
      <div
        style={{
          transform: `translateX(${empurra}px)`,
          fontFamily: f("Archivo Black", "Impact"),
          fontSize: (texto.length > 8 ? 200 : 300) * k,
          lineHeight: 1,
          color: cor,
          WebkitMaskImage: `radial-gradient(circle, #000 42%, transparent 46%)`,
          WebkitMaskSize: `${ponto}px ${ponto}px`,
          maskImage: `radial-gradient(circle, #000 42%, transparent 46%)`,
          maskSize: `${ponto}px ${ponto}px`,
          filter: `drop-shadow(0 0 ${12 * k}px ${cor}) brightness(${pisca})`,
          whiteSpace: "nowrap",
          maxWidth: "none",
          textAlign: "center",
        }}
      >
        <Marcado texto={String(texto ?? "")} destaque={{ color: ctx.tl.marca.destaque }} />
      </div>
      {p.legenda && (
        <div
          style={{
            position: "absolute",
            top: height * 0.66,
            fontFamily: f("DM Mono", "monospace"),
            fontSize: 34 * k,
            color: cor,
            opacity: 0.8,
            letterSpacing: 6 * k,
          }}
        >
          {p.legenda}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─── Recorte de papel / letras de bilhete ────────────────────────────────
export function Papel({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const passo = Math.floor(frame / 3); // stop-motion a ~10 fps
  const texto = String(p.texto ?? "100%");
  const fontes = [
    "Archivo Black",
    "Playfair Display",
    "Anton",
    "DM Mono",
    "Fraunces",
    "Bricolage Grotesque",
  ];
  const fundos = [
    "#FFFFFF",
    "#111111",
    ctx.tl.marca.destaque,
    "#F2E9D8",
    ctx.tl.marca.primaria,
    "#E8483B",
  ];
  const top =
    p.posicao === "centro"
      ? height * 0.45
      : p.posicao === "inferior"
        ? height * 0.62
        : height * 0.16;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8 * k,
          padding: `0 ${50 * k}px`,
        }}
      >
        {texto.split("").map((c, i) => {
          if (c === " ") return <span key={i} style={{ width: 30 * k }} />;
          const s = spring({ frame: frame - i * 2, fps, config: { damping: 12, stiffness: 260 } });
          const bg = fundos[Math.floor(ruido(i + 3) * fundos.length)];
          const escuro = bg === "#111111" || bg === ctx.tl.marca.primaria;
          const rot = (ruido(i * 7 + passo) - 0.5) * 10;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: f(fontes[i % fontes.length]),
                fontWeight: 700,
                fontSize: (90 + ruido(i) * 40) * k,
                lineHeight: 1,
                padding: `${8 * k}px ${12 * k}px`,
                background: bg,
                color: escuro ? "#fff" : "#111",
                transform: `rotate(${rot}deg) scale(${s})`,
                boxShadow: "4px 6px 0 rgba(0,0,0,.35)",
                clipPath: `polygon(${ruido(i) * 6}% 0, 100% ${ruido(i + 1) * 8}%, ${100 - ruido(i + 2) * 6}% 100%, 0 ${100 - ruido(i + 5) * 8}%)`,
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ─── Mural de post-its (headline wall sem recorte) ───────────────────────
export function PostIts({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const notas = lista(p.notas, [
    "Responde lead às 3h",
    "Proposta em 5 min",
    "Zero planilha",
    "Relatório pronto",
  ]);
  const cores = ["#FFE66D", "#FFFFFF", "#C6F432", "#FFD3E0", "#BDE0FE"];
  // Posições nas bordas, longe do rosto (centro).
  const slots = [
    [0.04, 0.2],
    [0.62, 0.17],
    [0.03, 0.47],
    [0.66, 0.44],
    [0.08, 0.7],
    [0.6, 0.7],
  ];
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      {notas.slice(0, 6).map((n, i) => {
        const s = spring({ frame: frame - i * 5, fps, config: { damping: 11, stiffness: 220 } });
        const [x, y] = slots[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x * width,
              top: y * height,
              width: 320 * k,
              minHeight: 200 * k,
              padding: 24 * k,
              background: cores[i % cores.length],
              boxShadow: "0 14px 30px rgba(0,0,0,.28)",
              transform: `rotate(${(ruido(i) - 0.5) * 12}deg) scale(${s})`,
              fontFamily: f("Caveat", "cursive"),
              fontWeight: 700,
              fontSize: 52 * k,
              lineHeight: 1,
              color: "#1d1d1d",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -14 * k,
                left: "40%",
                width: 70 * k,
                height: 26 * k,
                background: "rgba(255,255,255,.55)",
                transform: "rotate(-4deg)",
              }}
            />
            {n}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
