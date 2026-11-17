import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Depois de um deploy, a aba aberta ainda aponta para os arquivos da versão anterior e a
// importação sob demanda falha ("Failed to fetch dynamically imported module"). Recarrega uma
// vez para pegar a versão nova em vez de deixar o erro para o usuário.
if (typeof window !== "undefined") {
  const CHAVE = "recarregou-por-versao";
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    const quando = Number(sessionStorage.getItem(CHAVE) ?? 0);
    if (Date.now() - quando < 30_000) return;
    sessionStorage.setItem(CHAVE, String(Date.now()));
    window.location.reload();
  });
}

export const getRouter = () => {
  // Dados ficam frescos por 30 s: trocar de tela e voltar (ou focar a aba) não repete as
  // mesmas consultas. Telas que precisam de dado novo já invalidam ou têm refetchInterval.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
