// Acha onde está o rosto no vídeo (amostra alguns quadros) para os grafismos não cobrirem a pessoa.
const MODELO =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";

export type Rosto = { x: number; y: number; w: number; h: number };

export async function detectarRosto(url: string, duracao: number): Promise<Rosto | null> {
  const mp = await import("@mediapipe/tasks-vision");
  const vision = await mp.FilesetResolver.forVisionTasks(WASM);
  const det = await mp.FaceDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODELO, delegate: "CPU" },
    runningMode: "IMAGE",
    minDetectionConfidence: 0.5,
  });
  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise<void>((ok, erro) => {
      v.onloadeddata = () => ok();
      v.onerror = () => erro(new Error("não abriu o vídeo"));
      setTimeout(() => erro(new Error("tempo esgotado")), 20000);
    });
    const W = v.videoWidth,
      H = v.videoHeight;
    const c = document.createElement("canvas");
    const k = Math.min(1, 640 / Math.max(W, H));
    c.width = Math.round(W * k);
    c.height = Math.round(H * k);
    const ctx = c.getContext("2d")!;
    const caixas: Rosto[] = [];
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const t = (Math.max(1, duracao || v.duration || 10) * i) / (n + 1);
      await new Promise<void>((ok) => {
        const to = setTimeout(ok, 4000);
        v.onseeked = () => {
          clearTimeout(to);
          ok();
        };
        v.currentTime = t;
      });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const r = det.detect(c);
      const b = r.detections
        .map((d) => d.boundingBox)
        .filter(Boolean)
        .sort((a, b) => b!.width * b!.height - a!.width * a!.height)[0];
      if (b)
        caixas.push({
          x: b.originX / c.width,
          y: b.originY / c.height,
          w: b.width / c.width,
          h: b.height / c.height,
        });
    }
    if (!caixas.length) return null;
    // Mediana de cada lado e uma folga (cabelo, queixo, gestos perto do rosto).
    const med = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const x = med(caixas.map((b) => b.x)),
      y = med(caixas.map((b) => b.y)),
      w = med(caixas.map((b) => b.w)),
      h = med(caixas.map((b) => b.h));
    const fx = w * 0.25,
      fy = h * 0.45;
    const r4 = (n: number) => Math.round(n * 1000) / 1000;
    return {
      x: r4(Math.max(0, x - fx)),
      y: r4(Math.max(0, y - fy)),
      w: r4(Math.min(1, w + fx * 2)),
      h: r4(Math.min(1, h + fy * 2)),
    };
  } finally {
    det.close();
    v.removeAttribute("src");
    v.load();
  }
}
