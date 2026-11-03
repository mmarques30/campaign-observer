import { supabase } from "@/integrations/supabase/client";
import { exigirEdicao, recursoDoPath, registrarAcesso } from "@/lib/permissoes";

export const FUNCTIONS_BASE = "https://ciwdlceyjsnlnunktqzx.supabase.co/functions/v1";

/**
 * Calls a Supabase edge function with the authenticated user's JWT.
 * Throws if there is no active session (mutations require auth + audit trail).
 *
 * Permissões: antes de sair, verifica se o usuário pode EDITAR a tela atual
 * (bloqueio central — quem só "vê" não dispara ação). Toda chamada é registrada
 * em mads_acessos (acao = "acao").
 */
export async function callEdgeFunction<T = any>(fn: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  if (!jwt) throw new Error("Sessão expirada — faça login novamente para continuar.");

  await exigirEdicao();

  const recurso = typeof window !== "undefined" ? recursoDoPath(window.location.pathname)?.key : undefined;
  void registrarAcesso("acao", recurso ?? fn, {
    fn,
    campos: body && typeof body === "object" ? Object.keys(body as object).slice(0, 12) : undefined,
  });

  const res = await fetch(`${FUNCTIONS_BASE}/${fn}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* response sem corpo JSON */
  }

  if (json == null) {
    if (!res.ok) throw new Error(`Erro ${res.status} ao chamar ${fn}`);
    return {} as T;
  }
  return json as T;
}

/** slug simples: minúsculas, sem acentos, separado por _ */
export function slugify(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
