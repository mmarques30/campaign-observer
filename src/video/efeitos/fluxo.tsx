// Fluxo vivo: a operação desenhada como um fluxo de automação (estilo n8n). Os nós entram no
// instante da fala, as conexões se desenham e os dados correm por elas; um nó "trava" fica
// vermelho e o fluxo para antes dele; um nó "espera" gira o relógio. Uma linha de leitura
// varre o fluxo enquanto ele está na tela ("mapeando").
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { f } from "../fontes";
import { paraSaida } from "../tempo";
import { u, useEntradaSaida, type EfeitoProps } from "./base";
import { comAlfa, IconeCor } from "./falados";

type Estado = "ok" | "trava" | "espera";
type No = { titulo: string; icone?: string; de?: number; estado?: Estado; rotulo?: string };

const COR: Record<Estado, string> = { ok: "", trava: "#ff4d4f", espera: "#ffb020" };
const ROTULO: Record<Estado, string> = { ok: "ok", trava: "travado", espera: "aguardando" };

export function Fluxo({ p, ctx, dur }: EfeitoProps) {
  const { width, height } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur, { saidaFrames: 8 });
  const m = ctx.tl.marca;
  const t0 = paraSaida(ctx.trechos, ctx.deFonte);
  const quadro = (s: number | undefined) =>
    s == null ? 0 : Math.max(0, Math.round((paraSaida(ctx.trechos, s) - t0) * fps));
  const nos = (Array.isArray(p.nos) ? (p.nos as No[]) : []).filter((n) => n?.titulo).slice(0, 4);
  const n = Math.max(1, nos.length);
  const larguraTotal = width * 0.92;
  const gap = 46 * k;
  const larg = (larguraTotal - gap * (n - 1)) / n;
  const alt = 230 * k;
  const x0 = (width - larguraTotal) / 2;
  const top = (p.y != null ? Number(p.y) : 0.1) * height;
  const ini = nos.map((no, i) => quadro(no.de) + (no.de == null ? i * 8 : 0));
  const sp = (a: number, cfg = { damping: 14, stiffness: 170, mass: 0.6 }) =>
    spring({ frame: frame - a, fps, config: cfg });
  const cabecalho = sp(0, { damping: 20, stiffness: 140, mass: 0.7 });
  const piscar = 0.45 + 0.55 * Math.abs(Math.sin(frame / 7));
  // Linha de leitura: varre da esquerda para a direita a cada 2,2 s.
  const varre = ((frame % Math.round(fps * 2.2)) / (fps * 2.2)) * (larguraTotal + 120 * k) - 60 * k;

  return (
    <AbsoluteFill style={{ opacity: saida, pointerEvents: "none" }}>
      {/* Cabeçalho: "● mapeando a operação" */}
      <div
        style={{
          position: "absolute",
          left: x0,
          top: top - 74 * k,
          opacity: cabecalho,
          transform: `translateY(${(1 - cabecalho) * 20 * k}px)`,
          display: "flex",
          alignItems: "center",
          gap: 12 * k,
          padding: `${10 * k}px ${20 * k}px`,
          borderRadius: 999,
          background: comAlfa(m.fundo, 0.82),
          border: `${1.5 * k}px solid ${comAlfa(m.destaque, 0.5)}`,
          fontFamily: f("DM Mono"),
          fontSize: 24 * k,
          letterSpacing: 2 * k,
          textTransform: "uppercase",
          color: m.texto,
        }}
      >
        <span
          style={{
            width: 14 * k,
            height: 14 * k,
            borderRadius: 99,
            background: m.destaque,
            opacity: piscar,
            boxShadow: `0 0 ${14 * k}px ${m.destaque}`,
          }}
        />
        {String(p.titulo ?? "mapeando a operação")}
      </div>

      {/* Fundo do canvas: pontilhado discreto, como num editor de automação */}
      <div
        style={{
          position: "absolute",
          left: x0 - 18 * k,
          top: top - 18 * k,
          width: larguraTotal + 36 * k,
          height: alt + 36 * k,
          borderRadius: 30 * k,
          background: comAlfa(m.fundo, 0.72),
          backgroundImage: `radial-gradient(${comAlfa("#ffffff", 0.12)} ${1.6 * k}px, transparent ${1.8 * k}px)`,
          backgroundSize: `${26 * k}px ${26 * k}px`,
          border: `${1.5 * k}px solid ${comAlfa("#ffffff", 0.1)}`,
          backdropFilter: "blur(12px)",
          opacity: cabecalho,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: varre,
            width: 90 * k,
            background: `linear-gradient(90deg, transparent, ${comAlfa(m.destaque, 0.16)}, transparent)`,
          }}
        />
      </div>

      {/* Conexões */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
      >
        {nos.slice(1).map((no, j) => {
          const i = j + 1;
          const xa = x0 + i * (larg + gap) - gap;
          const xb = x0 + i * (larg + gap);
          const y = top + alt / 2;
          const desenha = interpolate(frame - ini[i], [0, 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const travado = no.estado === "trava";
          const cor = travado ? COR.trava : m.destaque;
          const comp = xb - xa;
          // Dados correndo: 2 pontos por conexão; param antes de um nó travado.
          const pontos = travado
            ? []
            : [0, 0.5].map((off) => (((frame - ini[i]) / (fps * 0.9) + off) % 1) * comp);
          return (
            <g key={i} opacity={desenha > 0 ? 1 : 0}>
              <line
                x1={xa}
                y1={y}
                x2={xa + comp * desenha}
                y2={y}
                stroke={cor}
                strokeWidth={4 * k}
                strokeDasharray={travado ? `${10 * k} ${8 * k}` : undefined}
                strokeLinecap="round"
                opacity={0.9}
              />
              {desenha >= 1 &&
                pontos.map((px, q) => (
                  <circle
                    key={q}
                    cx={xa + px}
                    cy={y}
                    r={6 * k}
                    fill={m.destaque}
                    style={{ filter: `drop-shadow(0 0 ${8 * k}px ${m.destaque})` }}
                  />
                ))}
              {travado && desenha >= 1 && (
                <text
                  x={xa + comp / 2}
                  y={y - 14 * k}
                  textAnchor="middle"
                  fontSize={30 * k}
                  fill={COR.trava}
                  fontFamily={f(m.fonteLegenda)}
                  fontWeight={900}
                >
                  ✕
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nós */}
      {nos.map((no, i) => {
        const s = sp(ini[i]);
        const estado: Estado = no.estado ?? "ok";
        const corEstado = estado === "ok" ? m.destaque : COR[estado];
        const tremer =
          estado === "trava" ? Math.sin(frame * 1.7) * 3 * k * (frame % 40 < 12 ? 1 : 0) : 0;
        const pulso = estado === "trava" ? 0.5 + 0.5 * Math.abs(Math.sin(frame / 6)) : 1;
        const giro = (frame * 9) % 360;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0 + i * (larg + gap) + tremer,
              top,
              width: larg,
              height: alt,
              opacity: Math.min(1, s * 1.4),
              transform: `translateY(${(1 - s) * 30 * k}px) scale(${interpolate(s, [0, 1], [0.85, 1])})`,
              borderRadius: 24 * k,
              background: `linear-gradient(180deg, ${comAlfa("#1b1b22", 0.96)}, ${comAlfa(m.fundo, 0.96)})`,
              border: `${2.5 * k}px solid ${estado === "ok" ? comAlfa("#ffffff", 0.16) : corEstado}`,
              boxShadow:
                estado === "ok"
                  ? `0 ${14 * k}px ${36 * k}px rgba(0,0,0,.5)`
                  : `0 0 ${36 * k * pulso}px ${comAlfa(corEstado, 0.55)}, 0 ${14 * k}px ${36 * k}px rgba(0,0,0,.5)`,
              padding: `${20 * k}px ${18 * k}px`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Portas de entrada/saída, como num nó de automação */}
            {i > 0 && <Porta lado="esq" k={k} cor={corEstado} />}
            {i < n - 1 && <Porta lado="dir" k={k} cor={m.destaque} />}
            <div style={{ display: "flex", alignItems: "center", gap: 12 * k }}>
              <div
                style={{
                  position: "relative",
                  width: 64 * k,
                  height: 64 * k,
                  borderRadius: 18 * k,
                  background: comAlfa(corEstado, 0.16),
                  border: `${1.5 * k}px solid ${comAlfa(corEstado, 0.5)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconeCor nome={no.icone ?? "ph:gear-bold"} cor={corEstado} tamanho={36 * k} />
                {estado === "espera" && (
                  <svg
                    width={80 * k}
                    height={80 * k}
                    style={{
                      position: "absolute",
                      left: -8 * k,
                      top: -8 * k,
                      transform: `rotate(${giro}deg)`,
                    }}
                  >
                    <circle
                      cx={40 * k}
                      cy={40 * k}
                      r={36 * k}
                      fill="none"
                      stroke={COR.espera}
                      strokeWidth={4 * k}
                      strokeDasharray={`${60 * k} ${200 * k}`}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <div
              style={{
                fontFamily: f(m.fonteLegenda),
                fontWeight: 800,
                fontSize: (n >= 4 ? 28 : 32) * k,
                lineHeight: 1.1,
                color: m.texto,
                letterSpacing: -0.4 * k,
              }}
            >
              {no.titulo}
            </div>
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                alignItems: "center",
                gap: 8 * k,
                fontFamily: f("DM Mono"),
                fontSize: 19 * k,
                letterSpacing: 1.5 * k,
                textTransform: "uppercase",
                color: corEstado,
                padding: `${4 * k}px ${12 * k}px`,
                borderRadius: 999,
                background: comAlfa(corEstado, 0.14),
              }}
            >
              <span
                style={{
                  width: 9 * k,
                  height: 9 * k,
                  borderRadius: 99,
                  background: corEstado,
                  opacity: estado === "ok" ? 1 : piscar,
                }}
              />
              {no.rotulo ?? ROTULO[estado]}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function Porta({ lado, k, cor }: { lado: "esq" | "dir"; k: number; cor: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        [lado === "esq" ? "left" : "right"]: -9 * k,
        width: 16 * k,
        height: 16 * k,
        marginTop: -8 * k,
        borderRadius: 99,
        background: "#0B0B0F",
        border: `${3 * k}px solid ${cor}`,
      }}
    />
  );
}
