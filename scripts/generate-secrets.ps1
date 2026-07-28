# Generate production secrets for Falcon
# Outputs a .env file with random passwords
# Usage: .\scripts\generate-secrets.ps1 > .env.production

Write-Host "# Falcon Production Secrets"
Write-Host "# Generated: $(Get-Date -Format 'o')"
Write-Host "# Store this file securely, never commit it."
Write-Host ""

function New-RandomString($length) {
  $bytes = [byte[]]::new($length)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [System.Convert]::ToBase64String($bytes) -replace '[/+=]', '' -replace '[^a-zA-Z0-9]', '' | ForEach-Object { $_.Substring(0, [Math]::Min($_.Length, $length)) }
}

$dbPass = New-RandomString 24
$rabbitPass = New-RandomString 24
$minioPass = New-RandomString 24
$jwtSecret = New-RandomString 48
$internalKey = New-RandomString 32
$grafanaPass = New-RandomString 16

Write-Host "# Database"
Write-Host "DATABASE_URL=postgresql://falcon:${dbPass}@<db-host>:5432/falcon"
Write-Host "FALCON_DB_PASSWORD=${dbPass}"
Write-Host ""

Write-Host "# RabbitMQ"
Write-Host "RABBITMQ_URL=amqp://falcon:${rabbitPass}@<rabbit-host>:5672"
Write-Host "FALCON_RABBITMQ_PASSWORD=${rabbitPass}"
Write-Host ""

Write-Host "# MinIO / S3"
Write-Host "S3_ACCESS_KEY=falcon"
Write-Host "S3_SECRET_KEY=${minioPass}"
Write-Host "FALCON_MINIO_PASSWORD=${minioPass}"
Write-Host ""

Write-Host "# JWT"
Write-Host "JWT_SECRET=${jwtSecret}"
Write-Host ""

Write-Host "# Internal auth"
Write-Host "INTERNAL_API_KEY=${internalKey}"
Write-Host ""

Write-Host "# Grafana"
Write-Host "FALCON_GRAFANA_PASSWORD=${grafanaPass}"
