// Modelos de edição: salva o "jeito" de um vídeo que ficou bom (legenda, look, transição,
// música, zoom, efeitos usados) para repetir nos próximos. Sem tabela nova: manifesto no bucket.
import { supabase } from "@/integrations/supabase/client";
import { BUCKET } from "@/lib/vedit";
import { duracaoSaida, trechosMantidos } from "@/video/tempo";
import type { Timeline } from "@/video/schema";

export type Modelo = {
  id: string;
  nome: string;
  criado_em: string;
  origem?: { projeto_id: string; nome: string };
  objetivo?: string;
  estilo?: string | null;
  padrao?: boolean; // aplica sozinho em todo vídeo novo
  base?: boolean; // modelo de fábrica (kit das referências): não se apaga
  // Cores das referências (opcional na hora de aplicar; por padrão ficam as da marca).
  paleta?: Partial<Timeline["marca"]>;
  referencias?: string[]; // @ dos Reels de onde o estilo saiu
  config: {
    legenda: Pick<
      Timeline["legenda"],
      "ativa" | "estilo" | "posicao" | "palavrasPorBloco" | "caixaAlta" | "altura" | "tamanho"
    >;
    visual: Partial<Timeline["visual"]>;
    zoom: Pick<Timeline["zoom"], "alternar">;
    musica: Partial<Timeline["musica"]>;
    marca?: Timeline["marca"];
  };
  efeitos: string[];
  ritmo: number | null; // efeitos por minuto
  sons: boolean;
  notas: string;
};

const MANIFESTO = "modelos/biblioteca.json";

