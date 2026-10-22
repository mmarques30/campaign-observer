import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { lista, Midia, u, useEntradaSaida, type EfeitoProps } from "./base";

const vidro = (k: number): React.CSSProperties => ({
  background: "linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.06))",
  backdropFilter: "blur(22px) saturate(140%)",
  WebkitBackdropFilter: "blur(22px) saturate(140%)",
  border: "1px solid rgba(255,255,255,.35)",
  borderRadius: 34 * k,
  boxShadow: "0 30px 80px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.4)",
});

// ─── Checklist que vai sendo marcado ─────────────────────────────────────
export function Checklist({ p, ctx, dur }: EfeitoProps) {
  const { width } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const itens = lista(p.itens, ["Gravar", "Cortar silêncios", "Legendar", "Publicar"]);
  const passo = dur / (itens.length + 0.6);
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: p.lado === "direita" ? undefined : "6%",
          right: p.lado === "direita" ? "6%" : undefined,
          width: 560 * k,
          padding: 34 * k,
          ...vidro(k),
          background: "rgba(14,14,18,.72)",
          transform: `translateY(${interpolate(entrada, [0, 1], [-40, 0])}px)`,
          opacity: entrada,
        }}
      >
        {p.titulo && (
          <div
            style={{
              fontFamily: f(m.fonteLegenda),
              fontWeight: 800,
              fontSize: 30 * k,
              color: "rgba(255,255,255,.6)",
              letterSpacing: 3 * k,
              textTransform: "uppercase",
              marginBottom: 16 * k,
            }}
          >
            {p.titulo}
          </div>
        )}
        {itens.map((it, i) => {
          const marcado = frame > passo * (i + 0.8);
          const s = spring({
            frame: frame - passo * (i + 0.8),
            fps,
            config: { damping: 12, stiffness: 300 },
          });
          const atual = !marcado && frame > passo * i;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20 * k,
                padding: `${12 * k}px 0`,
              }}
            >
              <div
                style={{
                  width: 46 * k,
                  height: 46 * k,
                  borderRadius: 12 * k,
                  border: `3px solid ${marcado ? m.destaque : "rgba(255,255,255,.45)"}`,
                  background: marcado ? m.destaque : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <svg width={30 * k} height={30 * k} viewBox="0 0 24 24">
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    fill="none"
                    stroke="#0B0B0F"
                    strokeWidth={3.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={24}
                    strokeDashoffset={24 * (1 - (marcado ? s : 0))}
                  />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: f(m.fonteLegenda),
                  fontWeight: atual ? 800 : 600,
                  fontSize: 42 * k,
                  color: atual ? m.destaque : marcado ? "rgba(255,255,255,.55)" : "#fff",
                  textDecoration: marcado ? "line-through" : "none",
                  textDecorationThickness: 3 * k,
                }}
              >
                {it}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ─── Celular flutuando (phone mockup) ────────────────────────────────────
export function Celular({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur, { damping: 16, stiffness: 120 });
  const lado = p.lado ?? "direita";
  const w = 420 * k,
    h = w * 2.05;
  const x =
    lado === "centro" ? (width - w) / 2 : lado === "esquerda" ? width * 0.05 : width * 0.95 - w;
  const flutua = Math.sin(frame / 18) * 10 * k;
  const giro = interpolate(
    entrada,
    [0, 1],
    [lado === "esquerda" ? -35 : 35, lado === "esquerda" ? 8 : -8],
  );
  const msgs = lista(p.mensagens);
  return (
    <AbsoluteFill style={{ perspective: 1800 * k, opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: height * 0.24 + flutua + interpolate(entrada, [0, 1], [200, 0]),
          width: w,
          height: h,
          borderRadius: 64 * k,
          background: "#0d0d0f",
          padding: 14 * k,
          boxShadow: "0 50px 120px rgba(0,0,0,.55), inset 0 0 0 2px #2b2b30",
          transform: `rotateY(${giro}deg) rotateX(4deg)`,
          opacity: entrada,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 52 * k,
            overflow: "hidden",
            background: "#111",
          }}
        >
          {msgs.length ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#ECE5DD",
                padding: `${110 * k}px ${20 * k}px`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 18 * k,
              }}
            >
              {msgs.map((t, i) => {
                const s = spring({ frame: frame - 6 - i * 10, fps, config: { damping: 14 } });
                const minha = i % 2 === 1;
                return (
                  <div
                    key={i}
                    style={{
                      alignSelf: minha ? "flex-end" : "flex-start",
                      maxWidth: "82%",
                      background: minha ? "#DCF8C6" : "#fff",
                      borderRadius: 18 * k,
                      padding: `${12 * k}px ${16 * k}px`,
                      fontFamily: f("Inter"),
                      fontSize: 34 * k,
                      lineHeight: 1.25,
                      color: "#111",
                      transform: `scale(${s})`,
                      transformOrigin: minha ? "right" : "left",
                      boxShadow: "0 1px 1px rgba(0,0,0,.15)",
                    }}
                  >
                    {t}
                  </div>
                );
              })}
            </div>
          ) : (
            <Midia ctx={ctx} midia={p.midia} tempo={p.tempo} />
          )}
          <div
            style={{
              position: "absolute",
              top: 14 * k,
              left: "50%",
              width: 130 * k,
              height: 36 * k,
              marginLeft: -65 * k,
              borderRadius: 20 * k,
              background: "#000",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── /vidro: placa de vidro com gráfico subindo ──────────────────────────
export function Vidro({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, entrada, saida } = useEntradaSaida(dur, { damping: 18, stiffness: 120 });
  const m = ctx.tl.marca;
  const vals: number[] = (Array.isArray(p.valores) ? p.valores : [92, 80, 71, 66, 60, 57, 55]).map(
    Number,
  );
  const W = 760 * k,
    H = 300 * k;
  const max = Math.max(...vals),
    min = Math.min(...vals);
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * W,
    H - ((v - min) / (max - min || 1)) * H * 0.85 - H * 0.08,
  ]);
  const d = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
  const prog = interpolate(frame, [6, Math.min(dur - 6, 40)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ult = pts[pts.length - 1];
  return (
    <AbsoluteFill style={{ opacity: saida, perspective: 1600 * k }}>
      <div
        style={{
          position: "absolute",
          left: (width - W - 80 * k) / 2,
          top: height * 0.5,
          padding: 40 * k,
          ...vidro(k),
          transform: `rotateX(${interpolate(entrada, [0, 1], [35, 6])}deg) translateY(${interpolate(entrada, [0, 1], [160, 0])}px)`,
          opacity: entrada,
        }}
      >
        <div
          style={{
            fontFamily: f(m.fonteLegenda),
            fontWeight: 800,
            fontSize: 40 * k,
            color: "#fff",
          }}
        >
          {p.titulo ?? "Retenção do Reel"}
        </div>
        <div
          style={{
            fontFamily: f(m.fonteLegenda),
            fontSize: 24 * k,
            color: "rgba(255,255,255,.7)",
            marginBottom: 18 * k,
          }}
        >
          {p.subtitulo ?? "— antes   — depois"}
        </div>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1={0}
              x2={W}
              y1={H * g}
              y2={H * g}
              stroke="rgba(255,255,255,.15)"
              strokeDasharray="6 8"
            />
          ))}
          <path
            d={d}
            fill="none"
            stroke={m.destaque}
            strokeWidth={7 * k}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - prog}
            style={{ filter: `drop-shadow(0 0 ${10 * k}px ${m.destaque})` }}
          />
          {prog > 0.98 && <circle cx={ult[0]} cy={ult[1]} r={13 * k} fill={m.destaque} />}
        </svg>
      </div>
    </AbsoluteFill>
  );
}

