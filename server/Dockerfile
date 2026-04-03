FROM node:20-slim
WORKDIR /app
COPY server/index.ts ./server/index.ts
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install tsx
EXPOSE 1999
CMD ["npx", "tsx", "server/index.ts"]
