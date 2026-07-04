FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared ./services/shared
COPY services/api-gateway ./services/api-gateway
RUN npm install --workspace=@falcon/api-gateway
RUN npm run build -w @falcon/shared
RUN npm run build -w @falcon/api-gateway

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
