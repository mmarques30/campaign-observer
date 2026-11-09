/**
 * Peças visuais da modernização do IAplicada Ads, extraídas das referências:
 *  - BrandHero: faixa de abertura com arte da marca (logo IAplicada + pétalas
 *    na paleta da logo) atrás de cartões de vidro, saudação e data.
 *  - CenterStage: composição com a imagem no centro e indicadores dos lados
 *    (usada no Estúdio de edição).
 *  - FilterChips, Gauge, Heatmap, InsightCallout, RankBars: variedade de
 *    gráficos e estruturas com hover, motion e profundidade.
 * Só apresentação: os dados continuam vindo das telas.
 */
import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PETALAS = ["#EAECC8", "#D9DFA2", "#AFC041", "#738A25"];

/** Arte de fundo: charcoal + luz lime, logo grande e pétalas flutuando. */
function ArteMarca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden hero-art">
      <div className="absolute inset-0 dot-grid opacity-[0.18] [mask-image:radial-gradient(ellipse_70%_90%_at_70%_40%,black,transparent)]" />
      {/* Logo da IAplicada como imagem de fundo, à direita. */}
      <img
        src="/brand/iaplicada-mark.png"
        alt=""
        className={cn(
          "absolute select-none opacity-[0.22] mix-blend-screen drop-shadow-[0_0_60px_rgba(175,192,65,0.55)]",
          compacta ? "right-[-40px] top-1/2 -translate-y-1/2 h-[140%]" : "right-[-60px] top-1/2 -translate-y-1/2 h-[150%] max-h-[520px]",
        )}
        style={{ animation: "petal-float 26s ease-in-out infinite alternate" }}
      />
      {[
        { c: PETALAS[2], s: 120, l: "62%", t: "-12%", d: "0s", o: 0.55 },
        { c: PETALAS[3], s: 180, l: "78%", t: "55%", d: "-6s", o: 0.5 },
        { c: PETALAS[0], s: 70, l: "52%", t: "62%", d: "-3s", o: 0.35 },
        { c: PETALAS[1], s: 90, l: "90%", t: "8%", d: "-9s", o: 0.4 },
      ].map((p, i) => (
        <span
          key={i}
          className="hero-petal hidden sm:block"
          style={{
            width: p.s, height: p.s * 1.25, left: p.l, top: p.t, opacity: p.o, animationDelay: p.d,
            background: `radial-gradient(circle at 30% 30%, ${p.c}, transparent 70%)`,
          }}
        />
      ))}
      {/* Véu para leitura do texto à esquerda. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.12_0.02_122/0.92),oklch(0.12_0.02_122/0.55)_45%,transparent_80%)]" />
    </div>
  );
}

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** Chip de data no estilo "Today · 12 nov". */
export function DateChip({ className }: { className?: string }) {
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium glass-dark", className)}>
      <CalendarDays className="h-3.5 w-3.5 text-[#AFC041]" />
      Hoje · {hoje}
    </span>
  );
}

