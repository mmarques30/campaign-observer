// Motor do recorte da pessoa (sem dependências do app; testável isolado).
const MODELO =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";

export function suportaRecorte() {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}

/**
 * Gera o vídeo da pessoa recortada (fundo transparente), no lado curto de 720 px.
 * ~2–4 min para 1 min de vídeo numa máquina comum; a aba precisa ficar aberta.
 */
export async function gerarRecorte(
  file: File,
  opts: { onProgresso?: (p: number, etapa: string) => void; ladoCurto?: number },
): Promise<{ blob: Blob; largura: number; altura: number; fps: number }> {
  const prog = opts.onProgresso ?? (() => {});
  prog(0, "Carregando o modelo de segmentação");
  const [mb, mp] = await Promise.all([import("mediabunny"), import("@mediapipe/tasks-vision")]);
  const vision = await mp.FilesetResolver.forVisionTasks(WASM);
  const seg = await mp.ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODELO, delegate: "GPU" },
    runningMode: "VIDEO",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });

  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const faixa = await input.getPrimaryVideoTrack();
  if (!faixa) throw new Error("vídeo sem faixa de imagem");
  const fps = Math.min(30, Math.round((await faixa.computePacketStats(60)).averagePacketRate || 30));
  const dur = await input.computeDuration();
  const lw = faixa.displayWidth,
    lh = faixa.displayHeight;
  const curto = opts.ladoCurto ?? 720;
  const fator = Math.min(1, curto / Math.min(lw, lh));
  const W = Math.round((lw * fator) / 2) * 2,
    H = Math.round((lh * fator) / 2) * 2;

  const quadro = new OffscreenCanvas(W, H);
  const qctx = quadro.getContext("2d", { willReadFrequently: false })!;
  const mascara = new OffscreenCanvas(W, H);
  const mctx = mascara.getContext("2d")!;
  const saida = new OffscreenCanvas(W, H);
  const sctx = saida.getContext("2d")!;

  const output = new mb.Output({
    format: new mb.WebMOutputFormat(),
    target: new mb.BufferTarget(),
  });
  const fonte = new mb.CanvasSource(saida, {
    codec: "vp9",
    bitrate: new mb.Quality({ bitrate: 3_000_000 }),
    alpha: "keep",
    keyFrameInterval: 2,
  });
  output.addVideoTrack(fonte, { frameRate: fps });
  await output.start();

  const sink = new mb.VideoSampleSink(faixa);
  let idxPessoa = -1;
  let n = 0;
  const passo = 1 / fps;
  let proximo = 0;
  prog(0.02, "Recortando a pessoa");
  for await (const amostra of sink.samples()) {
    try {
      // Mantém o ritmo de `fps` quadros/s (pula quadros extras de 60 fps).
      if (amostra.timestamp + 1e-4 < proximo) continue;
      proximo = amostra.timestamp + passo;
      qctx.drawImage(amostra.toCanvasImageSource() as any, 0, 0, W, H);
      const r = seg.segmentForVideo(quadro as any, Math.round(amostra.timestamp * 1000));
      const masks = r.confidenceMasks ?? [];
      if (!masks.length) throw new Error("segmentação sem máscara");
      if (idxPessoa < 0) {
        // Qual máscara é a pessoa? A que tem mais confiança no centro do quadro.
        let melhor = 0,
          melhorV = -1;
        masks.forEach((m, k) => {
          const a = m.getAsFloat32Array();
          let s = 0,
            c = 0;
          for (let y = Math.floor(m.height * 0.35); y < m.height * 0.75; y += 4)
            for (let x = Math.floor(m.width * 0.35); x < m.width * 0.65; x += 4) {
              s += a[y * m.width + x];
              c++;
            }
          const v = s / Math.max(1, c);
          if (v > melhorV) {
            melhorV = v;
            melhor = k;
          }
        });
        idxPessoa = melhor;
      }
      const m = masks[idxPessoa];
      const a = m.getAsFloat32Array();
      const img = mctx.createImageData(m.width, m.height);
      const d = img.data;
      for (let i = 0, j = 0; i < a.length; i++, j += 4) {
        // Curva suave: tira o halo cinza sem serrilhar.
        const v = a[i];
        const al = v < 0.25 ? 0 : v > 0.75 ? 255 : Math.round(((v - 0.25) / 0.5) * 255);
        d[j] = 255;
        d[j + 1] = 255;
        d[j + 2] = 255;
        d[j + 3] = al;
      }
      mctx.putImageData(img, 0, 0);
      r.close();
      // Saída = quadro com alfa da máscara (borda levemente suavizada).
      sctx.globalCompositeOperation = "source-over";
      sctx.clearRect(0, 0, W, H);
      sctx.drawImage(quadro, 0, 0);
      sctx.globalCompositeOperation = "destination-in";
      sctx.filter = "blur(1px)";
      sctx.drawImage(mascara, 0, 0, m.width, m.height, 0, 0, W, H);
      sctx.filter = "none";
      await fonte.add(amostra.timestamp, passo);
      n++;
      if (n % 10 === 0) prog(0.02 + 0.93 * Math.min(1, amostra.timestamp / dur), "Recortando a pessoa");
    } finally {
      amostra.close();
    }
  }
  prog(0.96, "Fechando o arquivo");
  fonte.close();
  await output.finalize();
  seg.close();
  const buf = output.target.buffer;
  if (!buf) throw new Error("falha ao gravar o recorte");
  prog(1, "Pronto");
  return { blob: new Blob([buf], { type: "video/webm" }), largura: W, altura: H, fps };
}

