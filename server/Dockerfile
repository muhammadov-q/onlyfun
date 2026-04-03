FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY server/index.ts ./server/index.ts
EXPOSE 1999
CMD ["npx", "tsx", "server/index.ts"]
