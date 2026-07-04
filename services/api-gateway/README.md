Service: API Gateway

Purpose: Reverse proxy, routing, CORS, rate limiting.

Configuration:
- `UPLOAD_SERVICE_URL` - internal URL of upload service
- `METADATA_SERVICE_URL` - internal URL of metadata service

Scaling: run multiple replicas behind a load balancer; use readiness probes to avoid serving traffic before warmup.
