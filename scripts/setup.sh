#!/usr/bin/env bash
set -euo pipefail

echo "🦅 Setting up Falcon..."

if ! command -v docker &> /dev/null; then
  echo "Docker is required. Please install Docker first."
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "Node.js 20+ is required. Please install Node.js first."
  exit 1
fi

echo "Starting infrastructure (PostgreSQL, Redis, RabbitMQ, MinIO)..."
docker compose up -d

echo "Waiting for services to be healthy..."
sleep 10

echo "Installing dependencies..."
npm install

echo "Running database migrations..."
npm run db:migrate

echo ""
echo "✅ Falcon is ready!"
echo ""
echo "  Start backend:  npm run dev"
echo "  Start frontend: npm run dev:frontend"
echo ""
echo "  Frontend:       http://localhost:5173"
echo "  API Gateway:    http://localhost:3000"
echo "  RabbitMQ UI:    http://localhost:15672 (falcon / falcon_secret)"
echo "  MinIO Console:  http://localhost:9001 (falcon / falcon_secret)"
