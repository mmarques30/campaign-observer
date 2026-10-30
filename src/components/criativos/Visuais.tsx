// Visuais que explicam o que o slide fala (dentro dos layouts "texto" e "lista"):
// cards com ícone, fluxo (rotinas → sistema → resultado) e gráfico de linhas.
// Desenhados em HTML/SVG nas cores do tema, viram PNG junto com o slide.
import type { CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Hand,
  Keyboard,
  Landmark,
  MessageCircle,
  Moon,
  Sheet,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Visual } from "@/criativos/design";

export const ICONES_VISUAL: Record<string, LucideIcon> = {
  teclado: Keyboard,
  lancamento: Keyboard,
  conciliacao: ArrowLeftRight,
  fechamento: CalendarCheck,
  calendario: CalendarCheck,
  mao: Hand,
  manual: Hand,
  robo: Bot,
  ia: Bot,
  sistema: Cpu,
  check: CheckCircle2,
  relogio: Clock,
  documento: FileText,
  planilha: Sheet,
  banco: Landmark,
  cliente: UserPlus,
  contratar: UserPlus,
  equipe: Users,
  grafico: TrendingUp,
  crescimento: TrendingUp,
  dinheiro: Wallet,
  margem: Wallet,
  alerta: AlertTriangle,
  empresa: Building2,
  conversa: MessageCircle,
  sono: Moon,
};

type Cores = { tx: string; sub: string; hi: string; bg: string };

const vidro = (c: Cores): CSSProperties => ({
  background: `${c.tx}0D`,
  border: `2px solid ${c.tx}1F`,
  borderRadius: 28,
});

function Icone({ nome, cor, tam }: { nome?: string | null; cor: string; tam: number }) {
  const I = ICONES_VISUAL[(nome ?? "").toLowerCase()] ?? CheckCircle2;
  return <I size={tam} strokeWidth={2.2} color={cor} />;
}

