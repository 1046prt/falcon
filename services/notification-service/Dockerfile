FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared ./services/shared
COPY services/notification-service ./services/notification-service
RUN npm install --workspace=@falcon/notification-service
RUN npm run build -w @falcon/shared
RUN npm run build -w @falcon/notification-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/notification-service/dist ./dist
COPY --from=builder /app/services/notification-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3004
CMD ["node", "dist/index.js"]
