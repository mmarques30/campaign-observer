// Edição de criativos: o design de um carrossel (ou post único) é um JSON de slides.
// O Claude escreve/edita esse JSON; o navegador desenha cada slide em HTML e exporta PNG.
import { z } from "zod";

export const FORMATOS = { "4:5": [1080, 1350], "1:1": [1080, 1080], "9:16": [1080, 1920] } as const;
export type Formato = keyof typeof FORMATOS;

export const LAYOUTS = [
  "capa",
  "tweet",
  "comando",
  "topico",
  "texto",
  "lista",
  "foto",
  "cta",
] as const;
export type Layout = (typeof LAYOUTS)[number];

export const NOME_LAYOUT: Record<Layout, string> = {
  capa: "Capa com foto",
  tweet: "Estilo post (tweet)",
  comando: "Comando / antes e depois",
  topico: "Tópico com imagem",
  texto: "Frase de impacto",
  lista: "Lista numerada",
  foto: "Foto com legenda",
  cta: "Chamada final",
};

export const FUNDOS = ["escuro", "claro", "marca", "destaque"] as const;

// Visual que explica o que o slide fala (layouts "texto" e "lista").
export const visualSchema = z.discriminatedUnion("tipo", [
  // cards lado a lado: ícone + título + detalhe + etiqueta (ex.: rotinas manuais)
  z.object({
    tipo: z.literal("cards"),
    itens: z
      .array(
        z.object({
          icone: z.string().nullish(),
          titulo: z.string(),
          detalhe: z.string().nullish(),
          tag: z.string().nullish(),
        }),
      )
      .min(1),
  }),
  // entradas → centro → saída (ex.: 3 rotinas → sistema → cresce sem contratar)
  z.object({
    tipo: z.literal("fluxo"),
    entradas: z.array(z.string()).min(1),
    icones: z.array(z.string()).nullish(),
    centro: z.string(),
    saida: z.string(),
  }),
  // gráfico de linhas (ex.: clientes x equipe); destaque = linha na cor de destaque
  z.object({
    tipo: z.literal("linhas"),
    series: z
      .array(
        z.object({
          nome: z.string(),
          pontos: z.array(z.number()).min(2),
          destaque: z.boolean().nullish(),
        }),
      )
      .min(1),
    eixo: z.array(z.string()).nullish(),
  }),
]);
export type Visual = z.infer<typeof visualSchema>;

export const slideSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).slice(2, 9)),
  layout: z.enum(LAYOUTS).catch("texto"),
  // pequeno rótulo acima do título: "/upscale", "Repo #1", "PASSO 2"
  rotulo: z.string().nullish(),
  titulo: z.string().nullish(),
  subtitulo: z.string().nullish(),
  // corpo; **palavra** vira destaque
  texto: z.string().nullish(),
  itens: z.array(z.string()).nullish(),
  // ids de cria_fotos (até 2: antes/depois no layout "comando")
  fotos: z.array(z.string()).nullish(),
  fundo: z.enum(FUNDOS).nullish(),
  // capa: "impacto" (condensada caixa alta) ou "elegante" (grande, minúscula, centralizada)
  variante: z.enum(["impacto", "elegante"]).nullish(),
  // foco da foto de fundo (CSS object-position), ex.: "50% 20%"
  foco: z.string().nullish(),
  visual: visualSchema.nullish().catch(null),
  // botão de chamada em destaque no fim do slide, ex.: "Quero conversar"
  botao: z.string().nullish(),
  // ajustes finos (capa e foto): tamanho do botão, altura do bloco de texto, escala do texto
  // e esconder a pílula com nome/foto da autora na capa
  botaoTamanho: z.enum(["pequeno", "medio", "grande"]).nullish().catch(null),
  botaoEstilo: z.enum(["destaque", "suave", "contorno"]).nullish().catch(null),
  alturaTexto: z.enum(["baixo", "meio", "alto"]).nullish().catch(null),
  escalaTexto: z.number().min(0.6).max(1.4).nullish().catch(null),
  semAutor: z.boolean().nullish(),
});
export type Slide = z.infer<typeof slideSchema>;

export const designSchema = z.object({
  tema: z
    .object({
      fundo: z.string().default("#0B0B0F"),
      texto: z.string().default("#FFFFFF"),
      destaque: z.string().default("#C6F432"),
      marca: z.string().default("#6C2BD9"),
      claro: z.string().default("#FFFFFF"),
      textoClaro: z.string().default("#0F1419"),
      fonteTitulo: z.string().default("Anton"),
      fonteTexto: z.string().default("Inter"),
    })
    .default({}),
  autor: z
    .object({
      nome: z.string().default("Mariana Marques"),
      arroba: z.string().default("marimarquescb"),
      foto: z.string().nullish(), // id de cria_fotos para o avatar
      verificado: z.boolean().default(true),
    })
    .default({}),
  // rodapé "deslize" nos slides intermediários e numeração
  mostrarNumeracao: z.boolean().default(true),
  // logo da IAplicada no canto de cima (cor certa para fundo claro ou escuro)
  logo: z
    .object({
      onde: z.enum(["todos", "primeiro", "ultimo", "primeiro-e-ultimo"]).default("todos"),
      lado: z.enum(["esquerda", "direita"]).default("esquerda"),
    })
    .nullish()
    .catch(null),
  legendaPost: z.string().nullish(), // texto sugerido para a legenda do Instagram
  slides: z.array(slideSchema).default([]),
});
export type Design = z.infer<typeof designSchema>;

export function normalizarDesign(d: unknown): Design {
  const r = designSchema.safeParse(d ?? {});
  return r.success ? r.data : designSchema.parse({});
}

export type CriaProjeto = {
  id: string;
  nome: string;
  tipo: "carrossel" | "unico";
  formato: Formato;
  objetivo: "organico" | "anuncio";
  briefing: string | null;
  roteiro: string | null;
  referencia_id: string | null;
  modelo_id?: string | null;
  design: unknown;
  versao: number;
  status: "rascunho" | "aguardando" | "gerando" | "pronto" | "erro";
  erro: string | null;
  created_at: string;
  updated_at: string;
};

export type CriaFoto = {
  id: string;
  path: string;
  nome: string | null;
  descricao: string | null;
  origem: "upload" | "ia" | "referencia";
  base_id: string | null;
  prompt: string | null;
  favorita: boolean;
  created_at: string;
};

export type CriaReferencia = {
  id: string;
  url: string | null;
  autor: string | null;
  legenda: string | null;
  imagens: string[];
  analise: {
    estilo?: string;
    resumo?: string;
    estrutura?: string[];
    tipografia?: string;
    cores?: string[];
    layouts?: string[];
    gancho?: string;
    dicas?: string[];
    prompt_para_criador?: string;
  } | null;
  status: "nova" | "baixando" | "analisando" | "pronta" | "erro";
  erro: string | null;
  created_at: string;
};

export type CriaMensagem = {
  id: string;
  projeto_id: string;
  papel: "usuario" | "claude" | "sistema";
  conteudo: string;
  created_at: string;
};
