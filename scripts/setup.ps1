Write-Host "Setting up Falcon..." -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is required. Please install Docker first." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js 20+ is required. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting infrastructure (PostgreSQL, Redis, RabbitMQ, MinIO)..."
docker compose up -d

Write-Host "Waiting for services to be healthy..."
Start-Sleep -Seconds 10

Write-Host "Installing dependencies..."
npm install

Write-Host "Running database migrations..."
npm run db:migrate

Write-Host ""
Write-Host "Falcon is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "  Start backend:  npm run dev"
Write-Host "  Start frontend: npm run dev:frontend"
Write-Host ""
Write-Host "  Frontend:       http://localhost:5173"
Write-Host "  API Gateway:    http://localhost:3000"
Write-Host "  RabbitMQ UI:    http://localhost:15672 (falcon / falcon_secret)"
Write-Host "  MinIO Console:  http://localhost:9001 (falcon / falcon_secret)"
