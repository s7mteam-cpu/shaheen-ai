# Build from the REPO ROOT so the worker can use the same motion-graphics code as the site:
#   docker build -f worker/Dockerfile .
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg fonts-noto-core fonts-kacst \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev libxfixes3 \
      libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY worker/package.json ./package.json
RUN npm install --omit=dev && node -e "import('@remotion/renderer').then((m) => m.ensureBrowser())"
COPY src/remotion ./src/remotion
COPY worker ./worker
CMD ["node", "worker/index.mjs"]
