export const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR");
export const pct = (n: number | null | undefined, digits = 2) =>
  `${(n ?? 0).toFixed(digits)}%`;

/** Formato compacto para KPIs grandes (R$ 12,7 mil / 1,2 mi). */
export const brlCompact = (n: number | null | undefined) => {
  const v = n ?? 0;
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (Math.abs(v) >= 10_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return brl(v);
};

/* ── Tons de marca ─────────────────────────────────────────────────────────
 * Centralizados aqui: toda tela que usa statusBadge/healthColor herda a paleta
 * (success/warning/danger/info/neutral definida no styles.css) sem editar nada.
 */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

/* Ordem "bg text border" é contrato: algumas telas fazem `.split(" ")[1]`
 * para pegar só a classe de texto. */
export const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-primary/12 text-primary border-primary/30",
};

export const statusTone = (status: string | null | undefined): Tone => {
  const s = (status ?? "").toLowerCase();
  if (s === "ativa" || s === "active") return "success";
  if (s === "pausada" || s === "paused") return "warning";
  if (s === "arquivada" || s === "archived") return "neutral";
  if (s === "rascunho" || s === "draft") return "info";
  return "neutral";
};
export const statusBadge = (status: string | null | undefined) => toneClass[statusTone(status)];

export const healthTone = (sc: string | null | undefined): Tone => {
  const s = (sc ?? "").toLowerCase();
  if (s === "ok") return "success";
  if (s === "crm_nao_recebe" || s === "meta_nao_atribui") return "danger";
  if (s === "divergente" || s === "sem_utm" || s === "sem_utm_campaign") return "warning";
  return "neutral";
};
export const healthColor = (sc: string | null | undefined) => toneClass[healthTone(sc)];

export const healthLabel = (sc: string | null | undefined) => {
  switch ((sc ?? "").toLowerCase()) {
    case "ok": return "OK";
    case "crm_nao_recebe": return "CRM não recebe";
    case "meta_nao_atribui": return "Meta não atribui";
    case "divergente": return "Divergente";
    case "sem_utm":
    case "sem_utm_campaign": return "Sem UTM";
    default: return sc ?? "—";
  }
};

/** Faixas de CPMQL (R$): ≤100 bom · ≤200 atenção · >200 ruim. */
export const cpmqlTone = (v: number | null | undefined): Tone => {
  if (v == null) return "neutral";
  if (v <= 100) return "success";
  if (v <= 200) return "warning";
  return "danger";
};
export const cpmqlColor = (v: number | null | undefined) =>
  ({ success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-muted-foreground", info: "text-info", brand: "text-primary" })[cpmqlTone(v)];
