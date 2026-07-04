FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared ./services/shared
COPY services/hls-service ./services/hls-service
RUN npm install --workspace=@falcon/hls-service
RUN npm run build -w @falcon/shared
RUN npm run build -w @falcon/hls-service

FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared ./services/shared
COPY --from=builder /app/services/hls-service/dist ./services/hls-service/dist
COPY --from=builder /app/services/hls-service/package.json ./services/hls-service/package.json
WORKDIR /app/services/hls-service
EXPOSE 3003
CMD ["node", "dist/index.js"]
