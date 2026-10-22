// Renderiza um still de cada efeito sobre um vídeo de teste, para conferir visualmente.
// Uso: npx tsx teste-efeitos.ts <url-do-video> <palavras.json> <pasta-saida> [tipos,separados]
import path from "node:path";
import fs from "node:fs";
import { renderStill, selectComposition } from "@remotion/renderer";
import { prepararBundle } from "./worker";
import { EFEITOS } from "../src/video/catalogo";

const [url, palavrasPath, dir, so] = process.argv.slice(2);
const palavras = JSON.parse(fs.readFileSync(palavrasPath, "utf8"));
const lista = EFEITOS.filter((e) => e.disponivel && (!so || so.split(",").includes(e.tipo)));
const props: Record<string, any> = {
  vidro: { titulo: "Retenção do Reel", valores: [40, 52, 61, 70, 84, 92] },
  grafico: {
    titulo: "Leads por mês",
    valores: [18, 31, 54, 97],
    rotulos: ["Jul", "Ago", "Set", "Out"],
  },
  letreiro: { texto: "IAPLICADA", legenda: "SISTEMAS COM IA" },
  papel: { texto: "R$ 4,7 mi", posicao: "superior" },
  "post-its": {
    notas: [
      "Lead sem resposta",
      "Planilha manual",
      "Proposta atrasada",
      "Fim de semana no WhatsApp",
    ],
  },
  notificacao: {
    itens: ["Novo lead qualificado", "Proposta enviada", "Contrato assinado"],
    app: "CRM IAplicada",
  },
  contador: { valor: 37, sufixo: "h", legenda: "economizadas por semana" },
  orbita: { itens: ["Leads", "Propostas", "Atendimento", "Relatórios", "Financeiro"] },
  colagem: { rotulos: ["caso 1", "caso 2", "caso 3", "caso 4", "caso 5"] },
  "antes-depois": {},
  particulas: { tempo: 6 },
  rabisco: { forma: "circulo", x: 0.5, y: 0.3, texto: "olha isso" },
  broll: { modo: "janela", tempo: 15, legenda: "o sistema rodando" },
  dividir: { midia: "<id-ou-url-de-uma-midia>", lado: "cima", legenda: "demo" },
  reagir: { midia: "<id-ou-url-de-uma-midia>", canto: "inferior-direito", titulo: "Olha isso" },
  "fundo-imagem": { midia: "<id-ou-url-de-uma-midia>", titulo: "Escritório lotado" },
  "numero-capitulo": { numero: "2", texto: "dar o guia de marca" },
  cracha: { nome: "Mari", posicao: "topo" },
  azulejos: { texto: "EDIT", posicao: "topo" },
  "frase-caixa": { texto: "tão simples que até sua *avó* consegue" },
  "lista-editorial": { titulo: "Três motivos", itens: ["Escolher o modelo certo", "Dar o guia de marca", "Aprovar o storyboard"] },
  capa: {
    titulo: "IAPLICADA",
    chamadas: ["A empresa que não dorme", "IA no atendimento"],
    selo: "2026",
  },
};
const serveUrl = await prepararBundle();
let t = 0.5;
const efeitos = lista.map((e, i) => {
  const d = {
    id: `x${i}`,
    tipo: e.tipo,
    de: t,
    ate: t + e.duracaoPadrao,
    props: props[e.tipo] ?? {},
  };
  t += e.duracaoPadrao + 0.2;
  return d;
});
const timeline = {
  legenda: { ativa: true, estilo: "karaoke" },
  efeitos,
  zoom: { alternar: false },
};
const inputProps = {
  timeline,
  palavras,
  duracaoFonte: Number(process.env.DURACAO ?? 24),
  fonteUrl: url,
  midias: {},
};
const comp = await selectComposition({ serveUrl, id: "Reel", inputProps });
for (const e of efeitos) {
  const fr = Math.round((e.de + (e.ate - e.de) * 0.62) * 30) % comp.durationInFrames;
  await renderStill({
    serveUrl,
    composition: comp,
    inputProps,
    frame: fr,
    output: path.join(dir, `fx-${e.tipo}.png`),
    scale: 0.3,
  });
}
console.log("ok", efeitos.map((e) => e.tipo).join(","));