export function BrandHero({ eyebrow, title, nome, subtitle, actions, children, className }: {
  eyebrow?: ReactNode;
  /** Título; sem título, mostra a saudação ("Bom dia, Mariana"). */
  title?: ReactNode;
  nome?: string | null;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Cartões de vidro (GlassStat) na base do hero. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl border border-white/10 shadow-elevated animate-scale-in", className)}>
      <ArteMarca />
      <div className="relative z-[1] p-5 sm:p-7 lg:p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <DateChip />
              {eyebrow && <span className="rounded-full px-3 py-1 text-xs font-medium glass-dark text-[#D9DFA2]">{eyebrow}</span>}
            </div>
            <h1 className="hero-title font-display text-[28px] sm:text-4xl lg:text-[44px] font-semibold tracking-tight leading-[1.05] text-white">
              {title ?? <>{saudacao()}{nome ? <>, <span className="text-[#AFC041] text-glow">{nome}</span></> : null}</>}
            </h1>
            {subtitle && <p className="mt-2 text-sm text-white/65 max-w-xl">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20">{actions}</div>}
        </div>
        {children && <div className="mt-6 sm:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">{children}</div>}
      </div>
    </section>
  );
}

/** Cartão de vidro sobre o hero: rótulo, número e um detalhe. */
export function GlassStat({ label, value, detail, icon: Icon }: { label: ReactNode; value: ReactNode; detail?: ReactNode; icon?: any }) {
  return (
    <div className="glass-dark rounded-2xl p-3.5 sm:p-4 lift">
      <div className="flex items-center gap-1.5 text-[11px] text-white/60">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#AFC041]" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 font-display text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</div>
      {detail && <div className="mt-1 text-[11px] text-white/55 truncate">{detail}</div>}
    </div>
  );
}

/**
 * Imagem no centro, indicadores dos lados (estrutura do anexo 2).
 * `media` é a peça central (vídeo, capa, logo).
 */
export function CenterStage({ title, subtitle, actions, left, right, media, className }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode;
  left?: ReactNode; right?: ReactNode; media: ReactNode; className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl border border-white/10 shadow-elevated animate-scale-in", className)}>
      <div aria-hidden className="absolute inset-0 hero-art" />
      <div aria-hidden className="absolute inset-0 dot-grid opacity-[0.16] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]" />
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#AFC041]/20 blur-[90px]" />
      <div className="relative z-[1] p-5 sm:p-7 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3"><DateChip /></div>
            <h1 className="hero-title font-display text-[28px] sm:text-4xl font-semibold tracking-tight leading-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-white/60 max-w-xl">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4 lg:gap-8">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 stagger order-2 lg:order-1">{left}</div>
          <div className="order-1 lg:order-2 flex justify-center">{media}</div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 stagger order-3">{right}</div>
        </div>
      </div>
    </section>
  );
}

/** Linha de filtros em pílulas (atalhos do período, segmentos). */
export function FilterChips<T extends string>({ options, value, onChange, className }: {
  options: { v: T; l: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {options.map((o) => {
        const ativo = o.v === value;
        return (
          <button
            key={o.v}
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(o.v)}
            className={cn(
              "h-8 rounded-full px-3.5 text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5",
              ativo
                ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary),0_6px_20px_-6px_var(--color-primary)]"
                : "bg-card/70 text-muted-foreground ring-1 ring-border hover:text-foreground hover:ring-primary/40 hover:bg-card",
            )}
          >
            {o.l}
            {o.count != null && (
              <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", ativo ? "bg-primary-foreground/15" : "bg-muted")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Achado declarado acima do gráfico (leitura do dado em uma frase). */
export function InsightCallout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2 text-xs", className)}>
      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
      <span className="text-foreground/85">{children}</span>
    </div>
  );
}

/** Anima de 0 até 1 na montagem (motion de entrada dos gráficos SVG). */
function useEntrada() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setP(1));
    return () => cancelAnimationFrame(id);
  }, []);
  return p;
}

