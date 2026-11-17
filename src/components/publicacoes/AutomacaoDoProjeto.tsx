// Botão de automação de comentários dentro do editor (vídeo ou criativo), para o que já foi
// publicado no Instagram: dá para criar ou mudar a automação depois de publicar, sem ir a
// Publicados.
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/vedit";
import { BotaoAutomacao, useAutomacoes } from "./AutomacaoComentarios";

export function AutomacaoDoProjeto({
  origem,
  refId,
}: {
  origem: "video" | "criativo";
  refId: string;
}) {
  const automacoes = useAutomacoes();
  const posts = useQuery({
    queryKey: ["publicacoes", "do-projeto", origem, refId],
    queryFn: async () => {
      const { data } = await db()
        .from("publicacoes")
        .select("id, nome, permalink, ig_media_id, publicado_em")
        .eq("origem", origem)
        .eq("ref_id", refId)
        .eq("destino", "instagram")
        .eq("status", "publicado")
        .not("ig_media_id", "is", null)
        .order("publicado_em", { ascending: false })
        .limit(3);
      return (data ?? []) as {
        id: string;
        nome: string | null;
        permalink: string | null;
        ig_media_id: string;
      }[];
    },
  });
  if (!posts.data?.length) return null;
  return (
    <>
      {posts.data.map((p) => (
        <BotaoAutomacao
          key={p.id}
          post={{
            ig_media_id: p.ig_media_id,
            permalink: p.permalink,
            nome: p.nome,
            publicacao_id: p.id,
          }}
          automacoes={automacoes.data}
        />
      ))}
    </>
  );
}
