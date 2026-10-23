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
  config: {
    legenda: Pick<
      Timeline["legenda"],
      "ativa" | "estilo" | "posicao" | "palavrasPorBloco" | "caixaAlta" | "altura"
    >;
    visual: Partial<Timeline["visual"]>;
    zoom: Pick<Timeline["zoom"], "alternar">;
    musica: Partial<Timeline["musica"]>;
    marca: Timeline["marca"];
  };
  efeitos: string[];
  ritmo: number | null; // efeitos por minuto
  sons: boolean;
  notas: string;
};

const MANIFESTO = "modelos/biblioteca.json";

export async function listarModelos(): Promise<Modelo[]> {
  const { data, error } = await supabase.storage.from(BUCKET).download(MANIFESTO);
  if (error || !data) return [];
  try {
    return JSON.parse(await data.text()) as Modelo[];
  } catch {
    return [];
  }
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
  const lista = await listarModelos();
  // Só um modelo pode ser o padrão para vídeos novos.
  const outros = m.padrao ? lista.map((x) => ({ ...x, padrao: false })) : lista;
  await gravar([...outros, m]);
}

export async function removerModelo(id: string) {
  await gravar((await listarModelos()).filter((m) => m.id !== id));
}

export async function definirPadrao(id: string | null) {
  await gravar((await listarModelos()).map((m) => ({ ...m, padrao: m.id === id })));
}

/** Aplica o modelo por cima da edição (mantém cortes, efeitos e tempos deste vídeo). */
export function aplicarModelo(tl: Timeline, m: Modelo): Timeline {
  const c = m.config;
  return {
    ...tl,
    legenda: { ...tl.legenda, ...c.legenda },
    visual: { ...tl.visual, ...c.visual },
    zoom: { ...tl.zoom, ...c.zoom },
    musica: { ...tl.musica, ...c.musica, midia: c.musica.midia ?? tl.musica.midia },
    marca: { ...tl.marca, ...c.marca },
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
