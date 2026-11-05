// Player do vídeo baixado da referência (bucket privado → URL assinada). Aparece no painel
// lateral da Pesquisa e na página Referências, para assistir antes de roteirizar ou aplicar.
import { useQuery } from "@tanstack/react-query";
import { Loader2, Video } from "lucide-react";
import { urlAssinada } from "@/lib/referencias";

export function VideoReferencia({
  path,
  poster,
  className,
}: {
  path: string | null | undefined;
  poster?: string | null;
  className?: string;
}) {
  const url = useQuery({
    queryKey: ["vedit", "ref-video", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: () => urlAssinada(path!),
  });
  if (!path)
    return (
      <div
        className={
          "flex items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground p-6 " +
          (className ?? "")
        }
      >
        <Video className="h-4 w-4" /> vídeo ainda não baixado
      </div>
    );
  if (url.isLoading)
    return (
      <div className={"flex items-center justify-center p-6 " + (className ?? "")}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  if (!url.data)
    return (
      <div className={"text-xs text-red-600 " + (className ?? "")}>
        Não consegui abrir o vídeo desta referência.
      </div>
    );
  return (
    <video
      src={url.data}
      poster={poster ?? undefined}
      controls
      playsInline
      preload="metadata"
      className={"rounded-lg border bg-black max-h-[420px] w-auto mx-auto " + (className ?? "")}
    />
  );
}
