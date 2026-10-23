// Comandos de foto (inspirados nos "/comandos" de edição com ChatGPT que viralizaram).
// Cada um vira um trecho do prompt em inglês; dá para combinar vários e somar um pedido livre.
export type Comando = {
  id: string;
  nome: string;
  dica: string;
  prompt: string;
  grupo: "ajuste" | "cena" | "estilo";
};

export const MANTER_ROSTO =
  "/identitylock: Keep the person's face, facial features, identity, skin tone, hairstyle, body shape and expression exactly the same as in the reference photo. Do not beautify, reshape or age the face.";

export const COMANDOS: Comando[] = [
  {
    id: "upscale",
    nome: "/upscale",
    grupo: "ajuste",
    dica: "Melhora resolução, nitidez e detalhes sem mudar nada",
    prompt:
      "/upscale: Improve resolution, sharpness and fine detail (skin texture, hair, fabric). Change nothing else in the composition.",
  },
  {
    id: "cleanup",
    nome: "/cleanup",
    grupo: "ajuste",
    dica: "Tira objetos, pessoas e bagunça do fundo",
    prompt:
      "/cleanup: Remove unwanted objects, people, clutter and distractions from the background, filling naturally. Keep the main person untouched.",
  },
  {
    id: "luz",
    nome: "/relight",
    grupo: "ajuste",
    dica: "Luz de estúdio suave no rosto",
    prompt:
      "/relight: Relight the person with soft, flattering key light from 45 degrees, gentle fill and subtle rim light; balanced exposure and natural skin tones.",
  },
  {
    id: "estudio",
    nome: "/studioquality",
    grupo: "estilo",
    dica: "Retrato profissional de estúdio",
    prompt:
      "/studioquality: Professional studio portrait, seamless neutral backdrop, softbox lighting, 85mm lens, crisp focus on the eyes, high-end retouching that keeps natural skin texture.",
  },
  {
    id: "closeup",
    nome: "/ultracloseup",
    grupo: "estilo",
    dica: "Close bem fechado no rosto",
    prompt:
      "/ultracloseup: Ultra close-up portrait framing the face tightly, 100mm macro look, eyes tack sharp, cinematic shallow depth of field.",
  },
  {
    id: "bokeh",
    nome: "/bokeh",
    grupo: "estilo",
    dica: "Fundo desfocado cremoso",
    prompt:
      "/bokeh: Shallow depth of field at f/1.4, creamy bokeh background with soft light orbs, subject perfectly sharp.",
  },
  {
    id: "editorial",
    nome: "/editorial",
    grupo: "estilo",
    dica: "Cara de capa de revista",
    prompt:
      "/editorial: Magazine editorial look, confident pose, refined color grading, premium fashion photography lighting.",
  },
  {
    id: "cinema",
    nome: "/cinematic",
    grupo: "estilo",
    dica: "Luz e cor de cinema",
    prompt:
      "/cinematic: Cinematic film still, moody contrast, teal and warm color grading, anamorphic lens feel, subtle film grain.",
  },
  {
    id: "pb",
    nome: "/blackwhite",
    grupo: "estilo",
    dica: "Preto e branco de alto contraste",
    prompt:
      "/blackwhite: High-contrast black and white portrait, deep blacks, luminous highlights, fine art photography.",
  },
  {
    id: "palestra",
    nome: "/palco",
    grupo: "cena",
    dica: "Palestrando num evento de tecnologia",
    prompt:
      "/stage: The person is speaking on stage at a large technology conference, holding a microphone, big LED screen behind, dramatic stage lighting, audience silhouettes in the foreground.",
  },
  {
    id: "escritorio",
    nome: "/escritorio",
    grupo: "cena",
    dica: "Escritório moderno com notebook",
    prompt:
      "/office: The person in a modern bright office, working on a laptop, plants and glass walls, natural window light, candid professional moment.",
  },
  {
    id: "podcast",
    nome: "/podcast",
    grupo: "cena",
    dica: "Estúdio de podcast com microfone",
    prompt:
      "/podcast: The person in a professional podcast studio, talking into a broadcast microphone, headphones, warm practical lights and acoustic panels behind.",
  },
  {
    id: "celular",
    nome: "/celular",
    grupo: "cena",
    dica: "Segurando o celular mostrando a tela",
    prompt:
      "/phone: The person holding a smartphone towards the camera showing the screen, natural smile, clean background.",
  },
  {
    id: "apontando",
    nome: "/apontando",
    grupo: "cena",
    dica: "Apontando para o lado (espaço para texto)",
    prompt:
      "/pointing: The person pointing to the side with an excited expression, leaving clean negative space on that side for text.",
  },
  {
    id: "fundo-liso",
    nome: "/fundoliso",
    grupo: "cena",
    dica: "Fundo liso na cor da marca",
    prompt:
      "/solidbg: Place the person on a clean solid background in deep purple (#6C2BD9) with soft shadow, as a cut-out style studio shot.",
  },
  {
    id: "pose",
    nome: "/poseonly",
    grupo: "cena",
    dica: "Muda só a pose (descreva qual)",
    prompt:
      "/poseonly: Change only the pose as described below; keep the same outfit, background, light and framing.",
  },
];

export function montarPrompt(ids: string[], livre: string, manterRosto: boolean) {
  const partes = [
    manterRosto ? MANTER_ROSTO : "",
    ...COMANDOS.filter((c) => ids.includes(c.id)).map((c) => c.prompt),
    livre.trim() ? `Request: ${livre.trim()}` : "",
    "Photorealistic, natural, no text or watermarks in the image.",
  ];
  return partes.filter(Boolean).join("\n");
}
