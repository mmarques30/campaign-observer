import fs from "node:fs";
import { renderStill, selectComposition } from "@remotion/renderer";
import { prepararBundle } from "./worker";
const [url, palavrasPath, dir] = process.argv.slice(2);
const palavras = JSON.parse(fs.readFileSync(palavrasPath, "utf8"));
const serveUrl = await prepararBundle();
const casos: [string, any, number[]][] = [
  ["simples", { legenda: { ativa: true, estilo: "simples", palavrasPorBloco: 6 }, visual: { transicao: "nenhuma" } }, [45]],
  ["simples-baixa", { legenda: { ativa: true, estilo: "simples", palavrasPorBloco: 6, altura: 0.8 }, visual: {} }, [45]],
  ["suave", { legenda: { ativa: false }, visual: { transicao: "suave" } }, [89, 90, 92, 94, 97]],
  ["escurecer", { legenda: { ativa: false }, visual: { transicao: "escurecer" } }, [88, 89, 90, 92]],
  ["desfoque", { legenda: { ativa: false }, visual: { transicao: "desfoque" } }, [89, 90, 93]],
];
for (const [nome, extra, frames] of casos) {
  const timeline = { cortes: [{ de: 0, ate: 3 }, { de: 6, ate: 10 }], zoom: { alternar: false }, efeitos: [], ...extra };
  const inputProps = { timeline, palavras, duracaoFonte: Number(process.env.DURACAO ?? 12), fonteUrl: url, midias: {} };
  const comp = await selectComposition({ serveUrl, id: "Reel", inputProps });
  for (const f of frames)
    await renderStill({ composition: comp, serveUrl, inputProps, frame: f, output: `${dir}/${nome}-${f}.jpg`, imageFormat: "jpeg", scale: 0.3 });
  console.log("ok", nome);
}
process.exit(0);
