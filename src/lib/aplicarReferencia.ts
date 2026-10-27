// Aplica o estilo de uma referência analisada num vídeo do Estúdio e pede a edição ao editor IA.
import { db, enviarAoClaude, salvarManual, type Projeto } from "@/lib/vedit";
import { EFEITO_POR_TIPO } from "@/video/catalogo";
import { FONTES } from "@/video/fontes";
import { ESTILOS_LEGENDA, LOOKS, TRANSICOES, normalizarTimeline } from "@/video/schema";
import type { Analise, Referencia } from "@/lib/referencias";

// Ao seguir referência, todo o visual sai da composição livre (cards, telas, ícones e imagens
// viram elementos dela): os modelos prontos (cards-flutuantes, mockup, broll…) destoavam.
const PALETA_REFERENCIA = ["composicao", "cta-final"];

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
  // Paleta fechada ao seguir referência: o visual vem da composição livre, não dos modelos prontos.
  const efeitos = PALETA_REFERENCIA.filter((t) => EFEITO_POR_TIPO[t]?.disponivel);
  const estiloLeg = valido(ESTILOS_LEGENDA, pr.legenda ?? a.ritmo?.legenda_estilo);
  const look = valido(LOOKS, pr.look);
  const transicao = valido(TRANSICOES, pr.transicao);
  const novo = {
    ...tl,
    // Começa limpo: os grafismos e sons do estilo anterior saem (não empilha estilos).
    efeitos: [],
    sfx: [],
    legenda: {
      ...tl.legenda,
      ...(estiloLeg ? { estilo: estiloLeg, ativa: true } : {}),
      ...(a.ritmo?.legenda_palavras_por_bloco
        ? { palavrasPorBloco: Math.min(8, Math.max(1, a.ritmo.legenda_palavras_por_bloco)) }
        : {}),
    },
    visual: { ...tl.visual, ...(look ? { look } : {}), ...(transicao ? { transicao } : {}) },
    // Tipografia e cor de destaque da referência (a marca segue nas outras cores).
    marca: {
      ...tl.marca,
      ...(pr.fonte_titulo && FONTES.includes(pr.fonte_titulo)
        ? { fonteTitulo: pr.fonte_titulo }
        : {}),
      ...(pr.fonte_texto && FONTES.includes(pr.fonte_texto)
        ? { fonteLegenda: pr.fonte_texto }
        : {}),
      ...(pr.cor_destaque && /^#[0-9a-f]{6}$/i.test(pr.cor_destaque)
        ? { destaque: pr.cor_destaque }
        : {}),
    },
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
        // O "efeito_nosso" da análise apontava para modelos prontos; aqui tudo vira composição.
        `- ${t.nome} (${t.de}s–${t.ate}s, ${t.categoria}): ${t.como_reproduzir} → faça como elementos da /composicao`,
    )
    .join("\n");
  const pedido = enviarAoClaude(
    p.id,
    `/editar seguindo a referência ${novo.modelo.nome} (${a.estilo?.nome ?? "estilo"}).
${a.prompt_para_editor}

TÉCNICAS DA REFERÊNCIA (reproduza a forma de cada uma no que fizer sentido para este vídeo):
${tecnicas}

DESIGN DA REFERÊNCIA: títulos em ${pr.fonte_titulo ?? "fonte da marca"}, texto em ${pr.fonte_texto ?? "fonte da marca"}, destaque ${pr.cor_destaque ?? "da marca"}, cards/telas ${pr.cor_fundo_ui ?? "escuros"}.
${
  a.layouts?.length
    ? `LAYOUTS-CHAVE DA REFERÊNCIA (use como base de /composicao, trocando os textos entre chaves pelo conteúdo da fala deste vídeo e ajustando ao que é dito; adapte tamanho e quantidade de itens livremente):
${JSON.stringify(a.layouts).slice(0, 6000)}`
    : ""
}

REGRAS AO SEGUIR A REFERÊNCIA:
1. Copie só a FORMA: layout, grafismos, tipografia, cores, ritmo, transições e posição da legenda. NUNCA copie textos, marcas, nomes de produto, @, assunto ou palavra do CTA da referência: todo texto na tela sai da fala DESTE vídeo e da nossa marca.
2. Não encurte o vídeo. Se já houver cortes, mantenha-os; se não houver, tire só silêncios e tomadas repetidas.
3. Os efeitos antigos foram apagados. TODO o visual é feito com /composicao (composição livre, elemento por elemento, no desenho da referência): cards, listas, telas de app, números, ícones e imagens são ELEMENTOS da composição (caixa, texto, icone, midia, linha, brilho, pessoa). NÃO use nenhum modelo pronto: nada de cards-flutuantes, mockup, icones, broll, dividir, reagir, fundo-imagem, palavra-gigante, letreiro, colagem, rabisco ou partículas. Só /cta-final no fim, como último efeito.
4. A pessoa NUNCA some da tela. Em /composicao use fundo "nenhum" (grafismos sobre o vídeo, no espaço livre) ou, para telas de UI com fundo sólido, inclua obrigatoriamente um elemento {"tipo":"pessoa"} num card arredondado (ex.: x 0.06, y 0.5, w 0.88, h 0.44) como na referência. Fundo sólido sem "pessoa" vira só escurecer.
5. IMAGENS DA REFERÊNCIA (obrigatório): para CADA técnica de categoria "midia" acima (ilustrações, fotos, prints, b-roll, janelinhas, tela dividida), coloque a equivalente com o assunto DESTE vídeo, no mesmo momento relativo, como elemento da /composicao com o mesmo acabamento da referência (tamanho, posição, cantos arredondados, borda, sombra, giro, entrada):
   - ilustração, objeto, app ou logo → elemento {"tipo":"icone"} (ex.: planilha, whatsapp, dinheiro) entrando na palavra exata;
   - foto ou b-roll do que é dito (pessoa trabalhando, escritório, planilha, dinheiro, cliente…) → chame buscar_midia ANTES (consulta em inglês, concreta e visual; até 3 buscas) e use o id devolvido num elemento {"tipo":"midia","midia":"<id>"} (janela com borda e raio, como na referência, ou grande atrás dos textos);
   - print ou gravação de tela → mídia enviada deste vídeo num elemento "midia"; sem print enviado, desenhe a tela com caixas e textos dentro da composição.
   Use só ids de MÍDIAS ENVIADAS ou devolvidos por buscar_midia (id inventado é descartado). Nada de molduras vazias. Na resposta, diga em uma frase quais imagens você colocou e em que momento.
6. Ritmo: no máximo um grafismo a cada 5–8 segundos, cada um com 2–4 s, e o vídeo respirando entre eles (você falando sem nada por cima).
7. Nada em cima do rosto: o sistema desvia, mas planeje no espaço livre (acima da cabeça ou terço inferior, sem cobrir a legenda).
8. Tudo precisa caber no formato deste vídeo (${p.formato ?? "9:16"}) e nos trechos em que a fala acontece.`,
  );
  return { nome: novo.modelo.nome, pedido };
}
