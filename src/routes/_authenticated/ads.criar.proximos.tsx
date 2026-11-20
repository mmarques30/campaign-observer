import { createFileRoute } from "@tanstack/react-router";
import { ProximosConteudos } from "@/components/edicao/ProximosConteudos";

export const Route = createFileRoute("/_authenticated/ads/criar/proximos")({
  component: () => <ProximosConteudos foco="criativo" />,
});
