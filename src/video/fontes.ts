// Fontes embutidas (public/vedit/fontes, licença SIL OFL). Não dependem do Google
// Fonts na hora do render: sem rede, sem oscilação, mesmo resultado no preview e no MP4.
import { continueRender, delayRender, staticFile } from "remotion";

const ARQUIVOS: [familia: string, estilo: "normal" | "italic", peso: string, arquivo: string][] = [
  ["Anton", "normal", "400", "Anton-normal-400"],
  ["Archivo Black", "normal", "400", "ArchivoBlack-normal-400"],
  ["Bricolage Grotesque", "normal", "600", "BricolageGrotesque-normal-600"],
  ["Bricolage Grotesque", "normal", "800", "BricolageGrotesque-normal-800"],
  ["Caveat", "normal", "700", "Caveat-normal-700"],
  ["DM Mono", "normal", "400", "DMMono-normal-400"],
  ["DM Mono", "normal", "500", "DMMono-normal-500"],
  ["Fraunces", "italic", "600", "Fraunces-italic-600"],
  ["Instrument Serif", "italic", "400", "InstrumentSerif-italic-400"],
  ["Instrument Serif", "normal", "400", "InstrumentSerif-normal-400"],
  ["Inter", "normal", "400", "Inter-normal-400"],
  ["Inter", "normal", "600", "Inter-normal-600"],
  ["Inter", "normal", "800", "Inter-normal-800"],
  ["Inter", "normal", "900", "Inter-normal-900"],
  ["Montserrat", "normal", "800", "Montserrat-normal-800"],
  ["Montserrat", "normal", "900", "Montserrat-normal-900"],
  ["Playfair Display", "italic", "700", "PlayfairDisplay-italic-700"],
  ["Space Grotesk", "normal", "500", "SpaceGrotesk-normal-500"],
  ["Space Grotesk", "normal", "700", "SpaceGrotesk-normal-700"],
  ["Sora", "normal", "600", "Sora-normal-600"],
  ["Sora", "normal", "800", "Sora-normal-800"],
  ["Manrope", "normal", "500", "Manrope-normal-500"],
  ["Manrope", "normal", "800", "Manrope-normal-800"],
  ["Poppins", "normal", "500", "Poppins-normal-500"],
  ["Poppins", "normal", "700", "Poppins-normal-700"],
  ["Poppins", "normal", "900", "Poppins-normal-900"],
  ["Syne", "normal", "700", "Syne-normal-700"],
  ["Syne", "normal", "800", "Syne-normal-800"],
  ["Outfit", "normal", "500", "Outfit-normal-500"],
  ["Outfit", "normal", "800", "Outfit-normal-800"],
  ["Plus Jakarta Sans", "normal", "500", "PlusJakartaSans-normal-500"],
  ["Plus Jakarta Sans", "normal", "800", "PlusJakartaSans-normal-800"],
  ["Bebas Neue", "normal", "400", "BebasNeue-normal-400"],
  ["Unbounded", "normal", "600", "Unbounded-normal-600"],
  ["Unbounded", "normal", "900", "Unbounded-normal-900"],
  ["Oswald", "normal", "600", "Oswald-normal-600"],
  ["DM Serif Display", "normal", "400", "DMSerifDisplay-normal-400"],
  ["Archivo", "normal", "500", "Archivo-normal-500"],
  ["Archivo", "normal", "900", "Archivo-normal-900"],
];

export const FONTES = [...new Set(ARQUIVOS.map((a) => a[0]))];

let iniciado = false;
export function garantirFontes() {
  if (iniciado || typeof document === "undefined" || typeof FontFace === "undefined") return;
  iniciado = true;
  const h = delayRender("Carregando fontes do editor");
  Promise.all(
    ARQUIVOS.map(async ([familia, estilo, peso, arq]) => {
      const ff = new FontFace(
        familia,
        `url(${staticFile(`vedit/fontes/${arq}.woff2`)}) format("woff2")`,
        { style: estilo, weight: peso, display: "block" },
      );
      await ff.load();
      document.fonts.add(ff);
    }),
  )
    .catch((e) => console.warn("[vedit] fonte falhou", e))
    .finally(() => continueRender(h));
}

export const f = (nome: string, fallback = "sans-serif") => `"${nome}", ${fallback}`;
