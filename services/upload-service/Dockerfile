FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared ./services/shared
COPY services/upload-service ./services/upload-service
RUN npm install --workspace=@falcon/upload-service
RUN npm run build -w @falcon/shared
RUN npm run build -w @falcon/upload-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/upload-service/dist ./dist
COPY --from=builder /app/services/upload-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3011
CMD ["node", "dist/index.js"]
