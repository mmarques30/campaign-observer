import { staticFile } from "remotion";

// Efeitos sonoros embarcados (sintetizados, sem licença de terceiros).
// Para trocar por uma biblioteca paga depois, basta mudar o arquivo mantendo o id.
export const SONS = {
  whoosh: { nome: "Whoosh", uso: "transição, entrada de elemento grande" },
  swipe: { nome: "Swipe curto", uso: "troca rápida de card, corte seco" },
  pop: { nome: "Pop", uso: "palavra, ícone ou card que aparece" },
  click: { nome: "Clique", uso: "item de checklist, UI, botão" },
  ding: { nome: "Ding", uso: "revelação, número, insight" },
  sucesso: { nome: "Sucesso", uso: "resultado, antes/depois, check final" },
  riser: { nome: "Riser (2s)", uso: "tensão antes de uma revelação" },
  impacto: { nome: "Impacto", uso: "palavra gigante, soco de zoom, virada" },
  obturador: { nome: "Obturador", uso: "foto, print, colagem" },
  digitar: { nome: "Digitando", uso: "texto sendo escrito, prompt, letreiro" },
  glitch: { nome: "Glitch", uso: "transição digital, erro, quebra" },
  papel: { nome: "Papel", uso: "post-it, recorte, colagem" },
} as const;
export type SomId = keyof typeof SONS;

export const urlSom = (id: string) => staticFile(`vedit/sfx/${id in SONS ? id : "pop"}.wav`);
