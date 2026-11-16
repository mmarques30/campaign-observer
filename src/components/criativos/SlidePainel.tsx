// Estilo "painel": o mesmo carrossel (mesmos layouts, textos e fotos), desenhado com a linguagem
// de dashboard moderno: cena desfocada ao fundo, anotações com linhas saindo da foto até os
// valores, trilha acesa, anel de destaque, brilho e estado de "hover" congelado (cursor no botão).
// Menos caixas: a imagem é o palco e os dados se integram a ela.
// Tudo em HTML/SVG sem backdrop-filter, para o PNG exportado sair igual à tela.
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Globe,
  Lock,
  Mail,
  Phone,
  Search,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { FORMATOS, type Design, type Formato, type Slide, type Visual } from "@/criativos/design";
import type { FotoComUrl } from "@/lib/criativos";
import { ICONES_VISUAL } from "./Visuais";

type Props = {
  slide: Slide;
  design: Design;
  formato: Formato;
  fotos: Map<string, FotoComUrl>;
  indice: number;
  total: number;
};

/** Layouts que o estilo painel desenha; os demais caem no desenho clássico. */
export const LAYOUTS_PAINEL = ["capa", "texto", "topico", "foto", "cta"] as const;

const PERDA = "#FF7A66";
const fonte = (n: string) => `"${n}", Inter, sans-serif`;

const ajusta = (t: string | null | undefined, base: number, min: number, ref: number) => {
  const n = (t ?? "").replace(/\*\*/g, "").length || 1;
  return Math.round(Math.max(min, Math.min(base, base * Math.sqrt(ref / n))));
};