function Cards({ v, c }: { v: Extract<Visual, { tipo: "cards" }>; c: Cores }) {
  const itens = v.itens.slice(0, 4);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${itens.length}, 1fr)`, gap: 22 }}>
      {itens.map((it, i) => (
        <div
          key={i}
          style={{
            ...vidro(c),
            padding: "30px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minHeight: 360,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: c.hi,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icone nome={it.icone} cor={c.bg} tam={52} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{it.titulo}</div>
          {it.detalhe && (
            <div style={{ fontSize: 29, lineHeight: 1.3, color: c.sub }}>{it.detalhe}</div>
          )}
          {it.tag && (
            <div
              style={{
                marginTop: "auto",
                alignSelf: "flex-start",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: c.hi,
                border: `2px solid ${c.hi}`,
                borderRadius: 999,
                padding: "6px 14px",
              }}
            >
              {it.tag}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Fluxo({ v, c }: { v: Extract<Visual, { tipo: "fluxo" }>; c: Cores }) {
  // Cara de editor de automação (n8n/Make): canvas com grade de pontos, nós com porta e
  // ligações contínuas em degradê. Entradas no topo → nó central (sistema) → resultado.
  const ent = v.entradas.slice(0, 4);
  const W = 920,
    pad = 34,
    nodeH = 132,
    liga = 110,
    centroH = 150,
    liga2 = 84,
    saidaH = 112;
  const inner = W - pad * 2;
  const larg = (inner - (ent.length - 1) * 18) / ent.length;
  const xs = ent.map((_, i) => pad + i * (larg + 18) + larg / 2);
  const yNos = pad;
  const yCentro = yNos + nodeH + liga;
  const ySaida = yCentro + centroH + liga2;
  const H = ySaida + saidaH + pad;
  const cx = W / 2;
  const porta = (x: number, y: number, cheia = false) => (
    <div
      style={{
        position: "absolute",
        left: x - 9,
        top: y - 9,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: cheia ? c.hi : c.bg,
        border: `3px solid ${c.hi}`,
        boxShadow: `0 0 14px ${c.hi}99`,
      }}
    />
  );
  const no: CSSProperties = {
    position: "absolute",
    borderRadius: 24,
    background: `linear-gradient(180deg, ${c.tx}12, ${c.tx}06)`,
    border: `1.5px solid ${c.tx}24`,
    boxShadow: `0 18px 40px rgba(0,0,0,.45), inset 0 1px 0 ${c.tx}14`,
    display: "flex",
    alignItems: "center",
  };
  const tile = (nome: string, cheio = false, t = 60) => (
    <div
      style={{
        width: t,
        height: t,
        borderRadius: 16,
        flexShrink: 0,
        background: cheio ? c.hi : `${c.hi}22`,
        border: cheio ? "none" : `1.5px solid ${c.hi}55`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icone nome={nome} cor={cheio ? c.bg : c.hi} tam={Math.round(t * 0.55)} />
    </div>
  );
  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        borderRadius: 36,
        overflow: "hidden",
        border: `1.5px solid ${c.tx}1A`,
        background: `radial-gradient(${c.tx}1F 1.6px, transparent 1.6px) 0 0 / 28px 28px, linear-gradient(180deg, ${c.tx}08, transparent)`,
      }}
    >
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient
            id="fx-liga"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={yNos + nodeH}
            x2="0"
            y2={yCentro}
          >
            <stop offset="0" stopColor={c.hi} stopOpacity={0.35} />
            <stop offset="1" stopColor={c.hi} stopOpacity={1} />
          </linearGradient>
        </defs>
        {xs.map((x, i) => {
          const y0 = yNos + nodeH,
            y1 = yCentro;
          return (
            <path
              key={i}
              d={`M${x} ${y0} C ${x} ${y0 + liga * 0.65}, ${cx} ${y1 - liga * 0.65}, ${cx} ${y1}`}
              stroke="url(#fx-liga)"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
        <path
          d={`M${cx} ${yCentro + centroH} L${cx} ${ySaida}`}
          stroke={c.hi}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </svg>
      {ent.map((e, i) => (
        <div
          key={i}
          style={{
            ...no,
            left: xs[i] - larg / 2,
            top: yNos,
            width: larg,
            height: nodeH,
            flexDirection: "column",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {tile(v.icones?.[i] ?? "manual", false, 56)}
          <div style={{ fontSize: ent.length > 3 ? 26 : 30, fontWeight: 700, letterSpacing: -0.3 }}>
            {e}
          </div>
        </div>
      ))}
      {xs.map((x, i) => (
        <div key={`p${i}`}>{porta(x, yNos + nodeH)}</div>
      ))}
      <div
        style={{
          ...no,
          left: cx - 260,
          top: yCentro,
          width: 520,
          height: centroH,
          padding: "0 30px",
          gap: 22,
          background: `linear-gradient(135deg, ${c.hi}30, ${c.hi}0A)`,
          border: `2px solid ${c.hi}`,
          boxShadow: `0 0 0 8px ${c.hi}14, 0 0 70px ${c.hi}40`,
        }}
      >
        {tile("sistema", true, 84)}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
            {v.centro}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: c.hi,
            }}
          >
            automático · com IA
          </div>
        </div>
      </div>
      {porta(cx, yCentro, true)}
      {porta(cx, yCentro + centroH, true)}
      <div
        style={{
          ...no,
          left: cx - 300,
          top: ySaida,
          width: 600,
          height: saidaH,
          justifyContent: "center",
          gap: 18,
        }}
      >
        {tile("crescimento", true, 60)}
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -0.5 }}>{v.saida}</div>
      </div>
      {porta(cx, ySaida, true)}
    </div>
  );
}

function Linhas({ v, c }: { v: Extract<Visual, { tipo: "linhas" }>; c: Cores }) {
  const W = 920,
    H = 460,
    pe = 34,
    dir = 190;
  const todos = v.series.flatMap((s) => s.pontos);
  const max = Math.max(1, ...todos);
  const n = Math.max(2, ...v.series.map((s) => s.pontos.length));
  const x = (i: number) => 10 + (i / (n - 1)) * (W - dir - 20);
  const y = (val: number) => H - pe - (val / max) * (H - pe - 30);
  return (
    <div style={{ ...vidro(c), padding: "26px 26px 14px" }}>
      <svg width={W - 52} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={10}
            x2={W - dir}
            y1={y(max * g)}
            y2={y(max * g)}
            stroke={`${c.tx}14`}
            strokeWidth={2}
          />
        ))}
        {v.series.map((s, k) => {
          const cor = s.destaque ? c.hi : `${c.tx}88`;
          const pts = s.pontos.map((p, i) => `${x(i)},${y(p)}`).join(" ");
          const ult = s.pontos.length - 1;
          return (
            <g key={k}>
              <polyline
                points={pts}
                fill="none"
                stroke={cor}
                strokeWidth={s.destaque ? 9 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={x(ult)} cy={y(s.pontos[ult])} r={s.destaque ? 13 : 10} fill={cor} />
              <text
                x={x(ult) + 24}
                y={y(s.pontos[ult]) + 12}
                fill={cor}
                fontSize={34}
                fontWeight={800}
                fontFamily="Inter, sans-serif"
              >
                {s.nome}
              </text>
            </g>
          );
        })}
        {(v.eixo ?? []).map((r, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 4}
            fill={c.sub}
            fontSize={24}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fontFamily="Inter, sans-serif"
          >
            {r}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function VisualSlide({ v, c }: { v: Visual; c: Cores }) {
  if (v.tipo === "cards") return <Cards v={v} c={c} />;
  if (v.tipo === "fluxo") return <Fluxo v={v} c={c} />;
  if (v.tipo === "linhas") return <Linhas v={v} c={c} />;
  return null;
}

/** Botão de chamada em destaque ("Quero conversar →"). */
export function BotaoSlide({
  texto,
  c,
  tamanho,
  estilo,
}: {
  texto: string;
  c: Cores;
  tamanho?: "pequeno" | "medio" | "grande" | null;
  /** destaque: cheio com brilho (padrão) · suave: cheio, sem brilho · contorno: só a borda */
  estilo?: "destaque" | "suave" | "contorno" | null;
}) {
  const k = tamanho === "pequeno" ? 0.7 : tamanho === "medio" ? 0.85 : 1;
  const contorno = estilo === "contorno";
  const brilho = !estilo || estilo === "destaque";
  const cor = contorno ? c.tx : c.bg;
  return (
    <div
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 22 * k,
        padding: `${30 * k}px ${46 * k}px`,
        borderRadius: 999,
        background: contorno ? "transparent" : c.hi,
        border: contorno ? `${3 * k}px solid ${c.hi}` : undefined,
        color: cor,
        fontSize: 46 * k,
        fontWeight: brilho ? 900 : 800,
        letterSpacing: -0.5,
        boxShadow: brilho ? `0 0 0 ${10 * k}px ${c.hi}2E, 0 24px 60px ${c.hi}40` : undefined,
      }}
    >
      {texto.replace(/\s*[→>]+\s*$/, "")}
      <ArrowRight size={52 * k} strokeWidth={3.2} color={contorno ? c.hi : cor} />
    </div>
  );
}
