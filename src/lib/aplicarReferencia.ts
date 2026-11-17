// Aplica o estilo de uma referência analisada num vídeo do Estúdio e pede a edição ao editor IA.
import { db, enviarAoClaude, salvarManual, type Projeto } from "@/lib/vedit";
import { EFEITO_POR_TIPO } from "@/video/catalogo";
import { ESTILOS_LEGENDA, LOOKS, TRANSICOES, normalizarTimeline } from "@/video/schema";
import type { Analise, Referencia } from "@/lib/referencias";
import { dosagemLuz, lookCompativel, type Luz } from "@/lib/luz";
import { FONTES } from "@/video/fontes";

// Ao seguir referência, o visual sai da composição livre (cards, telas, ícones e imagens viram
// elementos dela) MAIS os formatos de tela que a própria referência usa (tela dividida, b-roll em
// tela cheia/janela, react): sem eles o vídeo não fica com a cara dela.
const PALETA_REFERENCIA = ["composicao", "cta-final"];
const FORMATOS_DE_TELA: [RegExp, string][] = [
  [/divid|split|metade de cima|empilhad/i, "dividir"],
  [/b-?roll|tela cheia|tela-cheia|janela|corte para/i, "broll"],
  [/react|reag/i, "reagir"],
];

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
  const rosto =
    (proj as { rosto?: { x: number; y: number; w: number; h: number } | null }).rosto ?? null;
  if (!((p.palavras as unknown[] | null)?.length ?? 0))
    throw new Error(
      "A transcrição deste vídeo ainda não terminou. Espere ela aparecer e aplique a referência de novo.",
    );
  const luz = (proj as { luz?: Luz | null }).luz ?? null;
  const dose = dosagemLuz(luz);
  const tl = normalizarTimeline(p.timeline ?? {}).timeline;
  const pr = a.preset_estilo ?? {};
  // Paleta fechada ao seguir referência: o visual vem da composição livre, não dos modelos prontos.
  const textoRef = JSON.stringify([a.estilo, a.tecnicas, a.layouts, a.preset_estilo]);
  const dec = (a as { decupagem?: any }).decupagem as
    | { trechos?: any[]; legenda?: any; nao_usa?: string[]; resumo_estrutura?: string; pessoa_na_dividida?: any }
    | undefined;
  const layoutsDec = new Set((dec?.trechos ?? []).map((t: any) => t.layout));
  const formatosRef = dec?.trechos?.length
    ? [
        ...(layoutsDec.has("dividida") ? ["dividir"] : []),
        ...(layoutsDec.has("midia-cheia") ? ["broll"] : []),
      ]
    : FORMATOS_DE_TELA.filter(([re]) => re.test(textoRef)).map(([, t]) => t);
  const mapaEstrutura = dec?.trechos?.length
    ? `DECUPAGEM DA REFERÊNCIA (${Number(r.duracao ?? 0).toFixed(0)}s) — a ESTRUTURA obrigatória. Cada bloco cai no mesmo momento RELATIVO deste vídeo (ex.: 0–13s de 90s = primeiros 14% daqui), ajustado ao fim da frase. Dentro de um bloco "dividida" a tela fica dividida o bloco inteiro e só a mídia troca (no ritmo indicado); em "so-fala" não entra nenhuma mídia nem grafismo, só você e a legenda. Depois de você, o sistema força essa estrutura: o que estiver fora dela é descartado.
${dec.trechos
  .map(
    (t: any) =>
      `- ${t.de}s–${t.ate}s: ${t.layout}${t.layout === "dividida" ? ` (mídia ${t.lado_midia ?? "cima"} ocupando ${t.midia_ocupa ?? "?"} da altura, emenda ${t.emenda ?? "?"}, troca a cada ~${t.troca_midia_s ?? 2}s)` : ""}${t.midia_tipo ? `; mídias: ${t.midia_tipo}` : ""}${t.sobreposicoes?.length ? `; sobre a tela: ${t.sobreposicoes.join("; ")}` : ""}`,
  )
  .join("\n")}
Estrutura em resumo: ${dec.resumo_estrutura ?? ""}
Legenda: ${JSON.stringify(dec.legenda ?? {})}
A referência NÃO usa: ${(dec.nao_usa ?? []).join(", ") || "(nada listado)"} — então isso não entra.`
    : "";
  const efeitos = [...PALETA_REFERENCIA, ...formatosRef].filter(
    (t) => EFEITO_POR_TIPO[t]?.disponivel,
  );
  // Roteiro ligado ao vídeo: o plano de edição bloco a bloco (o que aparece em cada fala).
  const roteiroId = (proj as { roteiro_id?: string | null }).roteiro_id;
  const { data: rot } = roteiroId
    ? await db().from("vedit_roteiros").select("roteiro").eq("id", roteiroId).maybeSingle()
    : { data: null };
  const blocosRot = (
    ((rot as { roteiro?: { blocos?: unknown[] } } | null)?.roteiro?.blocos ?? []) as {
      fala: string;
      visual?: { formato?: string; midia?: string; tipo?: string; busca?: string };
    }[]
  ).filter((b) => b.visual?.formato);
  const planoRoteiro = blocosRot.length
    ? `PLANO DE EDIÇÃO DO ROTEIRO (siga bloco a bloco; ache a fala na transcrição e ponha o visual exatamente nela):\n${blocosRot
        .map(
          (b) =>
            `- "${b.fala.slice(0, 90)}" → ${b.visual!.formato}${b.visual!.midia ? `: ${b.visual!.midia}` : ""}${b.visual!.busca ? ` (buscar_midia: "${b.visual!.busca}")` : ""}`,
        )
        .join("\n")}`
    : "";
  const estiloLeg = valido(ESTILOS_LEGENDA, pr.legenda ?? a.ritmo?.legenda_estilo);
  // O look da referência só entra se não brigar com a luz do nosso vídeo (medida no editor).
  const look = valido(LOOKS, lookCompativel(pr.look, luz));
  const transicao = valido(TRANSICOES, pr.transicao);
  // Marca: a cadastrada da empresa ativa (RLS), lida agora — não a que ficou gravada no vídeo,
  // senão trocar a marca do cliente não mudava nada. Empresa sem marca segue a tipografia e a
  // cor de destaque da própria referência (antes caía no padrão do editor, que não é de ninguém).
  const { data: marcas } = await db()
    .from("vedit_marcas")
    .select("marca")
    .order("padrao", { ascending: false })
    .limit(1);
  const marcaEmpresa = (marcas?.[0] as { marca?: Partial<typeof tl.marca> } | undefined)?.marca;
  const fonte = (f?: string) => (f && FONTES.includes(f) ? f : undefined);
  const hex = (c?: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : undefined);
  const daReferencia = {
    ...(fonte(pr.fonte_titulo) ? { fonteTitulo: fonte(pr.fonte_titulo) } : {}),
    ...((fonte(pr.fonte_texto) ?? fonte(pr.fonte_titulo))
      ? { fonteLegenda: fonte(pr.fonte_texto) ?? fonte(pr.fonte_titulo) }
      : {}),
    ...(hex(pr.cor_destaque) ? { destaque: hex(pr.cor_destaque) } : {}),
  };
  const usaMarca = !!marcaEmpresa && Object.keys(marcaEmpresa).length > 0;
  const fontesDaReferencia = {
    ...(daReferencia.fonteTitulo ? { fonteTitulo: daReferencia.fonteTitulo } : {}),
    ...(daReferencia.fonteLegenda ? { fonteLegenda: daReferencia.fonteLegenda } : {}),
  };
  const ritmoRef = a.ritmo?.estimulo_medio_s;
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
    // Correção de cor dosada pela medição do NOSSO vídeo (pele, exposição), não pela luz da referência.
    visual: {
      ...tl.visual,
      brilho: 1,
      contraste: 1,
      saturacao: 1,
      temperatura: 0,
      sombras: 0,
      ...dose.visual,
      ...(look ? { look } : {}),
      ...(transicao ? { transicao } : {}),
    },
    // Da marca entram só as CORES; tipografia, layout, ritmo e legenda são os da referência.
    // Sem marca cadastrada, a cor de destaque também vem da referência.
    marca: usaMarca
      ? { ...tl.marca, ...marcaEmpresa, ...fontesDaReferencia }
      : { ...tl.marca, ...daReferencia },
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
        `- ${t.nome} (${t.de}s–${t.ate}s, ${t.categoria}): ${t.como_reproduzir}`,
    )
    .join("\n");
  const pedido = enviarAoClaude(
    p.id,
    `/editar seguindo a referência ${novo.modelo.nome} (${a.estilo?.nome ?? "estilo"}).
${a.prompt_para_editor}

TÉCNICAS DA REFERÊNCIA (reproduza a forma de cada uma no que fizer sentido para este vídeo):
${tecnicas}

${
  usaMarca
    ? `DESIGN: da MARCA entram só as CORES (marca.destaque, marca.primaria, marca.texto, marca.fundo): troque cada cor da referência pela equivalente da marca. Todo o resto é da REFERÊNCIA, ao pé da letra: fontes (já gravadas em marca.fonteTitulo/fonteLegenda: ${JSON.stringify(fontesDaReferencia)}), caixa, peso, tamanho, posição, cantos, borda, sombra e entradas de cada grafismo (${a.estilo?.tipografia ?? "tipografia da referência"}).`
    : `DESIGN: esta empresa não tem marca cadastrada, então a tipografia e a cor de destaque são as da REFERÊNCIA (já gravadas em marca: ${JSON.stringify(daReferencia)}). Siga o acabamento dela ao pé da letra (${a.estilo?.tipografia ?? "tipografia da referência"}): disposição, tamanhos, caixa, espaçamento, cantos e entradas.`
}
${
  a.layouts?.length
    ? `LAYOUTS-CHAVE DA REFERÊNCIA (são o molde EXATO de cada /composicao: mesmas posições x/y/w/h, mesmos tamanhos de letra, mesma quantidade de elementos e itens, mesma ordem e entradas; troque só os textos entre chaves pelo conteúdo da fala deste vídeo e as cores pelas da marca):
${JSON.stringify(a.layouts).slice(0, 6000)}`
    : ""
}

${mapaEstrutura}

${planoRoteiro}

REGRAS AO SEGUIR A REFERÊNCIA:
1. Copie a ESTRUTURA ao pé da letra: layout de cada grafismo (posição, tamanho, fonte, caixa, acabamento), ritmo, transições, estilo e posição da legenda. Da marca, só as cores. NUNCA copie textos, marcas, nomes de produto, @, assunto, números ou palavra do CTA da referência: todo texto na tela sai da fala DESTE vídeo (a TRANSCRIÇÃO) e da nossa marca. NUNCA invente dados, números, depoimentos, nomes de clientes nem textos de preenchimento ("Cliente 1", "Cargo · Empresa"): se a referência tem depoimento, ranking ou número e a fala deste vídeo não tem, PULE essa técnica.
2. Não encurte o vídeo. Se já houver cortes, mantenha-os; se não houver, tire só silêncios e tomadas repetidas.
3. Os efeitos antigos foram apagados. FORMATO DE TELA igual ao da referência: ${formatosRef.length ? `ela usa ${formatosRef.map((t) => "/" + t).join(", ")} — use os mesmos, nos mesmos momentos relativos, com a mesma proporção, lado e emenda medidos na DECUPAGEM (em /dividir passe "proporcao" e "emenda" exatamente como lá)` : "ela não divide a tela nem corta para outra mídia"}. Grafismos, cards, listas, telas de app, números e ícones são ELEMENTOS da /composicao no desenho da referência. Não use modelos prontos que ela não usa (cards-flutuantes, mockup, icones, palavra-gigante, letreiro, colagem, rabisco, partículas). /cta-final no fim, como último efeito.
4. A pessoa só sai da tela onde a referência também tira (b-roll em tela cheia curto); no resto ela fica visível. Em /composicao com fundo sólido, inclua um elemento {"tipo":"pessoa"} como na referência.
5. IMAGENS E VÍDEOS DA REFERÊNCIA (obrigatório; o TIPO de mídia é o mesmo dela: se ela mostra fotos/vídeos reais do fato citado, aqui também são fotos reais do fato que você cita, via buscar_midia tipo "noticia"; nada de ícone ou desenho onde ela usou foto): para CADA técnica de categoria "midia" ou "formato" acima (vídeos, fotos, prints, b-roll, janelinhas, tela dividida), coloque a equivalente com o assunto DESTE vídeo, no mesmo momento relativo e no mesmo formato de tela (/dividir, /broll ou elemento da /composicao, como ela fez), com o mesmo acabamento (tamanho, posição, cantos, borda, sombra, entrada). Prefira VÍDEO quando ela usou vídeo:
   - ilustração, objeto, app ou logo → elemento {"tipo":"icone"} (ex.: planilha, whatsapp, dinheiro) entrando na palavra exata;
   - foto ou b-roll do que é dito (pessoa trabalhando, escritório, planilha, dinheiro, cliente…) → chame buscar_midia ANTES (consulta em inglês, concreta e visual; até 8 buscas, peça várias de uma vez na mesma resposta, tipo "video" quando ela usou vídeo) e use o id devolvido num elemento {"tipo":"midia","midia":"<id>"} (janela com borda e raio, como na referência, ou grande atrás dos textos);
   - print ou gravação de tela → mídia enviada deste vídeo num elemento "midia"; sem print enviado, desenhe a tela com caixas e textos dentro da composição.
   Use só ids de MÍDIAS ENVIADAS ou devolvidos por buscar_midia (id inventado é descartado). Nada de molduras vazias. Na resposta, diga em uma frase quais imagens você colocou e em que momento.
6. Ritmo: o MESMO da referência${ritmoRef ? ` (um estímulo a cada ~${ritmoRef}s)` : ""}, com grafismos da mesma duração dos dela e nos mesmos momentos relativos do vídeo.
7. Fora da tela dividida e do b-roll em tela cheia, nada em cima do rosto. O rosto está em ${rosto ? `x ${rosto.x.toFixed(2)}, y ${rosto.y.toFixed(2)}, w ${rosto.w.toFixed(2)}, h ${rosto.h.toFixed(2)}` : "no centro do quadro"} (frações do quadro): imagens e cards ficam ACIMA (y + h < ${rosto ? (rosto.y - 0.02).toFixed(2) : "0.30"}) ou ABAIXO (y > ${rosto ? (rosto.y + rosto.h + 0.02).toFixed(2) : "0.66"}) dele, e cabem nesse espaço (uma imagem acima da cabeça tem no máximo essa altura). Nada de imagem grande no meio do quadro.
8. LUZ E COR: a cor da referência NÃO se copia (foi gravada com outra luz). A correção de imagem (visual.brilho/contraste/saturacao/temperatura/sombras) já foi dosada pela medição deste vídeo — ${dose.resumo} — e você NÃO mexe nela nem no look. Lembre que a compressão da Meta puxa vermelho e satura: nada de look quente, saturação acima de 1 ou grafismo laranja/vermelho grande perto do rosto. Cores dos grafismos: as da marca, escolhendo fundo escuro ou claro pelo que contrasta com o quadro (quadro ${luz ? (luz.lumaMedia < 0.3 ? "escuro → grafismos claros/vidro" : luz.lumaMedia > 0.65 ? "claro → grafismos escuros" : "médio") : "não medido"}).
9. Tudo precisa caber no formato deste vídeo (${p.formato ?? "9:16"}) e nos trechos em que a fala acontece.`,
  );
  return { nome: novo.modelo.nome, pedido };
}
