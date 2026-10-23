// Comandos de foto no estilo dos "/comandos" de edição com ChatGPT que viralizaram
// (vídeos de referência: /pov /wide /motionblur, /ultracloseup /bokeh, /lowangle /35mm /moody,
// /walkingcandidpose, /clones, /redflash /coldambient /hardflash, /fog, /droneview,
// /identitylock, /poseonly, /studioquality, /upscale, /cleanup).
// Cada um vira um trecho do prompt em inglês; dá para combinar vários e somar um pedido livre.
export type Grupo = "ajuste" | "camera" | "luz" | "estilo" | "pose" | "cena";
export type Comando = {
  id: string;
  nome: string;
  dica: string;
  prompt: string;
  grupo: Grupo;
};

export const GRUPOS: { id: Grupo; nome: string }[] = [
  { id: "ajuste", nome: "Ajustes" },
  { id: "camera", nome: "Câmera, ângulo e lente" },
  { id: "luz", nome: "Luz e clima" },
  { id: "estilo", nome: "Estilo da foto" },
  { id: "pose", nome: "Pose e movimento" },
  { id: "cena", nome: "Cenário" },
];

export const MANTER_ROSTO =
  "/identitylock: Keep the person's face, facial features, identity, skin tone, hairstyle, body shape and expression exactly the same as in the reference photo. Do not beautify, reshape or age the face.";

