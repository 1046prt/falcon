FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared ./services/shared
COPY services/metadata-service ./services/metadata-service
RUN npm install --workspace=@falcon/metadata-service
RUN npm run build -w @falcon/shared
RUN npm run build -w @falcon/metadata-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/metadata-service/dist ./dist
COPY --from=builder /app/services/metadata-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/index.js"]
