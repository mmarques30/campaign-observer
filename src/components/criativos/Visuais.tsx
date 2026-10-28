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
  // De cima para baixo: entradas lado a lado → convergem no centro → seta → resultado.
  const ent = v.entradas.slice(0, 4);
  const W = 920,
    liga = 96;
  const larg = (W - (ent.length - 1) * 20) / ent.length;
  const xs = ent.map((_, i) => i * (larg + 20) + larg / 2);
  return (
    <div style={{ width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 20, width: W }}>
        {ent.map((e, i) => (
          <div
            key={i}
            style={{
              ...vidro(c),
              width: larg,
              height: 104,
              borderRadius: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              fontSize: ent.length > 3 ? 28 : 32,
              fontWeight: 700,
            }}
          >
            {v.icones?.[i] && <Icone nome={v.icones[i]} cor={c.sub} tam={36} />}
            {e}
          </div>
        ))}
      </div>
      <svg width={W} height={liga} viewBox={`0 0 ${W} ${liga}`} style={{ display: "block" }}>
        {xs.map((x, i) => (
          <path
            key={i}
            d={`M${x} 4 C ${x} ${liga / 2}, ${W / 2} ${liga / 2}, ${W / 2} ${liga - 6}`}
            stroke={c.hi}
            strokeWidth={4}
            fill="none"
            strokeDasharray="10 8"
          />
        ))}
      </svg>
      <div
        style={{
          width: 520,
          height: 128,
          borderRadius: 32,
          background: c.hi,
          color: c.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          boxShadow: `0 0 60px ${c.hi}55`,
        }}
      >
        <Icone nome="sistema" cor={c.bg} tam={58} />
        <div style={{ fontSize: 46, fontWeight: 900 }}>{v.centro}</div>
      </div>
      <svg width={40} height={70} viewBox="0 0 40 70" style={{ display: "block" }}>
        <path d="M20 4 V58" stroke={c.hi} strokeWidth={5} />
        <path d="M8 48 L20 62 L32 48" stroke={c.hi} strokeWidth={5} fill="none" />
      </svg>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "22px 40px",
          borderRadius: 999,
          border: `3px solid ${c.hi}`,
          fontSize: 38,
          fontWeight: 800,
        }}
      >
        <Icone nome="crescimento" cor={c.hi} tam={44} />
        {v.saida}
      </div>
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
export function BotaoSlide({ texto, c }: { texto: string; c: Cores }) {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 22,
        padding: "30px 46px",
        borderRadius: 999,
        background: c.hi,
        color: c.bg,
        fontSize: 46,
        fontWeight: 900,
        letterSpacing: -0.5,
        boxShadow: `0 0 0 10px ${c.hi}2E, 0 24px 60px ${c.hi}40`,
      }}
    >
      {texto.replace(/\s*[→>]+\s*$/, "")}
      <ArrowRight size={52} strokeWidth={3.2} color={c.bg} />
    </div>
  );
}
