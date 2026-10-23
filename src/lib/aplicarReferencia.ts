// Aplica o estilo de uma referência analisada num vídeo do Estúdio e pede a edição ao editor IA.
import { db, enviarAoClaude, salvarManual, type Projeto } from "@/lib/vedit";
import { EFEITO_POR_TIPO } from "@/video/catalogo";
import { ESTILOS_LEGENDA, LOOKS, TRANSICOES, normalizarTimeline } from "@/video/schema";
import type { Analise, Referencia } from "@/lib/referencias";

const valido = <T extends string>(lista: readonly T[], v?: string | null): T | undefined =>
  v && (lista as readonly string[]).includes(v) ? (v as T) : undefined;

/** Grava legenda/look/transição/ritmo da referência e manda o editor montar os efeitos no mesmo padrão. */
export async function aplicarReferencia(projetoId: string, r: Referencia, a: Analise) {
  const { data: proj, error } = await db()
    .from("vedit_projetos")
    .select("*")
    .eq("id", projetoId)
    .single();
  if (error || !proj) throw new Error(error?.message ?? "vídeo não encontrado");
  const p = proj as Projeto;
  const tl = normalizarTimeline(p.timeline ?? {}).timeline;
  const pr = a.preset_estilo ?? {};
  const efeitos = (pr.efeitos_preferidos ?? []).filter((t) => EFEITO_POR_TIPO[t]?.disponivel);
  const estiloLeg = valido(ESTILOS_LEGENDA, pr.legenda ?? a.ritmo?.legenda_estilo);
  const look = valido(LOOKS, pr.look);
  const transicao = valido(TRANSICOES, pr.transicao);
  const novo = {
    ...tl,
    legenda: {
      ...tl.legenda,
      ...(estiloLeg ? { estilo: estiloLeg, ativa: true } : {}),
      ...(a.ritmo?.legenda_palavras_por_bloco
        ? { palavrasPorBloco: Math.min(8, Math.max(1, a.ritmo.legenda_palavras_por_bloco)) }
        : {}),
    },
    visual: { ...tl.visual, ...(look ? { look } : {}), ...(transicao ? { transicao } : {}) },
    modelo: {
      id: `ref-${r.id}`,
      nome: `Referência ${r.autor ? `@${r.autor}` : (r.titulo ?? "")}`.trim(),
      efeitos,
      ritmo: a.ritmo?.estimulo_medio_s ? +(60 / a.ritmo.estimulo_medio_s).toFixed(1) : null,
      notas: `${a.estilo.nome}: ${a.estilo.descricao}`.slice(0, 400),
    },
  };
  await salvarManual(p, novo, `Estilo da referência ${novo.modelo.nome}`);
  // A edição em si roda no servidor; o resultado aparece no chat do vídeo.
  const pedido = enviarAoClaude(
    p.id,
    `/editar seguindo a referência ${novo.modelo.nome}. ${a.prompt_para_editor}`,
  );
  return { nome: novo.modelo.nome, pedido };
}
