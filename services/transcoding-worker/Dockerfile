FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared ./services/shared
COPY services/transcoding-worker ./services/transcoding-worker
RUN npm install --workspace=@falcon/transcoding-worker
RUN npm run build -w @falcon/shared
RUN npm run build -w @falcon/transcoding-worker

FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared ./services/shared
COPY --from=builder /app/services/transcoding-worker/dist ./services/transcoding-worker/dist
COPY --from=builder /app/services/transcoding-worker/package.json ./services/transcoding-worker/package.json
WORKDIR /app/services/transcoding-worker
EXPOSE 3005
CMD ["node", "dist/index.js"]