const c = (grupo: Grupo, nome: string, dica: string, prompt: string): Comando => ({
  id: nome.replace(/^\//, ""),
  nome,
  dica,
  prompt: `${nome}: ${prompt}`,
  grupo,
});

export const COMANDOS: Comando[] = [
  // Ajustes (mantêm a foto, só melhoram)
  c(
    "ajuste",
    "/upscale",
    "Melhora resolução, nitidez e detalhes sem mudar nada",
    "Improve resolution, sharpness and fine detail (skin texture, hair, fabric). Change nothing else in the composition.",
  ),
  c(
    "ajuste",
    "/cleanup",
    "Tira objetos, pessoas e bagunça do fundo",
    "Remove unwanted objects, people, clutter and distractions from the background, filling naturally. Keep the main person untouched.",
  ),
  c(
    "ajuste",
    "/relight",
    "Luz de estúdio suave no rosto",
    "Relight the person with soft, flattering key light from 45 degrees, gentle fill and subtle rim light; balanced exposure and natural skin tones.",
  ),
  c(
    "ajuste",
    "/colorgrade",
    "Corrige cor e contraste com cara de foto profissional",
    "Professional color grading: balanced white point, rich but natural colors, gentle contrast curve, clean highlights.",
  ),
  c(
    "ajuste",
    "/expand",
    "Aumenta a cena em volta (mais espaço para texto)",
    "Outpaint and extend the scene around the person naturally, leaving more empty space around them, consistent perspective and light.",
  ),
  c(
    "ajuste",
    "/outfitswap",
    "Troca só a roupa (descreva qual)",
    "Change only the outfit as described in the request; keep face, pose, background and light identical.",
  ),

  // Câmera, ângulo e lente
  c(
    "camera",
    "/pov",
    "Ponto de vista em primeira pessoa",
    "First-person point-of-view shot, as if seen from the photographer's own eyes, hands or arm partially in frame.",
  ),
  c(
    "camera",
    "/wide",
    "Plano aberto, mostra o ambiente",
    "Wide shot with the full environment visible, person smaller in the frame, strong sense of place.",
  ),
  c(
    "camera",
    "/ultracloseup",
    "Close bem fechado no rosto",
    "Ultra close-up portrait framing the face tightly, 100mm macro look, eyes tack sharp, cinematic shallow depth of field.",
  ),
  c(
    "camera",
    "/closeup",
    "Close de rosto e ombros",
    "Close-up portrait from the shoulders up, 85mm lens, eyes in sharp focus.",
  ),
  c(
    "camera",
    "/fullbody",
    "Corpo inteiro",
    "Full-body shot, head to toe in frame, natural proportions, 35mm lens.",
  ),
  c(
    "camera",
    "/lowangle",
    "Câmera baixa, olhando de baixo (poder)",
    "Low-angle shot from below looking up at the person, making them look confident and powerful.",
  ),
  c(
    "camera",
    "/highangle",
    "Câmera alta, olhando de cima",
    "High-angle shot from above looking down at the person.",
  ),
  c(
    "camera",
    "/droneview",
    "Vista de drone, de cima",
    "Aerial drone view from high above, top-down perspective, person small in a large landscape.",
  ),
  c(
    "camera",
    "/dutchangle",
    "Câmera inclinada, dinâmica",
    "Dutch angle with the camera tilted about 15 degrees for a dynamic, energetic feel.",
  ),
  c(
    "camera",
    "/overshoulder",
    "Por cima do ombro",
    "Over-the-shoulder shot from behind, showing what the person sees.",
  ),
  c(
    "camera",
    "/mirror",
    "Selfie no espelho",
    "Mirror selfie composition, phone visible, natural reflection.",
  ),
  c(
    "camera",
    "/35mm",
    "Lente 35mm, cara de foto de rua",
    "Shot on a 35mm lens, natural documentary perspective, slight film character.",
  ),
  c(
    "camera",
    "/85mm",
    "Lente 85mm, retrato clássico",
    "Shot on an 85mm portrait lens, flattering compression, creamy background.",
  ),
  c(
    "camera",
    "/fisheye",
    "Olho de peixe",
    "Fisheye lens distortion, close to the camera, playful skate-video look.",
  ),

  // Luz e clima
  c(
    "luz",
    "/moody",
    "Escuro e dramático",
    "Moody low-key lighting, deep shadows, muted colors, cinematic atmosphere.",
  ),
  c(
    "luz",
    "/goldenhour",
    "Luz dourada de fim de tarde",
    "Golden hour sunlight, warm low sun, long soft shadows, glowing rim light on hair.",
  ),
  c(
    "luz",
    "/bluehour",
    "Luz azul do anoitecer",
    "Blue hour just after sunset, cool ambient light mixed with warm city lights.",
  ),
  c(
    "luz",
    "/hardflash",
    "Flash direto, estilo paparazzi",
    "Direct on-camera hard flash, crisp shadows behind the subject, glossy editorial paparazzi look.",
  ),
  c(
    "luz",
    "/redflash",
    "Flash com luz vermelha",
    "Red-gelled flash light washing the scene in deep red tones.",
  ),
  c(
    "luz",
    "/coldambient",
    "Ambiente frio, tons azulados",
    "Cold ambient light, bluish-teal tones, cool night atmosphere.",
  ),
  c(
    "luz",
    "/neon",
    "Luzes de neon",
    "Neon lights in pink and blue reflecting on the face and surroundings, night city vibe.",
  ),
  c(
    "luz",
    "/backlight",
    "Contraluz",
    "Strong backlight behind the person creating a glowing outline and soft lens flare.",
  ),
  c(
    "luz",
    "/softbox",
    "Luz suave de estúdio",
    "Large softbox key light, soft even illumination, clean professional look.",
  ),
  c(
    "luz",
    "/fog",
    "Neblina e névoa",
    "Atmospheric fog and haze in the scene, light rays cutting through the mist, dreamy mood.",
  ),
  c(
    "luz",
    "/rain",
    "Chuva",
    "Rainy scene, wet surfaces with reflections, raindrops visible in the light.",
  ),

  // Estilo
  c(
    "estilo",
    "/studioquality",
    "Retrato profissional de estúdio",
    "Professional studio portrait, seamless neutral backdrop, softbox lighting, 85mm lens, crisp focus on the eyes, high-end retouching that keeps natural skin texture.",
  ),
  c(
    "estilo",
    "/bokeh",
    "Fundo desfocado cremoso",
    "Shallow depth of field at f/1.4, creamy bokeh background with soft light orbs, subject perfectly sharp.",
  ),
  c(
    "estilo",
    "/editorial",
    "Cara de capa de revista",
    "Magazine editorial look, confident pose, refined color grading, premium fashion photography lighting.",
  ),
  c(
    "estilo",
    "/cinematic",
    "Luz e cor de cinema",
    "Cinematic film still, moody contrast, teal and warm color grading, anamorphic lens feel, subtle film grain.",
  ),
  c(
    "estilo",
    "/blackwhite",
    "Preto e branco de alto contraste",
    "High-contrast black and white portrait, deep blacks, luminous highlights, fine art photography.",
  ),
  c(
    "estilo",
    "/film",
    "Filme analógico",
    "Analog 35mm film photo look, natural grain, slightly faded colors, Kodak Portra palette.",
  ),
  c(
    "estilo",
    "/vintage",
    "Foto antiga, anos 90",
    "Vintage 1990s photo look, warm faded tones, soft focus, date-stamp-free.",
  ),
  c(
    "estilo",
    "/linkedin",
    "Foto profissional para perfil",
    "Polished corporate headshot for a professional profile, clean background, friendly confident expression, business attire.",
  ),
  c(
    "estilo",
    "/candid",
    "Foto espontânea, sem pose",
    "Candid, unposed moment captured naturally, authentic expression, documentary style.",
  ),
  c(
    "estilo",
    "/motionblur",
    "Borrão de movimento",
    "Motion blur in the background or surroundings conveying speed, subject relatively sharp.",
  ),
  c(
    "estilo",
    "/clones",
    "A mesma pessoa repetida na cena",
    "The same person appears multiple times in the same scene (clones) in different natural poses, consistent light.",
  ),

  // Pose e movimento
  c(
    "pose",
    "/poseonly",
    "Muda só a pose (descreva qual)",
    "Change only the pose as described in the request; keep the same outfit, background, light and framing.",
  ),
  c(
    "pose",
    "/walkingcandidpose",
    "Andando, foto espontânea",
    "The person walking naturally toward or past the camera, candid mid-step pose, relaxed arms.",
  ),
  c(
    "pose",
    "/apontando",
    "Apontando para o lado (espaço para texto)",
    "The person pointing to the side with an excited expression, leaving clean negative space on that side for text.",
  ),
  c(
    "pose",
    "/bracoscruzados",
    "Braços cruzados, confiante",
    "The person standing with arms crossed, confident smile, facing the camera.",
  ),
  c(
    "pose",
    "/pensando",
    "Pensativa, mão no queixo",
    "The person in a thoughtful pose with hand on chin, looking slightly away from the camera.",
  ),
  c(
    "pose",
    "/rindo",
    "Rindo de verdade",
    "The person laughing genuinely, natural joyful expression.",
  ),
  c(
    "pose",
    "/sentada",
    "Sentada, relaxada",
    "The person sitting relaxed on a chair or step, natural posture.",
  ),
  c(
    "pose",
    "/celular",
    "Segurando o celular mostrando a tela",
    "The person holding a smartphone towards the camera showing the screen, natural smile.",
  ),

  // Cenário
  c(
    "cena",
    "/palco",
    "Palestrando num evento de tecnologia",
    "The person speaking on stage at a large technology conference, holding a microphone, big LED screen behind, dramatic stage lighting, audience silhouettes in the foreground.",
  ),
  c(
    "cena",
    "/escritorio",
    "Escritório moderno com notebook",
    "The person in a modern bright office, working on a laptop, plants and glass walls, natural window light, candid professional moment.",
  ),
  c(
    "cena",
    "/podcast",
    "Estúdio de podcast com microfone",
    "The person in a professional podcast studio, talking into a broadcast microphone, headphones, warm practical lights and acoustic panels behind.",
  ),
  c(
    "cena",
    "/reuniao",
    "Em reunião com cliente",
    "The person leading a meeting in a modern conference room, presenting to a small team, screen with charts behind.",
  ),
  c(
    "cena",
    "/cafe",
    "Num café, trabalhando",
    "The person in a cozy coffee shop with a laptop and a cup of coffee, warm ambient light.",
  ),
  c(
    "cena",
    "/rua",
    "Na rua, cidade grande",
    "The person on a busy city street, urban background, street photography style.",
  ),
  c(
    "cena",
    "/aeroporto",
    "Em aeroporto/viagem a trabalho",
    "The person in a modern airport terminal with a carry-on bag, business travel vibe.",
  ),
  c(
    "cena",
    "/garagem",
    "Estacionamento urbano, estilo editorial",
    "The person in an urban underground parking garage, concrete pillars and fluorescent lights, editorial street-style look.",
  ),
  c(
    "cena",
    "/natureza",
    "Ao ar livre, natureza",
    "The person outdoors in lush nature, trees and soft sunlight, fresh airy atmosphere.",
  ),
  c(
    "cena",
    "/fundoliso",
    "Fundo liso na cor da marca",
    "Place the person on a clean solid background in deep purple (#6C2BD9) with soft shadow, as a cut-out style studio shot.",
  ),
];

// Comandos que só fazem sentido partindo de uma foto sua (sem foto, a IA inventaria outra pessoa).
const SEM_FOTO_OK = new Set([
  "droneview",
  "fog",
  "rain",
  "neon",
  "moody",
  "goldenhour",
  "bluehour",
]);
export const precisaFoto = (ids: string[]) =>
  ids.some((id) => {
    const g = COMANDOS.find((x) => x.id === id)?.grupo;
    return g && g !== "cena" && !SEM_FOTO_OK.has(id);
  });

export function montarPrompt(ids: string[], livre: string, manterRosto: boolean) {
  const partes = [
    manterRosto ? MANTER_ROSTO : "",
    ...COMANDOS.filter((x) => ids.includes(x.id)).map((x) => x.prompt),
    livre.trim() ? `Request: ${livre.trim()}` : "",
    "Photorealistic, natural, no text or watermarks in the image.",
  ];
  return partes.filter(Boolean).join("\n");
}