/** Medidor semicircular com brilho (anexos 2 e 4). value/max. */
export function Gauge({ value, max = 100, label, sublabel, format = (v) => `${Math.round(v)}%`, className }: {
  value: number; max?: number; label?: ReactNode; sublabel?: ReactNode;
  format?: (v: number) => ReactNode; className?: string;
}) {
  const entrou = useEntrada();
  const frac = Math.max(0, Math.min(1, max ? value / max : 0));
  const R = 80, C = Math.PI * R;
  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]" aria-hidden>
        <defs>
          <linearGradient id="gaugeG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#738A25" />
            <stop offset="60%" stopColor="#AFC041" />
            <stop offset="100%" stopColor="#EAECC8" />
          </linearGradient>
          <filter id="gaugeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--color-muted)" strokeWidth="14" strokeLinecap="round" />
        {/* Marcações */}
        {Array.from({ length: 11 }).map((_, i) => {
          const a = Math.PI - (i / 10) * Math.PI;
          return <line key={i} x1={100 + Math.cos(a) * 62} y1={100 - Math.sin(a) * 62} x2={100 + Math.cos(a) * 66} y2={100 - Math.sin(a) * 66} stroke="var(--color-muted-foreground)" strokeOpacity={0.35} strokeWidth={1.2} />;
        })}
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeG)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac * entrou)} filter="url(#gaugeGlow)" opacity={0.6}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }} />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeG)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac * entrou)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="-mt-14 text-center">
        <div className="font-display text-3xl font-semibold tabular-nums tracking-tight text-glow">{format(value)}</div>
        {label && <div className="text-xs text-muted-foreground mt-0.5">{label}</div>}
        {sublabel && <div className="text-[11px] text-muted-foreground/80">{sublabel}</div>}
      </div>
    </div>
  );
}

/** Mapa de calor (linhas × colunas) com hover e entrada escalonada (anexo 2). */
export function Heatmap({ rows, cols, values, format = (v) => String(v), onCell, className }: {
  rows: string[]; cols: string[]; values: number[][];
  format?: (v: number) => string; onCell?: (r: number, c: number) => void; className?: string;
}) {
  const max = Math.max(1, ...values.flat());
  return (
    <div className={cn("w-full", className)}>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `auto repeat(${cols.length}, minmax(0,1fr))` }}>
        <span />
        {cols.map((c) => <span key={c} className="text-[10px] text-muted-foreground text-center truncate">{c}</span>)}
        {rows.map((r, ri) => (
          <div key={r} className="contents">
            <span className="text-[11px] text-muted-foreground pr-1 self-center">{r}</span>
            {cols.map((c, ci) => {
              const v = values[ri]?.[ci] ?? 0;
              const f = v / max;
              return (
                <button
                  key={c}
                  type="button"
                  title={`${r} · ${c}: ${format(v)}`}
                  onClick={() => onCell?.(ri, ci)}
                  className="h-6 sm:h-7 rounded-md ring-1 ring-border/40 transition-transform duration-200 hover:scale-110 hover:ring-primary hover:z-10 animate-fade-up"
                  style={{
                    background: v ? `color-mix(in oklch, var(--color-primary) ${Math.round(12 + f * 88)}%, var(--color-muted))` : "var(--color-muted)",
                    boxShadow: f > 0.75 ? "0 0 14px -2px var(--color-primary)" : undefined,
                    animationDelay: `${(ri * cols.length + ci) * 12}ms`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        menos
        {[0.12, 0.35, 0.6, 0.85, 1].map((f) => (
          <span key={f} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `color-mix(in oklch, var(--color-primary) ${Math.round(f * 100)}%, var(--color-muted))` }} />
        ))}
        mais
      </div>
    </div>
  );
}

/** Barras horizontais ordenadas com brilho e valor (ranking / orçamento, anexo 3). */
export function RankBars({ items, format = (v) => String(v), className }: {
  items: { label: ReactNode; value: number; detail?: ReactNode; href?: string; onClick?: () => void }[];
  format?: (v: number) => ReactNode; className?: string;
}) {
  const entrou = useEntrada();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((it, i) => (
        <div key={i} className={cn("group", it.onClick && "cursor-pointer")} onClick={it.onClick}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium group-hover:text-primary transition-colors">{it.label}</span>
            <span className="tabular-nums font-semibold shrink-0">{format(it.value)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#738A25,#AFC041)] shadow-[0_0_12px_-2px_#AFC041] transition-[width] duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ width: `${(it.value / max) * 100 * entrou}%`, transitionDelay: `${i * 70}ms` }}
            />
          </div>
          {it.detail && <div className="mt-1 text-[11px] text-muted-foreground">{it.detail}</div>}
        </div>
      ))}
    </div>
  );
}
