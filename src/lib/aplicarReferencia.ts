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
      notas: `${a.estilo?.nome ?? ""}: ${a.estilo?.descricao ?? ""}`.slice(0, 400),
    },
  };
  await salvarManual(p, novo, `Estilo da referência ${novo.modelo.nome}`);
  // A edição em si roda no servidor; o resultado aparece no chat do vídeo.
  const tecnicas = (a.tecnicas ?? [])
    .slice(0, 14)
    .map(
      (t) =>
        `- ${t.nome} (${t.de}s–${t.ate}s, ${t.categoria}): ${t.como_reproduzir}${t.efeito_nosso ? ` → nosso: ${t.efeito_nosso}` : ""}`,
    )
    .join("\n");
  const pedido = enviarAoClaude(
    p.id,
    `/editar seguindo a referência ${novo.modelo.nome} (${a.estilo?.nome ?? "estilo"}).
${a.prompt_para_editor}

TÉCNICAS DA REFERÊNCIA (reproduza a forma de cada uma no que fizer sentido para este vídeo):
${tecnicas}

REGRAS AO SEGUIR A REFERÊNCIA:
1. Copie só a FORMA: layout, grafismos, tipografia, cores, ritmo, transições e posição da legenda. NUNCA copie textos, marcas, nomes de produto, @, assunto ou palavra do CTA da referência: todo texto na tela sai da fala DESTE vídeo e da nossa marca.
2. Não encurte o vídeo para ficar do tamanho da referência. Se já houver cortes, mantenha-os; se não houver, tire só silêncios e tomadas repetidas, sem perder nenhuma ideia da fala.
3. Telas, apps, mockups, cards ou UI flutuante da referência → use /mockup e /cards com o conteúdo montado pela fala (títulos, itens, números). Não use colagem/broll com imagens aleatórias; mídia só entra se mostrar exatamente o que está sendo dito.
4. Tudo precisa caber no formato deste vídeo (${p.formato ?? "9:16"}) e nos trechos em que a fala acontece.`,
  );
  return { nome: novo.modelo.nome, pedido };
}
