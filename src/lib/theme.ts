import { useEffect, useSyncExternalStore } from "react";

/**
 * Tema do app (dark = padrão da marca). Persistido em localStorage e aplicado
 * via classe `dark` no <html>. O script inline em __root.tsx aplica antes do
 * primeiro paint; aqui só mantemos em sincronia depois.
 */
export type Theme = "dark" | "light" | "system";
const KEY = "mads_theme";
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "system" ? t : "dark";
  } catch { return "dark"; }
}

export function resolvedTheme(t: Theme = getTheme()): "dark" | "light" {
  if (t === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return t === "light" ? "light" : "dark";
}

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolvedTheme(t) === "dark");
  document.documentElement.style.colorScheme = resolvedTheme(t);
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme(t);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: light)") : null;
  const onMq = () => { if (getTheme() === "system") { applyTheme("system"); l(); } };
  mq?.addEventListener("change", onMq);
  return () => { listeners.delete(l); mq?.removeEventListener("change", onMq); };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  const resolved = resolvedTheme(theme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  return { theme, resolved, setTheme };
}
