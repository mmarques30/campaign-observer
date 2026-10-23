// Trilhas sonoras de base (sintetizadas para o projeto, sem direitos de terceiros: scripts/trilhas-sintese.py).
// A biblioteca da marca (uploads) fica no bucket; aqui só as que vêm com o editor.
import { staticFile } from "remotion";

export type TrilhaInfo = {
  id: string; // "base-pulso" ou id da biblioteca
  nome: string;
  humor: string[];
  energia: "baixa" | "media" | "alta";
  bpm?: number;
  uso: string; // quando usar
  ganho: number; // normalização de volume (1 = já nivelada)
};

export const TRILHAS_BASE: (TrilhaInfo & { arquivo: string })[] = [
  {
    id: "base-pulso",
    nome: "Pulso",
    humor: ["energetico", "moderno", "confiante"],
    energia: "alta",
    bpm: 118,
    uso: "Anúncio direto (dor → solução → CTA), listas rápidas, estilo viral.",
    ganho: 1,
    arquivo: "vedit/trilhas/pulso.mp3",
  },
  {
    id: "base-corporativo",
    nome: "Corporativo leve",
    humor: ["inspirador", "corporativo", "positivo"],
    energia: "media",
    bpm: 100,
    uso: "Método, autoridade, institucional, estilo editorial ou limpo.",
    ganho: 1,
    arquivo: "vedit/trilhas/corporativo.mp3",
  },
  {
    id: "base-tensao",
    nome: "Tensão",
    humor: ["tenso", "dramatico", "urgente"],
    energia: "media",
    bpm: 92,
    uso: "Abrir com dor/problema/prejuízo; virada antes da solução.",
    ganho: 1,
    arquivo: "vedit/trilhas/tensao.mp3",
  },
  {
    id: "base-lofi",
    nome: "Lo-fi",
    humor: ["calmo", "intimo", "bastidor"],
    energia: "baixa",
    bpm: 84,
    uso: "Orgânico conversado, bastidor, história pessoal.",
    ganho: 1,
    arquivo: "vedit/trilhas/lofi.mp3",
  },
];

export const CHAVE_TRILHA = "trilha:";

/** URL de uma trilha de base a partir da chave usada em timeline.musica.midia ("trilha:base-pulso"). */
export function urlTrilhaBase(chave: string | null | undefined) {
  if (!chave?.startsWith(CHAVE_TRILHA)) return undefined;
  const t = TRILHAS_BASE.find((x) => x.id === chave.slice(CHAVE_TRILHA.length));
  return t ? staticFile(t.arquivo) : undefined;
}

/** Volume recomendado da música por objetivo (antes do ducking). */
export const VOLUME_MUSICA = { anuncio: 0.16, organico: 0.12 } as const;