// ─── Gráfico de barras crescendo ─────────────────────────────────────────
export function Grafico({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const vals: number[] = (Array.isArray(p.valores) ? p.valores : [12, 28, 47, 90]).map(Number);
  const rot = lista(
    p.rotulos,
    vals.map((_, i) => `M${i + 1}`),
  );
  const max = Math.max(...vals);
  const H = 520 * k;
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          top: height * 0.4,
          height: H + 140 * k,
          padding: 36 * k,
          ...vidro(k),
          background: "rgba(10,10,14,.7)",
          opacity: entrada,
        }}
      >
        <div
          style={{
            fontFamily: f(m.fonteTitulo),
            fontWeight: 800,
            fontSize: 44 * k,
            color: "#fff",
            marginBottom: 20 * k,
          }}
        >
          {p.titulo ?? "Crescimento"}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 26 * k, height: H }}>
          {vals.map((v, i) => {
            const s = spring({
              frame: frame - 6 - i * 5,
              fps,
              config: { damping: 16, stiffness: 90 },
            });
            const ultima = i === vals.length - 1;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    fontFamily: f(m.fonteTitulo),
                    fontWeight: 800,
                    fontSize: 38 * k,
                    color: ultima ? m.destaque : "#fff",
                    opacity: s,
                  }}
                >
                  {Math.round(v * s)}
                  {p.sufixo ?? ""}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: (v / max) * (H - 110 * k) * s,
                    borderRadius: 16 * k,
                    background: ultima ? m.destaque : "rgba(255,255,255,.28)",
                    marginTop: 8 * k,
                  }}
                />
                <div
                  style={{
                    fontFamily: f(m.fonteLegenda),
                    fontSize: 26 * k,
                    color: "rgba(255,255,255,.7)",
                    marginTop: 10 * k,
                  }}
                >
                  {rot[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Comentário do Instagram ─────────────────────────────────────────────
export function Comentario({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { entrada, saida } = useEntradaSaida(dur, { damping: 12, stiffness: 220 });
  const m = ctx.tl.marca;
  const user = String(p.usuario ?? "cliente.real");
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          left: "7%",
          right: "7%",
          top: height * (p.posicao === "inferior" ? 0.56 : 0.16),
          background: "#fff",
          borderRadius: 28 * k,
          padding: `${26 * k}px ${30 * k}px`,
          display: "flex",
          gap: 20 * k,
          boxShadow: "0 24px 60px rgba(0,0,0,.35)",
          transform: `scale(${entrada}) rotate(${interpolate(entrada, [0, 1], [-6, -1.5])}deg)`,
        }}
      >
        <div
          style={{
            width: 76 * k,
            height: 76 * k,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${m.primaria}, ${m.destaque})`,
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: f("Inter"),
            fontWeight: 800,
            fontSize: 34 * k,
          }}
        >
          {user[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: f("Inter"), fontWeight: 700, fontSize: 28 * k, color: "#111" }}>
            {user} <span style={{ fontWeight: 400, color: "#8e8e8e" }}>· 2 min</span>
          </div>
          <div
            style={{
              fontFamily: f("Inter"),
              fontSize: 34 * k,
              color: "#111",
              marginTop: 6 * k,
              lineHeight: 1.25,
            }}
          >
            {p.texto ?? "Isso aqui mudou meu jeito de trabalhar"}
          </div>
          <div
            style={{
              fontFamily: f("Inter"),
              fontWeight: 600,
              fontSize: 24 * k,
              color: "#8e8e8e",
              marginTop: 10 * k,
            }}
          >
            {p.curtidas ?? "1.284"} curtidas Responder
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Notificação caindo do topo ──────────────────────────────────────────
export function Notificacao({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur);
  const itens = lista(p.itens, [p.texto ?? "Novo lead qualificado: Clínica Vida"]);
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      {itens.slice(0, 4).map((t, i) => {
        const s = spring({ frame: frame - i * 7, fps, config: { damping: 14, stiffness: 200 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "5%",
              right: "5%",
              top: height * 0.1 + i * 150 * k,
              transform: `translateY(${interpolate(s, [0, 1], [-260, 0])}px)`,
              ...vidro(k),
              background: "rgba(245,245,247,.88)",
              borderRadius: 32 * k,
              padding: `${22 * k}px ${26 * k}px`,
              display: "flex",
              gap: 18 * k,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 64 * k,
                height: 64 * k,
                borderRadius: 16 * k,
                background: ctx.tl.marca.primaria,
                flex: "none",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: f("Inter"),
                  fontWeight: 700,
                  fontSize: 26 * k,
                  color: "#111",
                }}
              >
                <span>{p.app ?? "CRM IAplicada"}</span>
                <span style={{ fontWeight: 400, color: "#777" }}>agora</span>
              </div>
              <div
                style={{
                  fontFamily: f("Inter"),
                  fontSize: 30 * k,
                  color: "#222",
                  marginTop: 4 * k,
                }}
              >
                {t}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ─── Contador de número ──────────────────────────────────────────────────
export function Contador({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, entrada, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const alvo = Number(p.valor ?? 1000);
  const prog = interpolate(frame, [0, Math.min(dur * 0.7, 45)], [0, 1], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const n = alvo * prog;
  const txt = Number.isInteger(alvo)
    ? Math.round(n).toLocaleString("pt-BR")
    : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <AbsoluteFill style={{ opacity: saida }}>
      <div
        style={{
          position: "absolute",
          top: height * (p.posicao === "centro" ? 0.38 : 0.14),
          width: "100%",
          textAlign: "center",
          transform: `scale(${interpolate(entrada, [0, 1], [0.6, 1])})`,
          opacity: entrada,
        }}
      >
        <div
          style={{
            fontFamily: f(m.fonteTitulo),
            fontWeight: 800,
            fontSize: 190 * k,
            lineHeight: 1,
            letterSpacing: -6 * k,
            color: m.destaque,
            textShadow: "0 12px 50px rgba(0,0,0,.45)",
          }}
        >
          {p.prefixo ?? ""}
          {txt}
          {p.sufixo ?? ""}
        </div>
        {p.legenda && (
          <div
            style={{
              fontFamily: f(m.fonteLegenda),
              fontWeight: 800,
              fontSize: 42 * k,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: 3 * k,
              textShadow: "0 3px 16px rgba(0,0,0,.6)",
            }}
          >
            {p.legenda}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// ─── Órbita: cards girando em volta da pessoa ────────────────────────────
export function Orbita({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, entrada, saida } = useEntradaSaida(dur);
  const m = ctx.tl.marca;
  const itens = lista(p.itens, ["Leads", "Propostas", "Relatórios", "Atendimento", "Financeiro"]);
  const cx = width / 2,
    cy = height * 0.42,
    rx = width * 0.42,
    ry = height * 0.07;
  return (
    <AbsoluteFill style={{ opacity: saida * entrada }}>
      {itens.map((t, i) => {
        const ang = frame / 40 + (i / itens.length) * Math.PI * 2;
        const z = Math.sin(ang);
        const x = cx + Math.cos(ang) * rx;
        const y = cy + z * ry;
        const esc = interpolate(z, [-1, 1], [0.7, 1.08]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%,-50%) scale(${esc})`,
              opacity: interpolate(z, [-1, 1], [0.35, 1]),
              zIndex: Math.round(z * 10) + 10,
              ...vidro(k),
              background: z > 0 ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.35)",
              borderRadius: 999,
              padding: `${16 * k}px ${28 * k}px`,
              fontFamily: f(m.fonteLegenda),
              fontWeight: 800,
              fontSize: 34 * k,
              color: z > 0 ? "#111" : "#fff",
              whiteSpace: "nowrap",
            }}
          >
            {t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ─── Cartela final de CTA ────────────────────────────────────────────────
export function CtaFinal({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, entrada } = useEntradaSaida(dur, { saidaFrames: 1 });
  const m = ctx.tl.marca;
  const palavra = String(p.palavra ?? "QUERO");
  const thumbs = 6;
  return (
    <AbsoluteFill
      style={{ background: m.fundo, opacity: Math.min(1, entrada * 1.5), alignItems: "center" }}
    >
      <div
        style={{
          marginTop: height * 0.2,
          fontFamily: f(m.fonteTitulo),
          fontWeight: 800,
          fontSize: 92 * k,
          color: "#fff",
          display: "flex",
          gap: 20 * k,
          alignItems: "center",
          transform: `scale(${interpolate(entrada, [0, 1], [0.8, 1])})`,
        }}
      >
        {p.verbo ?? "Comenta"}
        <span
          style={{
            background: m.destaque,
            color: "#0B0B0F",
            padding: `0 ${18 * k}px`,
            borderRadius: 14 * k,
            transform: `rotate(-3deg) scale(${spring({ frame: frame - 6, fps, config: { damping: 8 } })})`,
            display: "inline-block",
          }}
        >
          {palavra}
        </span>
      </div>
      <div
        style={{
          fontFamily: f(m.fonteLegenda),
          fontSize: 38 * k,
          color: "rgba(255,255,255,.75)",
          marginTop: 14 * k,
        }}
      >
        {p.texto ?? "que eu te mando no direct"}
      </div>
      {p.miniaturas !== false && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14 * k,
            width: "70%",
            marginTop: 60 * k,
          }}
        >
          {Array.from({ length: thumbs }).map((_, i) => {
            const s = spring({ frame: frame - 8 - i * 2, fps, config: { damping: 12 } });
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "9/16",
                  borderRadius: 18 * k,
                  overflow: "hidden",
                  transform: `scale(${s}) rotate(${(i % 2 ? 1 : -1) * 2}deg)`,
                  boxShadow: "0 12px 30px rgba(0,0,0,.4)",
                }}
              >
                <Midia ctx={ctx} tempo={(ctx.duracaoFonte / (thumbs + 1)) * (i + 1)} />
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
}
