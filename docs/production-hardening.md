# Production hardening checklist

## Secrets & Auth
- [ ] Move DB/S3/RabbitMQ credentials to a secrets manager (Vault, AWS Secrets Manager, Azure Key Vault, or GCP Secret Manager)
- [ ] Replace `change-me-in-production` JWT secret with a strong generated value
- [ ] Replace `falcon-internal-key` with a unique strong value
- [ ] Set `INTERNAL_API_KEY` as a Kubernetes Secret and mount as env var
- [ ] Generate production secrets: `bash scripts/generate-secrets.sh > .env.production`
- [ ] Never use `falcon_dev` passwords outside of local dev — this value is in public docs
- [ ] Remove `mc anonymous set download` from docker-compose — processed bucket is now private
- [ ] Enable TLS termination at ingress/load balancer; encrypt internal traffic across networks
- [ ] Set `JWT_EXPIRES_IN` to a reasonable value (e.g., `1d` or `24h` instead of `7d`)

## CDN & Delivery
- [ ] Set up CloudFront or Cloudflare CDN in front of the S3 processed bucket
- [ ] Configure Origin Access Identity (OAI) or Origin Access Control (OAC) so S3 only accepts requests from CloudFront
- [ ] Set `CDN_URL` to the CloudFront distribution domain (e.g., `https://d123.cloudfront.net`)
- [ ] Remove `mc anonymous set download` from bucket init — bucket should be private
- [ ] For private content, enable `CDN_SIGNED_URL_ENABLED=true` and configure CloudFront signed URLs or signed cookies
- [ ] Set `CDN_KEY_PAIR_ID` and `CDN_PRIVATE_KEY_PATH` for CloudFront signed URL generation
- [ ] For S3-only setups without CloudFront, use presigned URLs by setting `CDN_SIGNED_URL_ENABLED=true` with no `CDN_URL`

## Pipeline Reliability
- [ ] Dead-letter queues are configured — monitor `*.dlq` queues for stuck messages
- [ ] Set `RABBITMQ_MAX_RETRIES` appropriately (default: 3)
- [ ] Set `RABBITMQ_RETRY_DELAY_MS` for retry backoff (default: 30000ms)
- [ ] Set `JOB_TIMEOUT_MS` per workload size (default: 300000ms / 5 minutes)
- [ ] Monitor DLQ queue depth in Prometheus/Grafana

## Data Durability
- [ ] Configure S3 lifecycle policies to expire incomplete multipart uploads after 24h
- [ ] Configure S3 lifecycle to transition raw uploads to Glacier/Deep Archive after 30 days
- [ ] Enable Postgres point-in-time recovery (PITR) and automated backups
- [ ] Set up RabbitMQ queue mirroring / quorum queues for HA
- [ ] Set up Redis replication or cluster mode

## Observability
- [ ] Add `prom-client` metrics endpoints to each service (not just `/health`)
- [ ] Create Grafana dashboards for queue depth, worker error rate, transcode duration
- [ ] Add Prometheus alerting rules for: queue depth > threshold, job stuck > X minutes, worker error rate spike
- [ ] Add structured logging with correlation IDs per video across all services
- [ ] Add OpenTelemetry/Jaeger for distributed tracing

## CI/CD & Deployment
- [ ] CI runs lint + typecheck + unit tests + build on every push
- [ ] Integration tests run on push to main
- [ ] Blue-green or rolling deployments for zero-downtime updates
- [ ] Health checks and readiness probes configured in Kubernetes
- [ ] Horizontal Pod Autoscaler configured for workers based on queue depth

## Testing
- [ ] Unit tests per service (especially FFmpeg command construction)
- [ ] Integration tests for queue handoffs between services
- [ ] Load test the upload → transcode → HLS path end-to-end

## CloudFront CDN Setup (AWS)

```bash
# 1. Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name <s3-bucket>.s3.<region>.amazonaws.com \
  --default-root-object /index.html \
  --enabled

# 2. Create Origin Access Control (OAC)
#    This restricts S3 to only accept requests from CloudFront

# 3. Update S3 bucket policy to allow CloudFront access
aws s3api put-bucket-policy \
  --bucket processed-videos \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::processed-videos/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<account-id>:distribution/<dist-id>"
        }
      }
    }]
  }'

# 4. Set CDN_URL in your environment / K8s Secret
#    CDN_URL=https://d123.cloudfront.net

# 5. (Optional) Set up signed URLs
#    - Create CloudFront key pair in AWS IAM
#    - Set CDN_KEY_PAIR_ID and CDN_PRIVATE_KEY_PATH
#    - Set CDN_SIGNED_URL_ENABLED=true
```

## Environment variables reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://falcon:falcon_dev@localhost:5432/falcon` | Postgres connection string |
| `RABBITMQ_URL` | `amqp://falcon:falcon_dev@localhost:5672` | RabbitMQ connection string |
| `S3_ACCESS_KEY` | `falcon` | MinIO/S3 access key |
| `S3_SECRET_KEY` | `falcon_dev` | MinIO/S3 secret key |
| `FALCON_DB_PASSWORD` | `falcon_dev` | Postgres password (for docker-compose) |
| `FALCON_RABBITMQ_PASSWORD` | `falcon_dev` | RabbitMQ password (for docker-compose) |
| `FALCON_MINIO_PASSWORD` | `falcon_dev` | MinIO root password (for docker-compose) |
| `FALCON_GRAFANA_PASSWORD` | `falcon_dev` | Grafana admin password (for docker-compose) |
| `CDN_URL` | `S3_PUBLIC_ENDPOINT` or S3 endpoint | CDN base URL for HLS content |
| `CDN_SIGNED_URL_ENABLED` | `false` | Enable presigned/signed URLs |
| `CDN_SIGNED_URL_TTL_MS` | `3600000` | Signed URL TTL (1 hour) |
| `CDN_KEY_PAIR_ID` | — | CloudFront key pair ID |
| `CDN_PRIVATE_KEY_PATH` | — | Path to CloudFront private key |
| `RABBITMQ_MAX_RETRIES` | `3` | Max retries before DLQ |
| `RABBITMQ_RETRY_DELAY_MS` | `30000` | Delay between retries (ms) |
| `JOB_TIMEOUT_MS` | `300000` | FFmpeg job timeout (ms) |
| `INTERNAL_API_KEY` | `falcon-internal-key` | Service-to-service auth key |
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | JWT expiration duration |
