import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Depois de um deploy novo, abas abertas pedem pedaços do app que já não existem.
const ERRO_VERSAO =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i;

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const versaoVelha = ERRO_VERSAO.test(String(error?.message ?? ""));
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // Recarrega sozinho uma vez (a cada 30 s no máximo) para pegar a versão nova.
    if (versaoVelha && typeof window !== "undefined") {
      let ultimo = 0;
      try {
        ultimo = Number(sessionStorage.getItem("recarregou-versao") ?? 0);
        if (Date.now() - ultimo > 30_000) {
          sessionStorage.setItem("recarregou-versao", String(Date.now()));
          window.location.reload();
        }
      } catch {
        /* sem sessionStorage: segue para a tela de erro */
      }
    }
  }, [error, versaoVelha]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {versaoVelha
            ? "O sistema foi atualizado enquanto esta aba estava aberta. Recarregue a página."
            : "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        {!versaoVelha && error?.message && (
          <p className="mt-3 text-xs text-muted-foreground/80 font-mono break-words">
            {String(error.message).slice(0, 300)}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (versaoVelha) return window.location.reload();
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IAplicada Ads" },
      {
        name: "description",
        content:
          "Cockpit de mídia paga da IAplicada: campanhas, criativos e landing pages, cruzados com os dados do CRM.",
      },
      { name: "author", content: "IAplicada" },
      { name: "theme-color", content: "#1a1c14" },
      { property: "og:title", content: "IAplicada Ads" },
      {
        property: "og:description",
        content:
          "Cockpit de mídia paga da IAplicada: campanhas, criativos e landing pages, cruzados com os dados do CRM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "IAplicada Ads" },
      {
        name: "twitter:description",
        content:
          "Cockpit de mídia paga da IAplicada: campanhas, criativos e landing pages, cruzados com os dados do CRM.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3564a6a5-b0d4-43d0-9bf2-1dd23e96617d/id-preview-81695b46--c32fdead-754b-4b76-aaf2-7131a6e786bf.lovable.app-1780660586850.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3564a6a5-b0d4-43d0-9bf2-1dd23e96617d/id-preview-81695b46--c32fdead-754b-4b76-aaf2-7131a6e786bf.lovable.app-1780660586850.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/brand/iaplicada-mark.png" },
      { rel: "apple-touch-icon", href: "/brand/iaplicada-mark.png" },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/inter-latin.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/inter-tight-latin.woff2",
        crossOrigin: "anonymous",
      },
    ],
    scripts: [
      {
        // Aplica o tema antes do primeiro paint (sem flash). Padrão: escuro (marca).
        children: `(function(){try{var t=localStorage.getItem("mads_theme");if(t==="system"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}if(t!=="light"){document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
