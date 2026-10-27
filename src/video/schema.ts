// Contrato da edição. O Claude NUNCA escreve código de vídeo: ele devolve este
// JSON. O mesmo JSON alimenta o preview ao vivo (Remotion Player no navegador)
// e o render final (worker). Todos os tempos são em SEGUNDOS DO VÍDEO ORIGINAL
// (os mesmos tempos da transcrição); a composição converte para o tempo de
// saída depois dos cortes.
import { z } from "zod";

export const FORMATOS = {
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
} as const;
export type Formato = keyof typeof FORMATOS;

export const ESTILOS_LEGENDA = [
  "karaoke",
  "simples",
  "caixa",
  "editorial",
  "neon",
  "maquina",
  "impacto",
] as const;
// Transições nos cortes. "suave" = dissolve curto; "escurecer" = passa rapidinho pelo preto;
// "desfoque" = desfoca e volta; "zoom-suave" = aproximação leve com easing.
export const TRANSICOES = [
  "nenhuma",
  "suave",
  "escurecer",
  "desfoque",
  "zoom-suave",
  "flash",
  "chicote",
  "glitch",
  "zoom",
] as const;
export const NOME_TRANSICAO: Record<(typeof TRANSICOES)[number], string> = {
  nenhuma: "Nenhuma (corte seco)",
  suave: "Suave (dissolve)",
  escurecer: "Escurecer rápido",
  desfoque: "Desfoque",
  "zoom-suave": "Zoom suave",
  flash: "Flash branco",
  chicote: "Chicote",
  glitch: "Glitch",
  zoom: "Zoom de soco",
};
export const POSICOES_LEGENDA = ["inferior", "centro", "superior"] as const;
export const LOOKS = ["natural", "quente", "frio", "cinema", "pb", "vivo"] as const;

const intervalo = z.object({ de: z.number().min(0), ate: z.number().min(0) });

export const efeitoSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  de: z.number().min(0),
  ate: z.number().min(0),
  props: z.record(z.any()).default({}),
});
export type Efeito = z.infer<typeof efeitoSchema>;

