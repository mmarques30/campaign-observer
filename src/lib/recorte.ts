// Recorte da pessoa no navegador (fase 2): segmentação por IA (MediaPipe) quadro a quadro,
// gravada como WebM VP9 com transparência. Libera texto atrás, troca de fundo, contorno,
// moldura quebrada e vertigo — no preview e no render (Remotion lê WebM com alfa).
import { supabase } from "@/integrations/supabase/client";
import { BUCKET, db } from "@/lib/vedit";

export const NOME_RECORTE = "recorte-pessoa.webm";
export { gerarRecorte, suportaRecorte } from "./recorte-motor";
import { gerarRecorte } from "./recorte-motor";

/** Gera, sobe e registra o recorte como mídia do projeto. */
export async function prepararRecorte(
  projetoId: string,
  file: File,
  onProgresso?: (p: number, etapa: string) => void,
) {
  const r = await gerarRecorte(file, { onProgresso });
  const path = `${projetoId}/${NOME_RECORTE}`;
  const up = await supabase.storage.from(BUCKET).upload(path, r.blob, { contentType: "video/webm", upsert: true });
  if (up.error) throw new Error(up.error.message);
  await db().from("vedit_midias").delete().eq("projeto_id", projetoId).eq("nome", NOME_RECORTE);
  const { error } = await db().from("vedit_midias").insert({
    projeto_id: projetoId,
    tipo: "video",
    nome: NOME_RECORTE,
    path,
    descricao: "__recorte__ (pessoa recortada com fundo transparente — uso interno dos efeitos)",
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Baixa o vídeo do projeto para gerar o recorte (quando a pessoa não tem mais o arquivo local). */
export async function baixarFonte(path: string, nome = "fonte.mp4"): Promise<File> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) throw new Error(error?.message ?? "não consegui assinar o vídeo");
  const r = await fetch(data.signedUrl);
  if (!r.ok) throw new Error(`download ${r.status}`);
  return new File([await r.blob()], nome, { type: "video/mp4" });
}
