// Publicados: o que saiu dos vídeos (Instagram e anúncios), com status, link e desempenho.
import { createFileRoute } from "@tanstack/react-router";
import { PainelPublicacoes } from "@/components/publicacoes/PainelPublicacoes";

export const Route = createFileRoute("/_authenticated/ads/edicao/publicados")({
  component: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Publicados</h1>
        <p className="text-sm text-muted-foreground">
          Tudo que saiu dos vídeos: agendados, publicados no Instagram e anúncios, com o link e o
          desempenho de cada um. Use Reaproveitar para criar uma nova versão a partir do que
          performou.
        </p>
      </div>
      <PainelPublicacoes origem="video" />
    </div>
  ),
});
