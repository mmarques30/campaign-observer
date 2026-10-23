# Build a partir da RAIZ do repositório:  docker build -f render-worker/Dockerfile -t vedit-worker .
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev libxfixes3 \
    libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 ca-certificates \
    ffmpeg fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
# yt-dlp: baixa o vídeo de referência pelo link (Instagram, TikTok, YouTube) quando a API oficial não libera.
ADD https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux /usr/local/bin/yt-dlp
RUN chmod +x /usr/local/bin/yt-dlp
WORKDIR /app
# Dependências na raiz (/app/node_modules) para que src/video ache remotion/zod subindo diretórios.
COPY render-worker/package.json ./package.json
RUN npm install --omit=dev && node -e "import('@remotion/renderer').then(m=>m.ensureBrowser())"
COPY src/video ./src/video
COPY public/vedit ./public/vedit
COPY render-worker/worker.ts ./render-worker/worker.ts
# Modelo RNNoise (voz limpa). BSD, de github.com/GregorR/rnnoise-models (beguiling-drafter).
COPY render-worker/modelos ./render-worker/modelos
CMD ["npx", "tsx", "render-worker/worker.ts"]