function Rico({ t, cor, peso }: { t: string; cor: string; peso?: number }) {
  return (
    <>
      {t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <span key={i} style={{ color: cor, fontWeight: peso }}>
            {p.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Img({ url, foco, style }: { url?: string; foco?: string | null; style?: CSSProperties }) {
  if (!url) return <div style={{ background: "#ffffff0d", ...style }} />;
  return (
    <img
      src={url}
      crossOrigin="anonymous"
      style={{ objectFit: "cover", objectPosition: foco ?? "50% 30%", display: "block", ...style }}
    />
  );
}

function Icone({ nome, cor, tam }: { nome?: string | null; cor: string; tam: number }) {
  const I = ICONES_VISUAL[(nome ?? "").toLowerCase()] ?? Sparkles;
  return <I size={tam} strokeWidth={2.2} color={cor} />;
}

type Marca = NonNullable<Slide["marcas"]>[number];

/** Anotações saindo da imagem: ponto aceso sobre a foto, linha fina e o valor na ponta. */
function Marcas({ marcas, cor, k }: { marcas: Marca[]; cor: string; k: number }) {
  const sombra = "0 2px 16px rgba(0,0,0,.95), 0 0 3px rgba(0,0,0,.9)";
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        {marcas.map((m, i) => (
          <g key={i}>
            <line
              x1={m.x}
              y1={m.y}
              x2={m.lx}
              y2={m.ly}
              stroke="#000"
              strokeOpacity={0.45}
              strokeWidth={6}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={m.x}
              y1={m.y}
              x2={m.lx}
              y2={m.ly}
              stroke={cor}
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      {marcas.map((m, i) => {
        const dir = m.lx >= m.x;
        return (
          <div key={i}>
            {/* ponto com anéis, como um marcador ao vivo */}
            <div
              style={{
                position: "absolute",
                left: `${m.x}%`,
                top: `${m.y}%`,
                transform: "translate(-50%,-50%)",
              }}
            >
              <div
                style={{
                  width: 64 * k,
                  height: 64 * k,
                  borderRadius: 99,
                  border: `2px solid ${cor}66`,
                  background: `${cor}1A`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 20 * k,
                    height: 20 * k,
                    borderRadius: 99,
                    background: cor,
                    boxShadow: `0 0 18px ${cor}, 0 0 4px #000`,
                  }}
                />
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: `${m.lx}%`,
                top: `${m.ly}%`,
                transform: dir ? "translate(0,-50%)" : "translate(-100%,-50%)",
                padding: dir ? `0 0 0 ${16 * k}px` : `0 ${16 * k}px 0 0`,
                display: "flex",
                flexDirection: "column",
                alignItems: dir ? "flex-start" : "flex-end",
                textAlign: dir ? "left" : "right",
                gap: 4 * k,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  [dir ? "left" : "right"]: -5,
                  top: "50%",
                  width: 10,
                  height: 10,
                  marginTop: -5,
                  borderRadius: 9,
                  background: cor,
                }}
              />
              {m.rotulo && (
                <span
                  style={{
                    fontSize: 19 * k,
                    fontWeight: 800,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,.8)",
                    textShadow: sombra,
                  }}
                >
                  {m.rotulo}
                </span>
              )}
              <span
                style={{
                  fontSize: 40 * k,
                  fontWeight: 900,
                  letterSpacing: -1.5,
                  lineHeight: 1.05,
                  color: "#fff",
                  textShadow: sombra,
                }}
              >
                {m.valor}
              </span>
              {m.tag && (
                <span
                  style={{
                    fontSize: 19 * k,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: cor,
                    textShadow: sombra,
                  }}
                >
                  {m.tag}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Tela = NonNullable<Slide["tela"]>;

const ICONES_TELA: Record<string, typeof Phone> = {
  telefone: Phone,
  email: Mail,
  site: Globe,
  dominio: Globe,
};

function Cursor({ tam, style }: { tam: number; style?: CSSProperties }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,.6))",
        zIndex: 4,
        ...style,
      }}
    >
      <path
        d="M4 2l15 11.2-6.5.9 3.7 7.3-2.9 1.4-3.7-7.4L4 20z"
        fill="#fff"
        stroke="#0B0B0F"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Interface desenhada (janela de app) para tutorial: mostra o passo na tela, sem foto de IA. */
function TelaApp({ tela, cor, k }: { tela: Tela; cor: string; k: number }) {
  const f = (n: number) => n * k * 1.18;
  const escolha = (tela.opcoes ?? []).some((o) => o.marcado);
  const cursorNoBotao = !!tela.botao;
  const linha: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: f(18),
    padding: `${f(18)}px ${f(20)}px`,
    borderRadius: 22,
    background: "rgba(255,255,255,.05)",
    border: "1.5px solid rgba(255,255,255,.1)",
  };
  return (
    <div
      style={{
        ...vidro(true, 36),
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: `0 50px 100px rgba(0,0,0,.6), 0 0 0 8px rgba(255,255,255,.03), 0 0 80px ${cor}1F`,
      }}
    >
      {/* barra da janela */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: `${f(18)}px ${f(22)}px`,
          borderBottom: "1.5px solid rgba(255,255,255,.08)",
          background: "rgba(255,255,255,.03)",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span
            key={c}
            style={{ width: f(16), height: f(16), borderRadius: 99, background: c, opacity: 0.8 }}
          />
        ))}
        {tela.url && (
          <span
            style={{
              flex: 1,
              marginLeft: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: `${f(10)}px ${f(18)}px`,
              borderRadius: 99,
              background: "rgba(255,255,255,.07)",
              fontSize: f(22),
              color: "rgba(255,255,255,.75)",
              fontWeight: 600,
            }}
          >
            <Lock size={f(18)} color="rgba(255,255,255,.55)" />
            {tela.url}
          </span>
        )}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: `${f(28)}px ${f(30)}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: f(18),
          position: "relative",
        }}
      >
        {tela.titulo && (
          <div style={{ fontSize: f(32), fontWeight: 800, letterSpacing: -1 }}>{tela.titulo}</div>
        )}
        {tela.busca && (
          <div
            style={{
              ...linha,
              borderRadius: 99,
              border: `1.5px solid ${cor}88`,
              boxShadow: `0 0 30px ${cor}22`,
            }}
          >
            <Search size={f(28)} color={cor} />
            <span style={{ fontSize: f(28), fontWeight: 600 }}>{tela.busca}</span>
            <span
              style={{ width: 3, height: f(32), background: cor, borderRadius: 2, marginLeft: -10 }}
            />
          </div>
        )}
        {tela.resultados?.map((r, i) => (
          <div
            key={i}
            style={{
              ...linha,
              position: "relative",
              ...(i === 0
                ? { border: `1.5px solid ${cor}99`, background: `${cor}12` }
                : { opacity: 0.6 }),
            }}
          >
            <span
              style={{
                width: f(64),
                height: f(64),
                borderRadius: 18,
                background: i === 0 ? cor : "rgba(255,255,255,.12)",
                color: "#0B0B0F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: f(30),
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              {r.nome.slice(0, 1).toUpperCase()}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: f(27), fontWeight: 800 }}>{r.nome}</div>
              {r.detalhe && (
                <div style={{ fontSize: f(21), color: "rgba(255,255,255,.55)", marginTop: 2 }}>
                  {r.detalhe}
                </div>
              )}
            </div>
            {r.acao && (
              <span
                style={{
                  position: "relative",
                  padding: `${f(12)}px ${f(22)}px`,
                  borderRadius: 99,
                  fontSize: f(21),
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  color: i === 0 ? "#0B0B0F" : "#fff",
                  background: i === 0 ? cor : "transparent",
                  border: i === 0 ? "none" : "1.5px solid rgba(255,255,255,.3)",
                  boxShadow: i === 0 ? `0 0 30px ${cor}99` : undefined,
                }}
              >
                {r.acao}
                {i === 0 && !cursorNoBotao && (
                  <Cursor tam={f(52)} style={{ right: f(-18), bottom: f(-34) }} />
                )}
              </span>
            )}
          </div>
        ))}
        {tela.opcoes?.map((o, i) => {
          const I =
            ICONES_TELA[(o.icone ?? "").toLowerCase()] ??
            ICONES_VISUAL[(o.icone ?? "").toLowerCase()] ??
            Sparkles;
          return (
            <div
              key={i}
              style={{
                ...linha,
                ...(o.marcado
                  ? {
                      border: `1.5px solid ${cor}`,
                      background: `${cor}14`,
                      boxShadow: `0 0 30px ${cor}26`,
                    }
                  : {}),
              }}
            >
              <span
                style={{
                  width: f(60),
                  height: f(60),
                  borderRadius: 99,
                  background: o.marcado ? `${cor}26` : "rgba(255,255,255,.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <I size={f(28)} color={o.marcado ? cor : "rgba(255,255,255,.8)"} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: f(27), fontWeight: 800 }}>{o.rotulo}</div>
                {o.detalhe && (
                  <div style={{ fontSize: f(21), color: "rgba(255,255,255,.55)", marginTop: 2 }}>
                    {o.detalhe}
                  </div>
                )}
              </div>
              {escolha && (
                <span
                  style={{
                    width: f(34),
                    height: f(34),
                    borderRadius: 99,
                    border: `2.5px solid ${o.marcado ? cor : "rgba(255,255,255,.3)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {o.marcado && (
                    <span
                      style={{
                        width: f(16),
                        height: f(16),
                        borderRadius: 99,
                        background: cor,
                        boxShadow: `0 0 12px ${cor}`,
                      }}
                    />
                  )}
                </span>
              )}
            </div>
          );
        })}
        {tela.campos?.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: f(19),
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "rgba(255,255,255,.5)",
              }}
            >
              {c.rotulo}
            </span>
            <div
              style={{
                ...linha,
                padding: `${f(14)}px ${f(20)}px`,
                ...(c.ok ? { border: `1.5px solid ${cor}88` } : {}),
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: f(25),
                  fontWeight: 600,
                  color: c.valor ? "#fff" : "rgba(255,255,255,.35)",
                }}
              >
                {c.valor || "—"}
              </span>
              {c.ok && (
                <span
                  style={{
                    width: f(34),
                    height: f(34),
                    borderRadius: 99,
                    background: cor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 16px ${cor}88`,
                  }}
                >
                  <Check size={f(20)} color="#0B0B0F" strokeWidth={3.5} />
                </span>
              )}
            </div>
          </div>
        ))}
        {tela.chat?.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.de === "pessoa" ? "flex-end" : "flex-start",
              gap: 12,
            }}
          >
            {m.de === "ia" && (
              <span
                style={{
                  width: f(48),
                  height: f(48),
                  borderRadius: 99,
                  background: `${cor}26`,
                  border: `1.5px solid ${cor}88`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={f(24)} color={cor} />
              </span>
            )}
            <div
              style={{
                maxWidth: "82%",
                padding: `${f(16)}px ${f(22)}px`,
                borderRadius: 26,
                fontSize: f(25),
                lineHeight: 1.35,
                fontWeight: 500,
                background: m.de === "pessoa" ? "rgba(255,255,255,.12)" : "transparent",
                border: m.de === "ia" ? "1.5px solid rgba(255,255,255,.1)" : "none",
                color: m.de === "pessoa" ? "#fff" : "rgba(255,255,255,.85)",
              }}
            >
              <Rico t={m.texto} cor={cor} peso={800} />
            </div>
          </div>
        ))}
        {(tela.metricas?.length ?? 0) > 0 && (
          <div style={{ display: "flex", gap: f(18) }}>
            {tela.metricas!.map((m, i) => {
              const w = 380 * k;
              const h = 150 * k;
              const max = Math.max(...m.pontos);
              const min = Math.min(...m.pontos);
              const pts = m.pontos.map((v, j) => [
                (j / (m.pontos.length - 1)) * w,
                10 + (1 - (v - min) / (max - min || 1)) * (h - 20),
              ]);
              const d = pts
                .map(([x, y], j) => `${j ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
                .join(" ");
              const id = `met${i}`;
              return (
                <div
                  key={i}
                  style={{
                    ...linha,
                    flex: 1,
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: `${f(20)}px`,
                  }}
                >
                  <span
                    style={{ fontSize: f(22), fontWeight: 800, color: "rgba(255,255,255,.75)" }}
                  >
                    {m.rotulo}
                  </span>
                  <svg
                    width="100%"
                    height={h}
                    viewBox={`0 0 ${w} ${h}`}
                    preserveAspectRatio="none"
                    style={{ overflow: "visible" }}
                  >
                    <defs>
                      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={cor} stopOpacity=".45" />
                        <stop offset="1" stopColor={cor} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
                    <path
                      d={d}
                      fill="none"
                      stroke={cor}
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx={pts[pts.length - 1][0]}
                      cy={pts[pts.length - 1][1]}
                      r={8}
                      fill={cor}
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        )}
        {tela.aviso && (
          <div style={{ ...linha, border: `1.5px solid ${PERDA}77`, background: `${PERDA}14` }}>
            <AlertTriangle size={f(28)} color={PERDA} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: f(23), fontWeight: 700, lineHeight: 1.3 }}>
              <Rico t={tela.aviso} cor={PERDA} peso={900} />
            </span>
          </div>
        )}
        {tela.botao && (
          <div style={{ position: "relative", alignSelf: "flex-start" }}>
            <div
              style={{
                padding: `${f(20)}px ${f(40)}px`,
                borderRadius: 99,
                background: cor,
                color: "#0B0B0F",
                fontSize: f(26),
                fontWeight: 900,
                boxShadow: `0 0 0 8px ${cor}22, 0 0 50px ${cor}99`,
              }}
            >
              {tela.botao}
            </div>
            <Cursor tam={f(56)} style={{ right: f(-24), bottom: f(-36) }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Vidro: preenchimento translúcido, borda fina clara, brilho no topo e sombra longa. */
const vidro = (escuro = false, raio = 36): CSSProperties => ({
  background: escuro
    ? "linear-gradient(180deg, rgba(22,28,24,.78) 0%, rgba(10,13,11,.72) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,.11) 0%, rgba(255,255,255,.035) 100%)",
  border: "1.5px solid rgba(255,255,255,.15)",
  borderRadius: raio,
  boxShadow:
    "0 40px 90px rgba(0,0,0,.55), 0 10px 24px rgba(0,0,0,.35), inset 0 1.5px 0 rgba(255,255,255,.14)",
});

/** Linha decorativa que cai (perda), sem número: só a direção. */
function Queda({ i, cor, w = 150, h = 56 }: { i: number; cor: string; w?: number; h?: number }) {
  const formas = [
    [0.15, 0.3, 0.22, 0.55, 0.48, 0.85],
    [0.2, 0.12, 0.42, 0.38, 0.7, 0.88],
    [0.1, 0.35, 0.28, 0.5, 0.62, 0.8],
    [0.25, 0.18, 0.5, 0.45, 0.78, 0.9],
  ][i % 4];
  const pts = formas.map((y, k) => [(k / (formas.length - 1)) * w, 6 + y * (h - 12)]);
  const d = pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `q${i}`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cor} stopOpacity=".35" />
          <stop offset="1" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={cor}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={6} fill={cor} />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={14}
        fill={cor}
        opacity={0.22}
      />
    </svg>
  );
}

/** Anel com a fatia em destaque (ex.: 15%), com brilho. */
function Anel({ pct, cor, tam }: { pct: number; cor: string; tam: number }) {
  const r = tam / 2 - 18;
  const c = 2 * Math.PI * r;
  const fat = Math.max(0.03, Math.min(1, pct / 100));
  return (
    <svg width={tam} height={tam} style={{ overflow: "visible" }}>
      <defs>
        <filter id="brilhoAnel" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <circle
        cx={tam / 2}
        cy={tam / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.08)"
        strokeWidth={22}
      />
      {/* marcas do mostrador */}
      {Array.from({ length: 40 }).map((_, k) => {
        const a = (k / 40) * 2 * Math.PI - Math.PI / 2;
        const r1 = r - 28;
        const r2 = r - (k % 5 ? 34 : 40);
        return (
          <line
            key={k}
            x1={tam / 2 + r1 * Math.cos(a)}
            y1={tam / 2 + r1 * Math.sin(a)}
            x2={tam / 2 + r2 * Math.cos(a)}
            y2={tam / 2 + r2 * Math.sin(a)}
            stroke="rgba(255,255,255,.22)"
            strokeWidth={2}
          />
        );
      })}
      <circle
        cx={tam / 2}
        cy={tam / 2}
        r={r}
        fill="none"
        stroke={cor}
        strokeWidth={22}
        strokeLinecap="round"
        strokeDasharray={`${c * fat} ${c}`}
        transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
        filter="url(#brilhoAnel)"
        opacity={0.8}
      />
      <circle
        cx={tam / 2}
        cy={tam / 2}
        r={r}
        fill="none"
        stroke={cor}
        strokeWidth={22}
        strokeLinecap="round"
        strokeDasharray={`${c * fat} ${c}`}
        transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
      />
    </svg>
  );
}

/** Calendário do mês com a janela até o prazo e o dia final aceso. */
function Calendario({ iso, cor, k }: { iso: string; cor: string; k: number }) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const ano = d.getFullYear();
  const mes = d.getMonth();
  const dia = d.getDate();
  const primeiro = new Date(ano, mes, 1).getDay();
  const dias = new Date(ano, mes + 1, 0).getDate();
  const nomeMes = d.toLocaleDateString("pt-BR", { month: "long" });
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiro }, () => null),
    ...Array.from({ length: dias }, (_, i) => i + 1),
  ];
  const cel = 50 * k;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 * k }}>
      <div
        style={{
          fontSize: 22 * k,
          fontWeight: 800,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "rgba(255,255,255,.6)",
        }}
      >
        {nomeMes}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cel}px)`, gap: 6 * k }}>
        {["D", "S", "T", "Q", "Q", "S", "S"].map((l, i) => (
          <div
            key={`l${i}`}
            style={{
              fontSize: 18 * k,
              fontWeight: 700,
              color: "rgba(255,255,255,.35)",
              textAlign: "center",
            }}
          >
            {l}
          </div>
        ))}
        {celulas.map((n, i) => {
          const final = n === dia;
          const janela = n != null && n >= dia - 14 && n < dia;
          return (
            <div
              key={i}
              style={{
                height: cel * 0.82,
                borderRadius: 12 * k,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20 * k,
                fontWeight: final ? 900 : 600,
                color: final ? "#0B0B0F" : janela ? "#fff" : "rgba(255,255,255,.3)",
                background: final ? cor : janela ? `${cor}26` : "transparent",
                boxShadow: final ? `0 0 28px ${cor}AA` : undefined,
              }}
            >
              {n ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Gráfico de linhas com área em gradiente, brilho e tooltip congelado no último ponto. */
function LinhasPainel({
  v,
  cor,
  larg,
  alt,
}: {
  v: Extract<Visual, { tipo: "linhas" }>;
  cor: string;
  larg: number;
  alt: number;
}) {
  const todos = v.series.flatMap((s) => s.pontos);
  const max = Math.max(...todos) * 1.15;
  const min = Math.min(0, ...todos);
  const n = Math.max(...v.series.map((s) => s.pontos.length));
  const pad = { l: 10, r: 30, t: 30, b: 50 };
  const x = (i: number) => pad.l + (i / (n - 1)) * (larg - pad.l - pad.r);
  const y = (val: number) => pad.t + (1 - (val - min) / (max - min)) * (alt - pad.t - pad.b);
  const dest = v.series.find((s) => s.destaque) ?? v.series[0];
  const ult = dest.pontos.length - 1;
  const cx = x(ult);
  const cy = y(dest.pontos[ult]);
  return (
    <div style={{ position: "relative", width: larg, height: alt }}>
      <svg width={larg} height={alt} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="areaPainel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={cor} stopOpacity=".42" />
            <stop offset="1" stopColor={cor} stopOpacity="0" />
          </linearGradient>
          <filter id="brilhoLinha" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={pad.l}
            x2={larg - pad.r}
            y1={pad.t + g * (alt - pad.t - pad.b)}
            y2={pad.t + g * (alt - pad.t - pad.b)}
            stroke="rgba(255,255,255,.08)"
            strokeDasharray="6 10"
          />
        ))}
        <line
          x1={cx}
          x2={cx}
          y1={pad.t}
          y2={alt - pad.b}
          stroke="rgba(255,255,255,.25)"
          strokeDasharray="4 8"
        />
        {v.series.map((s, si) => {
          const d = s.pontos
            .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`)
            .join(" ");
          const ehDest = s === dest;
          return (
            <g key={si}>
              {ehDest && (
                <path
                  d={`${d} L${x(s.pontos.length - 1)},${alt - pad.b} L${x(0)},${alt - pad.b} Z`}
                  fill="url(#areaPainel)"
                />
              )}
              {ehDest && (
                <path
                  d={d}
                  fill="none"
                  stroke={cor}
                  strokeWidth={10}
                  filter="url(#brilhoLinha)"
                  opacity={0.7}
                />
              )}
              <path
                d={d}
                fill="none"
                stroke={ehDest ? cor : "rgba(255,255,255,.45)"}
                strokeWidth={ehDest ? 5 : 3.5}
                strokeDasharray={ehDest ? undefined : "2 10"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={22} fill={cor} opacity={0.22} />
        <circle cx={cx} cy={cy} r={10} fill="#0B0B0F" stroke={cor} strokeWidth={5} />
        {(v.eixo ?? []).map((r, i) =>
          r ? (
            <text
              key={i}
              x={x(i)}
              y={alt - 8}
              fill="rgba(255,255,255,.5)"
              fontSize={24}
              fontFamily="Inter, sans-serif"
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            >
              {r}
            </text>
          ) : null,
        )}
      </svg>
      {/* tooltip congelado, como no hover de um dashboard */}
      <div
        style={{
          position: "absolute",
          right: larg - cx + 26,
          top: Math.max(0, cy - 30),
          ...vidro(true, 18),
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 22,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 99,
            background: cor,
            boxShadow: `0 0 12px ${cor}`,
          }}
        />
        {dest.nome}
      </div>
    </div>
  );
}

