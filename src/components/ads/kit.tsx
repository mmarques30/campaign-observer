/**
 * Kit de componentes de dados do IAplicada Ads.
 * Padrões extraídos das referências (KPI com variação + sparkline, pills de
 * status, barras inline, cabeçalho de página, tema de gráficos) — reutilizáveis
 * em todas as telas sem mexer na lógica de dados.
 */
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PERIODOS, type Periodo } from "@/lib/periodo";
import { toneClass, type Tone } from "@/lib/ads-utils";
import { cn } from "@/lib/utils";

/* ── PageHeader ─────────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions, eyebrow }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap animate-fade-up">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{eyebrow}</div>}
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/* ── PeriodSelect (mesmo contrato das telas atuais) ─────────────────────── */
export function PeriodSelect({ value, onChange, className, extra }: {
  value: Periodo | string; onChange: (v: any) => void; className?: string;
  /** Opções adicionais (ex.: "Desde reset" nas LPs). */
  extra?: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9 w-[190px] rounded-lg bg-card/60", className)}>
        <span className="text-muted-foreground mr-1 text-xs">Período</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
        {extra?.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ── Delta (variação vs período anterior) ───────────────────────────────── */
export function DeltaBadge({ value, invert = false, suffix = "", className }: {
  /** Variação percentual (ex.: 12.4 → +12,4%). null = sem base de comparação. */
  value: number | null | undefined; invert?: boolean; suffix?: string; className?: string;
}) {
  if (value == null || !isFinite(value)) {
    return <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground", className)}><Minus className="h-3 w-3" />—</span>;
  }
  const up = value > 0.05, down = value < -0.05;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const tone = good ? "text-success" : bad ? "text-danger" : "text-muted-foreground";
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", tone, className)}>
      <Icon className="h-3 w-3" />{value > 0 ? "+" : ""}{value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%{suffix}
    </span>
  );
}

/** Variação % entre atual e anterior (null quando não há base). */
export function deltaPct(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

/* ── Sparkline ──────────────────────────────────────────────────────────── */
export function Sparkline({ data, width = 96, height = 28, className, tone = "primary", area = true }: {
  data: number[]; width?: number; height?: number; className?: string;
  tone?: "primary" | "success" | "danger" | "muted"; area?: boolean;
}) {
  const id = `sp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (!data.length) return null;
  const pad = 2;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), span = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2),
    height - pad - ((v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${pts[0][0].toFixed(1)},${height} ${line} ${pts[pts.length - 1][0].toFixed(1)},${height}`;
  const color = { primary: "var(--color-primary)", success: "var(--color-success)", danger: "var(--color-danger)", muted: "var(--color-muted-foreground)" }[tone];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("shrink-0 overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <polygon points={fill} fill={`url(#${id})`} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.2} fill={color} />
    </svg>
  );
}

/* ── KPI card ───────────────────────────────────────────────────────────── */
export function Kpi({ icon: Icon, label, value, hint, delta, deltaInvert, spark, tone = "neutral", loading, className, onClick }: {
  icon?: any; label: ReactNode; value: ReactNode; hint?: ReactNode;
  delta?: number | null; deltaInvert?: boolean; spark?: number[];
  tone?: Tone | "primary"; loading?: boolean; className?: string; onClick?: () => void;
}) {
  const iconTone = tone === "primary" ? "bg-primary/12 text-primary" : tone === "neutral" ? "bg-muted text-muted-foreground" : toneClass[tone];
  return (
    <Card interactive={!!onClick} onClick={onClick} className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium text-muted-foreground truncate">{label}</div>
          {Icon && <div className={cn("h-7 w-7 shrink-0 rounded-lg flex items-center justify-center border border-transparent", iconTone)}><Icon className="h-3.5 w-3.5" /></div>}
        </div>
        {loading ? <Skeleton className="h-8 w-28 mt-2" /> : (
          <div className="mt-1.5 font-display text-[26px] font-semibold tracking-tight tabular-nums leading-none">{value}</div>
        )}
        <div className="mt-2.5 flex items-end justify-between gap-2 min-h-[20px]">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
            {delta !== undefined && <DeltaBadge value={delta} invert={deltaInvert} />}
            {hint && <span className="truncate">{hint}</span>}
          </div>
          {spark && spark.length > 1 && <Sparkline data={spark} width={72} height={22} tone={tone === "danger" ? "danger" : tone === "success" ? "success" : "primary"} className="hidden sm:block" />}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── StatusPill ─────────────────────────────────────────────────────────── */
export function StatusPill({ tone, children, dot = true, className }: { tone: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <Badge variant="outline" className={cn(toneClass[tone], "capitalize", className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </Badge>
  );
}

/* ── MiniBar (progresso inline, ex.: % hedged das referências) ──────────── */
export function MiniBar({ value, max = 100, tone = "primary", className, label }: {
  value: number; max?: number; tone?: "primary" | Tone; className?: string; label?: ReactNode;
}) {
  const pctv = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const bar = tone === "primary" ? "bg-primary" : tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "danger" ? "bg-danger" : tone === "info" ? "bg-info" : "bg-muted-foreground";
  return (
    <div className={cn("flex items-center gap-2 min-w-[96px]", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-[width] duration-500", bar)} style={{ width: `${pctv}%` }} />
      </div>
      {label !== undefined && <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">{label}</span>}
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: {
  icon?: any; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-10 px-6", className)}>
      <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center mb-3 border border-border/60"><Icon className="h-5 w-5 text-muted-foreground" /></div>
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Chart theme (Recharts) ─────────────────────────────────────────────── */
/**
 * Lê as cores do tema em tempo real (dark/light) — Recharts precisa de strings
 * de cor resolvidas, não `var(--x)`. Re-lê quando a classe `dark` muda.
 */
export function useChartTheme() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const obs = new MutationObserver(() => setTick((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return useMemo(() => {
    const read = (name: string, fallback: string) => {
      if (typeof window === "undefined") return fallback;
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };
    const fg = read("--muted-foreground", "#888");
    return {
      primary: read("--chart-1", "#a3cb20"),
      blue: read("--chart-2", "#3b82f6"),
      green: read("--chart-3", "#10b981"),
      amber: read("--chart-4", "#f59e0b"),
      sage: read("--chart-5", "#888"),
      success: read("--success", "#10b981"),
      danger: read("--danger", "#ef4444"),
      grid: read("--border", "#333"),
      axis: fg,
      tooltip: {
        contentStyle: {
          background: read("--popover", "#1a1a1a"),
          border: `1px solid ${read("--border", "#333")}`,
          borderRadius: 12,
          boxShadow: read("--sh-elevated", "0 8px 24px rgba(0,0,0,.3)"),
          fontSize: 12,
          color: read("--foreground", "#eee"),
        },
        labelStyle: { color: fg, fontSize: 11, marginBottom: 4 },
        itemStyle: { padding: 0 },
        cursor: { stroke: read("--primary", "#a3cb20"), strokeWidth: 1, strokeDasharray: "3 3" },
      },
      tick: { fill: fg, fontSize: 11 },
    };
  }, [tick]);
}

/* ── Section (card com cabeçalho compacto) ──────────────────────────────── */
export function Section({ title, description, actions, children, className, bodyClassName }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <Card className={cn("animate-fade-up", className)}>
      <div className="flex items-start justify-between gap-3 flex-wrap p-5 sm:p-6 pb-3 sm:pb-3">
        <div className="min-w-0">
          <div className="font-display text-base font-semibold tracking-tight">{title}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className={cn("px-5 sm:px-6 pb-5 sm:pb-6", bodyClassName)}>{children}</div>
    </Card>
  );
}