export const timelineSchema = z.object({
  versao: z.literal(1).default(1),
  formato: z.enum(["9:16", "4:5", "1:1"]).default("9:16"),
  fps: z.number().default(30),
  // Trechos do original que ficam no vídeo final, em ordem. Vazio = vídeo inteiro.
  // Sem "ordemLivre" eles tocam na ordem do original; com ela, na ordem da lista (reordenar falas).
  // velocidade: acelera (ou desacelera) o trecho. 1 = normal. Voz mantém o tom.
  cortes: z
    .array(intervalo.extend({ velocidade: z.number().min(0.5).max(4).optional() }))
    .default([]),
  ordemLivre: z.boolean().default(false),
  // Onde está o rosto da pessoa no quadro (0–1), detectado no navegador. Grafismos desviam dele.
  rosto: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).nullish(),
  // Enquadramento do original dentro do quadro (reenquadrar 16:9 → 9:16).
  enquadramento: z
    .object({
      x: z.number().min(0).max(1).default(0.5),
      y: z.number().min(0).max(1).default(0.5),
      escala: z.number().min(1).max(3).default(1),
    })
    .default({}),
  zoom: z
    .object({
      // Alterna 1.0 / 1.12 a cada trecho (esconde o jump cut).
      alternar: z.boolean().default(true),
      eventos: z
        .array(
          z.object({
            de: z.number(),
            ate: z.number(),
            escala: z.number().min(1).max(2.5).default(1.25),
            x: z.number().default(0.5),
            y: z.number().default(0.4),
            tipo: z.enum(["suave", "soco"]).default("soco"),
          }),
        )
        .default([]),
    })
    .default({}),
  legenda: z
    .object({
      ativa: z.boolean().default(true),
      estilo: z.enum(ESTILOS_LEGENDA).default("karaoke"),
      posicao: z.enum(POSICOES_LEGENDA).default("inferior"),
      palavrasPorBloco: z.number().min(1).max(8).default(3),
      // Índices de palavras da transcrição que ganham destaque (cor + escala).
      destaques: z.array(z.number()).default([]),
      // Correções de grafia: índice da palavra → texto certo.
      correcoes: z.record(z.string()).default({}),
      caixaAlta: z.boolean().default(false),
      // Ajuste fino da altura (0 = topo, 1 = rodapé). null = usa a posição escolhida.
      altura: z.number().min(0.1).max(0.9).nullable().default(null),
      // Tamanho da letra (1 = padrão do estilo).
      tamanho: z.number().min(0.5).max(1.8).default(1),
    })
    .default({}),
  efeitos: z.array(efeitoSchema).default([]),
  sfx: z
    .array(
      z.object({ em: z.number(), som: z.string(), volume: z.number().min(0).max(1).default(0.6) }),
    )
    .default([]),
  musica: z
    .object({
      // id de mídia do projeto, ou "trilha:<id>" (biblioteca/trilhas de base)
      midia: z.string().nullable().default(null),
      volume: z.number().min(0).max(1).default(0.12),
      abaixarNaVoz: z.boolean().default(true),
      // Quanto a música baixa enquanto alguém fala (0.3 ≈ -10 dB).
      abaixarPara: z.number().min(0.05).max(1).default(0.3),
      ganho: z.number().min(0.1).max(4).default(1), // normalização da faixa
      inicio: z.number().min(0).default(0), // segundo da faixa onde começa
      // Segundo da faixa onde o trecho usado acaba (null = fim do arquivo). O trecho repete.
      fim: z.number().min(0).nullable().default(null),
      // Onde a música entra e sai no vídeo final (segundos; ate null = até o fim do vídeo).
      de: z.number().min(0).default(0),
      ate: z.number().min(0).nullable().default(null),
      repetir: z.boolean().default(true), // repete o trecho até o fim (com transição suave)
      fade: z.boolean().default(true),
    })
    .default({}),
  visual: z
    .object({
      look: z.enum(LOOKS).default("natural"),
      grao: z.number().min(0).max(1).default(0),
      vinheta: z.number().min(0).max(1).default(0.25),
      barraProgresso: z.boolean().default(false),
      transicao: z.enum(TRANSICOES).default("nenhuma"),
      // Correção de imagem (1 = sem mudança). Aplicada antes do look.
      brilho: z.number().min(0.5).max(1.6).default(1),
      contraste: z.number().min(0.5).max(1.6).default(1),
      saturacao: z.number().min(0).max(2).default(1),
      temperatura: z.number().min(-1).max(1).default(0), // -1 frio … +1 quente
      sombras: z.number().min(0).max(1).default(0), // levanta as sombras (rosto escuro)
      nitidez: z.number().min(0).max(1).default(0),
    })
    .default({}),
  // Voz: versão limpa gerada no servidor (ruído fora, EQ, volume nivelado). Usada quando existe.
  audio: z
    .object({
      limpar: z.boolean().default(true),
      intensidade: z.enum(["leve", "media", "forte"]).default("media"),
      volumeVoz: z.number().min(0.1).max(2).default(1),
    })
    .default({}),
  // Modelo de edição aplicado (salvo de outro vídeo). O editor IA segue esse padrão.
  modelo: z
    .object({
      id: z.string(),
      nome: z.string(),
      efeitos: z.array(z.string()).default([]), // tipos de efeito que o vídeo de origem usou
      ritmo: z.number().nullable().default(null), // efeitos por minuto no vídeo de origem
      notas: z.string().default(""),
    })
    .nullable()
    .default(null),
  marca: z
    .object({
      primaria: z.string().default("#6C2BD9"),
      destaque: z.string().default("#C6F432"),
      texto: z.string().default("#FFFFFF"),
      fundo: z.string().default("#0B0B0F"),
      fonteTitulo: z.string().default("Bricolage Grotesque"),
      fonteLegenda: z.string().default("Inter"),
      fonteSerif: z.string().default("Instrument Serif"),
    })
    .default({}),
});
export type Timeline = z.infer<typeof timelineSchema>;

export type Palavra = { p: string; i: number; f: number };

// Props completas da composição: o JSON da edição + o que vem do projeto.
export type ReelProps = {
  timeline: Timeline;
  palavras: Palavra[];
  fonteUrl: string;
  // Pessoa recortada (WebM com alfa) para os efeitos da fase 2.
  recorteUrl?: string;
  // Áudio leve (WAV da transcrição). No preview, o som vem daqui e o vídeo fica mudo:
  // nunca engasga e bate exatamente com a legenda. No render, o som é o do vídeo original.
  audioUrl?: string;
  // Voz limpa (leve/media/forte), quando o servidor já gerou. Vale para preview e render.
  // leve/media/forte = voz limpa; "audio" = a mesma voz com timbre de áudio de celular (efeito nota-de-voz).
  vozUrls?: Partial<Record<"leve" | "media" | "forte" | "audio", string>>;
  duracaoFonte: number;
  // id de mídia (upload do projeto) → URL assinada
  midias: Record<string, string>;
  // Prévia isolada de um efeito (galeria): sem vídeo de fundo real.
  modoGaleria?: boolean;
};

export function timelineVazia(formato: Formato = "9:16"): Timeline {
  return timelineSchema.parse({ formato });
}

/** Valida e completa defaults. Nunca lança: em erro, devolve o que der + lista de problemas. */
export function normalizarTimeline(raw: unknown): { timeline: Timeline; problemas: string[] } {
  const r = timelineSchema.safeParse(raw ?? {});
  if (r.success) return { timeline: r.data, problemas: [] };
  const problemas = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  // Tenta salvar campo a campo.
  const base = timelineVazia();
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) {
    const parcial = timelineSchema.shape[k as keyof typeof timelineSchema.shape].safeParse(obj[k]);
    if (parcial.success) merged[k] = parcial.data;
  }
  return { timeline: timelineSchema.parse(merged), problemas };
}
