// A Marca virou um menu próprio (/ads/marca). Este endereço antigo só redireciona.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/edicao/marca")({
  beforeLoad: () => {
    throw redirect({ to: "/ads/marca" });
  },
});