// ── Kit das referências (nov/2026) ──────────────────────────────────────────
// Reengenharia de 12 Reels, agrupados em 4 famílias de estilo. Ficam no código (não no bucket):
// sempre disponíveis e iguais no preview e no render. As notas são o "manual" que o editor IA lê
// ao montar os efeitos (tl.modelo.notas): o que usar, quando, em que ritmo, com que som e cortes.
export const MODELOS_BASE: Modelo[] = [
  {
    id: "base-cartaz",
    nome: "Cartaz cinematográfico",
    criado_em: "2026-11-05T00:00:00.000Z",
    base: true,
    referencias: ["kalylsfilms (2 Reels)"],
    config: {
      legenda: {
        ativa: true,
        estilo: "serifa",
        posicao: "inferior",
        palavrasPorBloco: 3,
        caixaAlta: false,
        altura: 0.72,
        tamanho: 1,
      },
      visual: { look: "cinema", vinheta: 0.35, grao: 0.08, transicao: "flash" },
      zoom: { alternar: true },
      musica: {},
    },
    paleta: { destaque: "#E01B14", primaria: "#F2BE3C", texto: "#FFFFFF" },
    efeitos: ["titulo-cartaz", "tela-tripla", "carrossel", "cartela", "texto-atras", "cta-final"],
    ritmo: 13,
    sons: true,
    notas: [
      "LEGENDA: serifada branca pequena, 3 palavras, logo abaixo do queixo; destaques em itálico.",
      "GANCHO (0–3s): /cartaz com 2–4 linhas curtas em caixa alta empilhadas (ex.: ['ESSES SÃO','MEUS 3','~favoritos']), piscar true; a linha com ~ é a pincel por cima.",
      "TÓPICOS: cada item falado ('número um', 'primeiro') ganha um /cartaz curto no topo (1–2 linhas), 2–2,5s. Se houver pessoa recortada, use atras: true em 1 deles (texto passando por trás da cabeça).",
      "B-ROLL: quando falar de rotina/bastidor/variações, /tripla com 3 mídias (ou trechos do próprio vídeo) por 2–3s. Para mostrar exemplos/resultados, /carrossel com 3–5 telas no fundo da cor de destaque, piscar true.",
      "TRANSIÇÃO: no máx. 2 /cartela (0,5s) nas viradas de bloco, sempre antes do CTA final.",
      "CORTES: jump cut seco a cada 1,5–2,5s, zoom alternando 1.0/1.08 e um soco de zoom (1.08, 0,2s) nas palavras de ênfase. Sem transição entre falas.",
      "SOM: impacto na entrada de cada /cartaz, whoosh na /tripla, swipe no /carrossel, glitch na /cartela; música baixa ou nenhuma.",
      "RITMO: um grafismo a cada ~4,5s, com respiro (você falando sem nada) entre eles.",
    ].join(" "),
  },
  {
    id: "base-painel",
    nome: "Painel escuro editorial",
    criado_em: "2026-11-05T00:00:00.000Z",
    base: true,
    referencias: ["kallawaymarketing (2 Reels)", "david_knowsai"],
    config: {
      legenda: {
        ativa: true,
        estilo: "palavra",
        posicao: "centro",
        palavrasPorBloco: 1,
        caixaAlta: false,
        altura: 0.64,
        tamanho: 1,
      },
      visual: { look: "cinema", vinheta: 0.3, grao: 0, transicao: "nenhuma" },
      zoom: { alternar: true },
      musica: {},
    },
    paleta: { destaque: "#D40024", fundo: "#0B0B0D", texto: "#FFFFFF" },
    efeitos: ["painel", "composicao", "contador", "cta-final"],
    ritmo: 15,
    sons: true,
    notas: [
      "LEGENDA: uma palavra por vez, bold branca, entre o grafismo e o card (altura ~0.64).",
      "ESTRUTURA: alterne dois planos. (1) /painel: fundo escuro, título no topo com *trecho* em itálico serifado (ex.: 'O *framework* das 3 etapas'), grafismo no meio e você no card do rodapé, 4–8s. (2) Você em tela cheia nas frases de conexão e conclusões, 2–4s, com zoom 1.08.",
      "MODOS DO PAINEL: 'lista' para etapas/itens (até 5), 'linha-do-tempo' para evolução (marcos curtos: anos, fases), 'mapa' para um conceito central com ramificações (centro + itens), 'documento' para mostrar um texto sendo escrito (prompt, mensagem, roteiro).",
      "Use o mesmo título do /painel enquanto o tema não muda (dá continuidade); troque o modo/itens a cada tópico.",
      "NÚMEROS: /contador dentro do bloco quando a fala citar um número forte.",
      "CORTES: corte seco entre painel e tela cheia, sem transição; tire todas as pausas.",
      "SOM: whoosh suave na entrada de cada painel, click discreto nas trocas de item; sem música ou bem baixa.",
    ].join(" "),
  },
  {
    id: "base-minimal",
    nome: "Minimal falado",
    criado_em: "2026-11-05T00:00:00.000Z",
    base: true,
    referencias: ["laraacostar", "abigaildaniellla", "gen.figgy (café)", "dash.werk"],
    config: {
      legenda: {
        ativa: true,
        estilo: "minimal",
        posicao: "centro",
        palavrasPorBloco: 3,
        caixaAlta: false,
        altura: 0.56,
        tamanho: 1,
      },
      visual: { look: "natural", vinheta: 0.15, grao: 0, transicao: "nenhuma" },
      zoom: { alternar: true },
      musica: {},
    },
    paleta: { destaque: "#FFE800" },
    efeitos: ["titulo", "palavra-gigante", "dividir", "cta-final"],
    ritmo: 6,
    sons: false,
    notas: [
      "LEGENDA: sans pequena branca, 2–4 palavras, no peito (nunca no rosto); marque em 'destaques' só a palavra-chave de cada frase (número, resultado, nome) para sair na cor de destaque.",
      "GANCHO: a primeira frase (pergunta ou promessa) com /titulo curto ou só a legenda com destaque; nada de grafismo pesado.",
      "GRAFISMO MÍNIMO: no máx. 1 a cada 10s; /gigante só no número mais forte; /dividir quando precisar mostrar tela/produto.",
      "CORTES: jump cut seco a cada 1,5–3s tirando TODAS as pausas e muletas; reenquadre em três tamanhos de plano (zoom 1.0 / 1.10 / 1.18) alternando a cada bloco de assunto.",
      "SOM: só voz limpa, sem música e sem efeitos sonoros.",
      "FINAL: corta no pico da última ideia; /cta-final curto (2,5s) só se for anúncio.",
    ].join(" "),
  },
  {
    id: "base-tutorial",
    nome: "Tutorial colorido",
    criado_em: "2026-11-05T00:00:00.000Z",
    base: true,
    referencias: ["gen.figgy (sala)", "celfstudies", "ignaciovasconez"],
    config: {
      legenda: {
        ativa: true,
        estilo: "minimal",
        posicao: "centro",
        palavrasPorBloco: 2,
        caixaAlta: false,
        altura: 0.62,
        tamanho: 1,
      },
      visual: { look: "natural", vinheta: 0.1, grao: 0, transicao: "zoom" },
      zoom: { alternar: true },
      musica: {},
    },
    paleta: { destaque: "#F7931E" },
    efeitos: ["capitulo", "colagem", "icones", "broll", "dividir", "cta-final"],
    ritmo: 17,
    sons: true,
    notas: [
      "LEGENDA: sans pequena, 2 palavras, centro; substantivo-chave de cada frase em 'destaques' (cor de destaque).",
      "CAPÍTULOS: cada item da lista falada abre com /capitulo (numero + 1 palavra, ex.: 1 COR, 2 FONTE, 3 ANIMAÇÃO), 2s no topo.",
      "EXEMPLOS: logo depois do capítulo, mostre o exemplo: /colagem (2–4 imagens tipo adesivo) ou /icones (apps/ferramentas citados), 2–3s, sempre fora do rosto.",
      "CORTES: jump cut a cada frase e soco de zoom 1.08–1.2 nas palavras de ênfase; pode repetir um trecho curto (0,3s) para efeito cômico.",
      "SOM: pop na entrada de cada capítulo e de cada card/imagem, click em UI, digitando em texto sendo escrito; nunca o mesmo som duas vezes seguidas; sem música ou bem baixa.",
      "FINAL: últimos 3s em plano aberto só com legenda, depois /cta-final.",
    ].join(" "),
  },
];

