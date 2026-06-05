export const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR");
export const pct = (n: number | null | undefined, digits = 2) =>
  `${(n ?? 0).toFixed(digits)}%`;

export const statusBadge = (status: string | null | undefined) => {
  const s = (status ?? "").toLowerCase();
  if (s === "ativa" || s === "active") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (s === "pausada" || s === "paused") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (s === "arquivada" || s === "archived") return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
};

export const healthColor = (sc: string | null | undefined) => {
  const s = (sc ?? "").toLowerCase();
  if (s === "ok") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s === "crm_nao_recebe" || s === "meta_nao_atribui") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (s === "divergente" || s === "sem_utm" || s === "sem_utm_campaign") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
};

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