export const SlidePainel = forwardRef<HTMLDivElement, Props>(function SlidePainel(
  { slide: s, design, formato, fotos, indice, total },
  ref,
) {
  const [W, H] = FORMATOS[formato];
  const story = formato === "9:16";
  const segTopo = story ? 290 : 0;
  const segBase = story ? 340 : 0;
  const t = design.tema;
  const hi = t.destaque;
  const url = (id?: string | null) => (id ? fotos.get(id)?.url : undefined);
  const foto = (i: number) => url(s.fotos?.[i]);
  const cenario = url(design.cenario) ?? url(design.slides[0]?.fotos?.[0]);
  const ultimo = indice === total - 1;
  const ehCapa = s.layout === "capa";

  // Área útil entre a barra de cima e o rodapé; k encolhe tudo nos formatos mais baixos.
  const hudTopo = story ? 262 : 52;
  const topo = hudTopo + 64 + 40;
  const base = segBase + 150;
  const util = H - topo - base;
  const k = Math.min(1, Math.max(0.72, util / 1100));
  const quadrado = formato === "1:1";

  const raiz: CSSProperties = {
    width: W,
    height: H,
    position: "relative",
    overflow: "hidden",
    background: "#050706",
    color: "#fff",
    fontFamily: fonte(t.fonteTexto),
    boxSizing: "border-box",
  };

  // ── fundo: cena desfocada + brilhos + grade de pontos ─────────────────────
  const ambiente = (forte = false, semCena = false) => (
    <>
      {cenario && !semCena && (
        <img
          src={cenario}
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            left: -80,
            top: -80,
            width: W + 160,
            height: H + 160,
            objectFit: "cover",
            filter: `blur(${forte ? 26 : 40}px) brightness(${forte ? 0.5 : 0.36}) saturate(.9)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(55% 32% at 88% 6%, ${hi}40 0%, transparent 70%), radial-gradient(60% 40% at 0% 100%, ${hi}22 0%, transparent 70%), linear-gradient(180deg, rgba(5,7,6,.25) 0%, rgba(5,7,6,.7) 60%, rgba(5,7,6,.92) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,.09) 1.6px, transparent 1.6px)",
          backgroundSize: "38px 38px",
          opacity: 0.55,
        }}
      />
    </>
  );

  // ── barra de cima: campanha à esquerda, logo à direita ────────────────────
  const campanha = s.etiqueta?.trim() || design.campanha?.trim();
  const hud = (
    <div
      style={{
        position: "absolute",
        top: hudTopo,
        left: 64,
        right: 64,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 6,
      }}
    >
      {campanha ? (
        <div
          style={{
            ...vidro(true, 999),
            height: 64,
            padding: "0 26px 0 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: `0 0 0 1px ${hi}55, 0 12px 40px rgba(0,0,0,.5), 0 0 40px ${hi}33`,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 99,
              background: hi,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 18px ${hi}`,
            }}
          >
            <Zap size={20} color="#0B0B0F" fill="#0B0B0F" />
          </span>
          <span
            style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase" }}
          >
            {campanha}
          </span>
          {design.campanhaDetalhe && (
            <>
              <span style={{ width: 1.5, height: 26, background: "rgba(255,255,255,.25)" }} />
              <span style={{ fontSize: 22, fontWeight: 700, color: hi }}>
                {design.campanhaDetalhe}
              </span>
            </>
          )}
        </div>
      ) : (
        <span />
      )}
      {design.assinatura === "marca" || design.logo ? (
        <img
          src="/brand/iaplicada-logo-dark.png"
          alt="IAplicada"
          style={{ width: 200, height: "auto" }}
        />
      ) : (
        <span />
      )}
    </div>
  );

  // ── rodapé: progresso em segmentos + paginação com botões redondos ────────
  const rodape = (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        bottom: segBase + 52,
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 6,
      }}
    >
      {ehCapa ? (
        <span
          style={{ fontSize: 24, fontWeight: 800, letterSpacing: 5, color: "rgba(255,255,255,.8)" }}
        >
          DESLIZE PARA VER
        </span>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === indice ? 64 : 30,
                height: 8,
                borderRadius: 99,
                background: i <= indice ? hi : "rgba(255,255,255,.18)",
                boxShadow: i === indice ? `0 0 14px ${hi}` : undefined,
              }}
            />
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {!ehCapa && (
          <span
            style={{
              ...vidro(true, 99),
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={30} color="rgba(255,255,255,.7)" />
          </span>
        )}
        <span style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {String(indice + 1).padStart(2, "0")}
          <span style={{ color: "rgba(255,255,255,.4)", fontWeight: 600 }}>
            {" "}
            / {String(total).padStart(2, "0")}
          </span>
        </span>
        {!ultimo && (
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: 99,
              background: hi,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 30px ${hi}99`,
            }}
          >
            <ChevronRight size={32} color="#0B0B0F" strokeWidth={3} />
          </span>
        )}
      </div>
    </div>
  );

  const eyebrow = (texto: string, icone?: ReactNode) => (
    <div
      style={{
        alignSelf: "flex-start",
        ...vidro(true, 999),
        padding: "12px 24px 12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 24 * k,
        fontWeight: 800,
        letterSpacing: 3,
        textTransform: "uppercase",
      }}
    >
      {icone ?? (
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 99,
            background: hi,
            boxShadow: `0 0 14px ${hi}`,
          }}
        />
      )}
      {texto}
    </div>
  );

  const titulo = (txt: string, base: number, min: number, ref: number) => (
    <div
      style={{
        fontSize: ajusta(txt, base, min, ref) * k,
        fontWeight: 800,
        lineHeight: 1.02,
        letterSpacing: -3,
        textShadow: "0 8px 40px rgba(0,0,0,.45)",
      }}
    >
      <Rico t={txt} cor={hi} />
    </div>
  );

  let corpo: ReactNode = null;

  if (ehCapa) {
    corpo = (
      <>
        <Img
          url={foto(0)}
          foco={s.foco}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(70% 28% at 15% 92%, ${hi}30 0%, transparent 70%), linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,.72) 74%, rgba(0,0,0,.95) 100%)`,
          }}
        />
        {(s.marcas?.length ?? 0) > 0 && <Marcas marcas={s.marcas!} cor={hi} k={k} />}
        {/* widgets flutuando sobre a cena */}
        {!quadrado && (s.destaque || (s.chips?.length ?? 0) > 0) && (
          <div
            style={{
              position: "absolute",
              left: 64,
              top: topo + 10,
              width: 420 * k,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            {s.destaque && (
              <div
                style={{
                  ...vidro(true),
                  padding: `${28 * k}px ${30 * k}px`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: -60,
                    top: -60,
                    width: 220,
                    height: 220,
                    borderRadius: 999,
                    background: `radial-gradient(circle, ${hi}55 0%, transparent 70%)`,
                  }}
                />
                {s.destaque.rotulo && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 20 * k,
                      fontWeight: 800,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      color: hi,
                    }}
                  >
                    <Zap size={22 * k} color={hi} fill={hi} /> {s.destaque.rotulo}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 132 * k,
                    fontWeight: 900,
                    letterSpacing: -6,
                    lineHeight: 1,
                    marginTop: 8,
                    textShadow: `0 0 40px ${hi}66`,
                  }}
                >
                  {s.destaque.valor}
                </div>
                {s.destaque.detalhe && (
                  <div
                    style={{
                      fontSize: 24 * k,
                      lineHeight: 1.3,
                      color: "rgba(255,255,255,.75)",
                      marginTop: 8,
                    }}
                  >
                    {s.destaque.detalhe}
                  </div>
                )}
              </div>
            )}
            {(s.chips?.length ?? 0) > 0 && (
              <div
                style={{
                  ...vidro(true),
                  padding: `${22 * k}px ${26 * k}px`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16 * k,
                }}
              >
                {s.chips!.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      fontSize: 25 * k,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 36 * k,
                        height: 36 * k,
                        borderRadius: 99,
                        background: `${hi}22`,
                        border: `1.5px solid ${hi}88`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={20 * k} color={hi} strokeWidth={3} />
                    </span>
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: base,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {titulo(s.titulo ?? "", 116, 80, 26)}
          {s.subtitulo && (
            <div style={{ fontSize: 36 * k, lineHeight: 1.3, color: "rgba(255,255,255,.85)" }}>
              <Rico t={s.subtitulo} cor={hi} peso={700} />
            </div>
          )}
        </div>
      </>
    );
  } else if (s.layout === "topico") {
    const a = (s.marcas?.length ?? 0) > 0 ? null : s.alerta;
    corpo = (
      <>
        {ambiente()}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: topo,
            bottom: base,
            display: "flex",
            flexDirection: "column",
            gap: 28 * k,
          }}
        >
          {s.rotulo && eyebrow(s.rotulo)}
          {titulo(s.titulo ?? "", 92, 60, 22)}
          {s.tela && (
            <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
              <TelaApp tela={s.tela} cor={hi} k={k} />
            </div>
          )}
          {!s.tela && (s.fotos?.length ?? 0) > 0 && (
            <div
              style={{ position: "relative", flex: 1, minHeight: 0, marginBottom: a ? 70 * k : 0 }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 40,
                  overflow: "hidden",
                  border: "1.5px solid rgba(255,255,255,.18)",
                  boxShadow: `0 50px 100px rgba(0,0,0,.6), 0 0 0 8px rgba(255,255,255,.03), 0 0 80px ${hi}1F`,
                }}
              >
                <Img url={foto(0)} foco={s.foco} style={{ width: "100%", height: "100%" }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 100%)",
                  }}
                />
                {(s.marcas?.length ?? 0) > 0 && <Marcas marcas={s.marcas!} cor={hi} k={k} />}
              </div>
              {a && (
                <div
                  style={{
                    position: "absolute",
                    left: 28,
                    right: 28,
                    bottom: -70 * k,
                    ...vidro(true, 30),
                    padding: `${22 * k}px ${24 * k}px`,
                    display: "flex",
                    alignItems: "center",
                    gap: 20 * k,
                    boxShadow: `0 40px 90px rgba(0,0,0,.7), 0 0 0 1px ${hi}44, 0 0 50px ${hi}26`,
                  }}
                >
                  <span
                    style={{
                      width: 76 * k,
                      height: 76 * k,
                      borderRadius: 22,
                      background: `linear-gradient(135deg, ${hi} 0%, ${hi}AA 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 0 30px ${hi}88`,
                    }}
                  >
                    <Icone nome={a.icone} cor="#0B0B0F" tam={40 * k} />
                  </span>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 28 * k, fontWeight: 800, lineHeight: 1.15 }}>
                      {a.titulo}
                    </div>
                    {a.detalhe && (
                      <div
                        style={{
                          fontSize: 22 * k,
                          lineHeight: 1.3,
                          color: "rgba(255,255,255,.65)",
                        }}
                      >
                        {a.detalhe}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{ fontSize: 20 * k, color: "rgba(255,255,255,.5)", fontWeight: 600 }}
                    >
                      {a.quando ?? "agora"}
                    </span>
                    {a.status && (
                      <span
                        style={{
                          fontSize: 18 * k,
                          fontWeight: 800,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          color: hi,
                          border: `1.5px solid ${hi}99`,
                          background: `${hi}1A`,
                          borderRadius: 99,
                          padding: "6px 14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.status}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {s.texto && (
            <div
              style={{
                fontSize: ajusta(s.texto, 38, 30, 180) * k,
                lineHeight: 1.38,
                color: "rgba(255,255,255,.8)",
              }}
            >
              <Rico t={s.texto} cor={hi} peso={800} />
            </div>
          )}
        </div>
      </>
    );
  } else if (s.layout === "foto") {
    const chips = (s.marcas?.length ?? 0) > 0 ? [] : (s.chips ?? []);
    corpo = (
      <>
        <Img
          url={foto(0)}
          foco={s.foco}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.85) 75%, rgba(0,0,0,.96) 100%)",
          }}
        />
        {(s.marcas?.length ?? 0) > 0 && <Marcas marcas={s.marcas!} cor={hi} k={k} />}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: base,
            display: "flex",
            flexDirection: "column",
            gap: 24 * k,
          }}
        >
          {chips.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {chips.map((c, i) => {
                const fim = i === chips.length - 1;
                return (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", flex: fim ? "0 0 auto" : 1 }}
                  >
                    <span
                      style={{
                        padding: `${12 * k}px ${18 * k}px`,
                        borderRadius: 18,
                        fontSize: 21 * k,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        color: fim ? "#0B0B0F" : "#fff",
                        background: fim ? hi : "rgba(255,255,255,.08)",
                        border: fim ? "none" : "1.5px solid rgba(255,255,255,.18)",
                        boxShadow: fim ? `0 0 30px ${hi}88` : undefined,
                      }}
                    >
                      {c}
                    </span>
                    {!fim && (
                      <span
                        style={{
                          flex: 1,
                          height: 3,
                          minWidth: 24,
                          margin: "0 8px",
                          background: `linear-gradient(90deg, rgba(255,255,255,.2), ${hi})`,
                          borderRadius: 9,
                          boxShadow: `0 0 10px ${hi}66`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {s.titulo && titulo(s.titulo, 80, 56, 30)}
          {s.texto && (
            <div
              style={{
                fontSize: ajusta(s.texto, 36, 28, 150) * k,
                lineHeight: 1.36,
                color: "rgba(255,255,255,.82)",
              }}
            >
              <Rico t={s.texto} cor={hi} peso={800} />
            </div>
          )}
        </div>
      </>
    );
  } else if (s.layout === "cta") {
    const chips = s.chips ?? [];
    corpo = (
      <>
        {ambiente(true, !!foto(0))}
        {/* foto orgânica da autora fundida ao fundo: largura inteira (sem bordas laterais),
            topo sob a barra e a base se dissolvendo no fundo, tingido do mesmo verde da foto */}
        {foto(0) && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#050706",
              }}
            />
            <Img
              url={foto(0)}
              foco={s.foco ?? (quadrado ? "50% 0%" : "50% 12%")}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: Math.round(H * (quadrado ? 0.7 : story ? 0.62 : 0.66)),
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: Math.round(H * (quadrado ? 0.7 : story ? 0.62 : 0.66)) + 2,
                background:
                  "linear-gradient(180deg, rgba(5,7,6,.55) 0%, rgba(5,7,6,0) 16%, rgba(5,7,6,0) 46%, rgba(5,7,6,.55) 66%, rgba(5,7,6,.92) 86%, #050706 100%), radial-gradient(120% 70% at 50% 35%, rgba(0,0,0,0) 55%, rgba(5,7,6,.55) 100%)",
              }}
            />
          </>
        )}
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: topo,
            bottom: base,
            display: "flex",
            flexDirection: "column",
            justifyContent: foto(0) ? "flex-end" : "center",
            alignItems: "center",
            gap: 26 * k,
          }}
        >
          <div
            style={{
              ...(foto(0) ? {} : vidro(true, 48)),
              padding: `${40 * k}px ${44 * k}px ${48 * k}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 22 * k,
              position: "relative",
              overflow: "visible",
              boxShadow: foto(0)
                ? undefined
                : `0 60px 120px rgba(0,0,0,.65), inset 0 1.5px 0 rgba(255,255,255,.14), 0 0 0 1px ${hi}33, 0 0 90px ${hi}22`,
            }}
          >
            {chips.length > 0 && (!foto(0) || quadrado) && (
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                {chips.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      ...vidro(true, 99),
                      padding: `${12 * k}px ${22 * k}px`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 22 * k,
                      fontWeight: 800,
                    }}
                  >
                    {i === 0 ? (
                      <CalendarDays size={24 * k} color={hi} />
                    ) : (
                      <Zap size={22 * k} color={hi} fill={hi} />
                    )}
                    {c}
                  </span>
                ))}
              </div>
            )}
            {s.rotulo && (
              <div
                style={{
                  padding: "12px 26px",
                  borderRadius: 999,
                  background: foto(0) ? "rgba(5,7,6,.82)" : `${hi}1F`,
                  border: `1.5px solid ${hi}AA`,
                  color: hi,
                  fontSize: ajusta(s.rotulo, 24, 19, 34) * k,
                  fontWeight: 900,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {s.rotulo}
              </div>
            )}
            {titulo(s.titulo ?? "", 74, 52, 30)}
            {s.texto && (
              <div
                style={{
                  fontSize: ajusta(s.texto, 32, 26, 150) * k,
                  lineHeight: 1.38,
                  color: "rgba(255,255,255,.75)",
                }}
              >
                <Rico t={s.texto} cor="#fff" peso={800} />
              </div>
            )}
            {s.botao && (
              <div style={{ position: "relative", marginTop: 10 * k }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: `${28 * k}px ${54 * k}px`,
                    borderRadius: 999,
                    background: `linear-gradient(180deg, ${hi} 0%, ${hi}D9 100%)`,
                    color: "#0B0B0F",
                    fontSize: 38 * k,
                    fontWeight: 900,
                    boxShadow: `0 0 0 10px ${hi}22, 0 0 70px ${hi}AA, 0 20px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)`,
                  }}
                >
                  {s.botao}
                  <span
                    style={{
                      width: 56 * k,
                      height: 56 * k,
                      borderRadius: 99,
                      background: "#0B0B0F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowRight size={30 * k} color={hi} strokeWidth={3} />
                  </span>
                </div>
                {/* cursor em cima do botão: o "hover" congelado */}
                <svg
                  width={64 * k}
                  height={64 * k}
                  viewBox="0 0 24 24"
                  style={{
                    position: "absolute",
                    right: -26 * k,
                    bottom: -40 * k,
                    filter: "drop-shadow(0 6px 10px rgba(0,0,0,.6))",
                  }}
                >
                  <path
                    d="M4 2l15 11.2-6.5.9 3.7 7.3-2.9 1.4-3.7-7.4L4 20z"
                    fill="#fff"
                    stroke="#0B0B0F"
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </>
    );
  } else {
    // texto (frase de impacto, cards, oferta, linhas)
    const v = s.visual;
    const larg = W - 128;
    let painel: ReactNode = null;
    if (v?.tipo === "cards") {
      // trilha: uma linha vertical acesa liga os itens; sem caixas
      const n = v.itens.length;
      const no = 72 * k;
      painel = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * k }}>
          {s.texto && (
            <div
              style={{
                fontSize: 30 * k,
                fontWeight: 600,
                color: "rgba(255,255,255,.7)",
                marginBottom: 12 * k,
              }}
            >
              <Rico t={s.texto} cor={hi} peso={800} />
            </div>
          )}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: (n > 3 ? 50 : 64) * k,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: no / 2 - 1.5,
                top: no / 2,
                bottom: no / 2,
                width: 3,
                borderRadius: 9,
                background: `linear-gradient(180deg, ${hi} 0%, ${PERDA} 100%)`,
                boxShadow: `0 0 16px ${hi}88`,
              }}
            />
            {v.itens.map((it, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 28 * k, position: "relative" }}
              >
                <span
                  style={{
                    width: no,
                    height: no,
                    borderRadius: 99,
                    background: "#070A08",
                    border: `2.5px solid ${hi}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 0 0 8px ${hi}14, 0 0 28px ${hi}55`,
                  }}
                >
                  <Icone nome={it.icone} cor={hi} tam={32 * k} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 50 * k,
                      fontWeight: 900,
                      letterSpacing: -2,
                      lineHeight: 1.05,
                    }}
                  >
                    {it.titulo}
                  </div>
                  {it.detalhe && (
                    <div
                      style={{
                        fontSize: 28 * k,
                        lineHeight: 1.3,
                        color: "rgba(255,255,255,.62)",
                        marginTop: 6,
                      }}
                    >
                      {it.detalhe}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  {!quadrado && <Queda i={i} cor={PERDA} w={150 * k} h={52 * k} />}
                  {it.tag && (
                    <span
                      style={{
                        fontSize: 19 * k,
                        fontWeight: 800,
                        letterSpacing: 1.8,
                        textTransform: "uppercase",
                        color: PERDA,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ↘ {it.tag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (v?.tipo === "oferta") {
      // anel grande com o número dentro; os outros valores saem dele por linhas
      const pct = parseFloat(v.valor.replace(",", "."));
      const tam = (quadrado ? 400 : 500) * k;
      const larg = W - 128;
      const prazo = v.prazo ? new Date(`${v.prazo}T12:00:00`) : null;
      const valores = [
        ...(v.itens ?? []).map((it) => ({ valor: it.titulo, rotulo: it.detalhe ?? "" })),
        ...(prazo && !Number.isNaN(prazo.getTime())
          ? [
              {
                valor: prazo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                rotulo: v.prazoRotulo ?? "",
              },
            ]
          : []),
      ].slice(0, 3);
      const cx = tam / 2;
      const cy = tam / 2;
      const r = tam / 2 - 18;
      const xLab = tam + 70 * k;
      const ys = valores.map((_, i) =>
        valores.length === 1 ? cy : tam * 0.2 + (i * tam * 0.6) / (valores.length - 1),
      );
      painel = (
        <div style={{ position: "relative", width: larg, height: tam }}>
          <div
            style={{
              position: "absolute",
              left: -tam * 0.2,
              top: -tam * 0.2,
              width: tam * 1.4,
              height: tam * 1.4,
              borderRadius: 999,
              background: `radial-gradient(circle, ${hi}2E 0%, transparent 62%)`,
            }}
          />
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <Anel pct={Number.isFinite(pct) ? pct : 15} cor={hi} tam={tam} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: tam,
              height: tam,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: tam * 0.34,
                fontWeight: 900,
                letterSpacing: -tam * 0.02,
                lineHeight: 0.9,
                textShadow: `0 0 50px ${hi}66`,
              }}
            >
              {v.valor}
            </div>
            {v.rotulo && (
              <div
                style={{
                  fontSize: 24 * k,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.7)",
                  marginTop: 10,
                  textAlign: "center",
                  maxWidth: tam * 0.6,
                }}
              >
                {v.rotulo}
              </div>
            )}
          </div>
          <svg
            width={larg}
            height={tam}
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            {valores.map((_, i) => {
              const ang = Math.atan2(ys[i] - cy, xLab - cx);
              const x1 = cx + (r + 26) * Math.cos(ang);
              const y1 = cy + (r + 26) * Math.sin(ang);
              return (
                <g key={i}>
                  <path
                    d={`M${x1},${y1} L${xLab - 30 * k},${ys[i]} L${xLab},${ys[i]}`}
                    fill="none"
                    stroke={hi}
                    strokeWidth={2.5}
                  />
                  <circle cx={x1} cy={y1} r={7} fill={hi} />
                  <circle cx={x1} cy={y1} r={16} fill={hi} opacity={0.2} />
                </g>
              );
            })}
          </svg>
          {valores.map((val, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: xLab + 14 * k,
                top: ys[i],
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <div
                style={{ fontSize: 58 * k, fontWeight: 900, letterSpacing: -2.5, lineHeight: 1 }}
              >
                {val.valor}
              </div>
              {val.rotulo && (
                <div
                  style={{
                    fontSize: 27 * k,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.65)",
                    maxWidth: larg - xLab - 20,
                  }}
                >
                  {val.rotulo}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    } else if (v?.tipo === "linhas") {
      painel = (
        <div style={{ ...vidro(), padding: `${30 * k}px ${30 * k}px` }}>
          <div style={{ display: "flex", gap: 22, marginBottom: 18, flexWrap: "wrap" }}>
            {v.series.map((se, i) => (
              <span
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 22 * k,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.75)",
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 6,
                    borderRadius: 9,
                    background: se.destaque ? hi : "rgba(255,255,255,.45)",
                    boxShadow: se.destaque ? `0 0 10px ${hi}` : undefined,
                  }}
                />
                {se.nome}
              </span>
            ))}
          </div>
          <LinhasPainel v={v} cor={hi} larg={larg - 64 * k} alt={(quadrado ? 300 : 440) * k} />
        </div>
      );
    }
    corpo = (
      <>
        {ambiente(v?.tipo === "oferta")}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: topo,
            bottom: base,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 30 * k,
          }}
        >
          {s.rotulo &&
            eyebrow(
              s.rotulo,
              v?.tipo === "oferta" ? <Zap size={22} color={hi} fill={hi} /> : undefined,
            )}
          {s.titulo && titulo(s.titulo, v ? 84 : 104, 56, 34)}
          {painel}
          {s.texto && v?.tipo !== "cards" && (
            <div
              style={{
                fontSize: ajusta(s.texto, v ? 32 : 44, 26, 160) * k,
                lineHeight: 1.4,
                color: "rgba(255,255,255,.75)",
              }}
            >
              <Rico t={s.texto} cor={hi} peso={800} />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div ref={ref} style={raiz}>
      {corpo}
      {hud}
      {rodape}
    </div>
  );
});