export async function listarModelos(): Promise<Modelo[]> {
  const { data, error } = await supabase.storage.from(BUCKET).download(MANIFESTO);
  let salvos: Modelo[] = [];
  if (!error && data) {
    try {
      salvos = JSON.parse(await data.text()) as Modelo[];
    } catch {
      salvos = [];
    }
  }
  return [...MODELOS_BASE, ...salvos.filter((m) => !m.base)];
}

/** Só os modelos salvos pela pessoa (os de fábrica não vão para o manifesto). */
async function listarSalvos(): Promise<Modelo[]> {
  return (await listarModelos()).filter((m) => !m.base);
}

async function gravar(lista: Modelo[]) {
  const blob = new Blob([JSON.stringify(lista, null, 1)], { type: "application/json" });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(MANIFESTO, blob, { contentType: "application/json", upsert: true, cacheControl: "0" });
  if (error) throw new Error(error.message);
}

/** Tira do vídeo atual o que é estilo (e deixa de fora o que é só deste vídeo: cortes, textos, tempos). */
export function extrairModelo(
  tl: Timeline,
  info: {
    nome: string;
    projeto_id: string;
    projeto_nome: string;
    objetivo?: string;
    estilo?: string | null;
    duracaoFonte: number;
  },
  opts: { luz: boolean; padrao: boolean; notas?: string },
): Modelo {
  const { brilho, contraste, saturacao, temperatura, sombras, nitidez, ...visual } = tl.visual;
  const contagem = new Map<string, number>();
  for (const e of tl.efeitos) contagem.set(e.tipo, (contagem.get(e.tipo) ?? 0) + 1);
  const minutos = duracaoSaida(trechosMantidos(tl, info.duracaoFonte)) / 60;
  const musica = tl.musica.midia?.startsWith("trilha:") ? tl.musica : { ...tl.musica, midia: null }; // mídia de projeto não existe no próximo vídeo
  return {
    id: `m${Date.now().toString(36)}`,
    nome: info.nome,
    criado_em: new Date().toISOString(),
    origem: { projeto_id: info.projeto_id, nome: info.projeto_nome },
    objetivo: info.objetivo,
    estilo: info.estilo,
    padrao: opts.padrao,
    config: {
      legenda: {
        ativa: tl.legenda.ativa,
        estilo: tl.legenda.estilo,
        posicao: tl.legenda.posicao,
        palavrasPorBloco: tl.legenda.palavrasPorBloco,
        caixaAlta: tl.legenda.caixaAlta,
        altura: tl.legenda.altura,
        tamanho: tl.legenda.tamanho,
      },
      visual: opts.luz ? tl.visual : visual,
      zoom: { alternar: tl.zoom.alternar },
      musica: { ...musica, inicio: 0 },
      marca: tl.marca,
    },
    efeitos: [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
    ritmo: minutos > 0.1 ? +(tl.efeitos.length / minutos).toFixed(1) : null,
    sons: tl.sfx.length > 0,
    notas: opts.notas ?? "",
  };
}

export async function salvarModelo(m: Modelo) {
  const lista = await listarSalvos();
  // Só um modelo pode ser o padrão para vídeos novos.
  const outros = m.padrao ? lista.map((x) => ({ ...x, padrao: false })) : lista;
  await gravar([...outros, m]);
}

export async function removerModelo(id: string) {
  await gravar((await listarSalvos()).filter((m) => m.id !== id));
}

export async function definirPadrao(id: string | null) {
  await gravar((await listarSalvos()).map((m) => ({ ...m, padrao: m.id === id })));
}

/** Aplica o modelo por cima da edição (mantém cortes, efeitos e tempos deste vídeo). */
export function aplicarModelo(
  tl: Timeline,
  m: Modelo,
  opts?: { coresDaReferencia?: boolean },
): Timeline {
  const c = m.config;
  return {
    ...tl,
    legenda: { ...tl.legenda, ...c.legenda },
    visual: { ...tl.visual, ...c.visual },
    zoom: { ...tl.zoom, ...c.zoom },
    musica: { ...tl.musica, ...c.musica, midia: c.musica.midia ?? tl.musica.midia },
    // Cores e fontes: as da marca, a não ser que a pessoa peça as da referência.
    marca: {
      ...tl.marca,
      ...(c.marca ?? {}),
      ...(opts?.coresDaReferencia && m.paleta ? m.paleta : {}),
    },
    modelo: {
      id: m.id,
      nome: m.nome,
      efeitos: m.efeitos,
      ritmo: m.ritmo,
      notas: [m.notas, m.sons ? "usa efeitos sonoros" : "sem efeitos sonoros"]
        .filter(Boolean)
        .join(" · "),
    },
  };
}
