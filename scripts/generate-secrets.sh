#!/usr/bin/env bash
# Generate production secrets for Falcon
# Outputs a .env file with random passwords
# Usage: bash scripts/generate-secrets.sh > .env.production

set -e

echo "# Falcon Production Secrets"
echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "# Store this file securely, never commit it."
echo ""

DB_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-24)
RABBIT_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-24)
MINIO_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-24)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | cut -c1-48)
INTERNAL_KEY=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

echo "# Database"
echo "DATABASE_URL=postgresql://falcon:${DB_PASS}@<db-host>:5432/falcon"
echo "FALCON_DB_PASSWORD=${DB_PASS}"
echo ""

echo "# RabbitMQ"
echo "RABBITMQ_URL=amqp://falcon:${RABBIT_PASS}@<rabbit-host>:5672"
echo "FALCON_RABBITMQ_PASSWORD=${RABBIT_PASS}"
echo ""

echo "# MinIO / S3"
echo "S3_ACCESS_KEY=falcon"
echo "S3_SECRET_KEY=${MINIO_PASS}"
echo "FALCON_MINIO_PASSWORD=${MINIO_PASS}"
echo ""

echo "# JWT"
echo "JWT_SECRET=${JWT_SECRET}"
echo ""

echo "# Internal auth"
echo "INTERNAL_API_KEY=${INTERNAL_KEY}"
echo ""

echo "# Grafana"
echo "FALCON_GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | cut -c1-16)"
