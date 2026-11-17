// Uso: npx tsx stills-projeto.ts <props.json> <pasta> <segundos-de-saida,separados>
import path from "node:path";
import fs from "node:fs";
import { renderStill, selectComposition } from "@remotion/renderer";
import { prepararBundle } from "/home/claude/campaign-observer/render-worker/worker";
const [pp, dir, ts] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(pp, "utf8"));
const inputProps = { timeline: props.timeline, palavras: props.palavras, duracaoFonte: props.duracaoFonte, fonteUrl: props.fonteUrl, midias: props.midias };
const serveUrl = await prepararBundle();
const comp = await selectComposition({ serveUrl, id: "Reel", inputProps });
console.log("frames", comp.durationInFrames);
for (const t of ts.split(",").map(Number)) {
  await renderStill({ serveUrl, composition: comp, inputProps, frame: Math.min(comp.durationInFrames - 1, Math.round(t * 30)), output: path.join(dir, `s-${String(t).padStart(5, "0")}.png`), scale: 0.25, timeoutInMilliseconds: 60000 });
}
console.log("ok");
