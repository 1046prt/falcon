# Falcon Architecture

## Overview

Falcon is a distributed video transcoding pipeline designed for high throughput and fault tolerance. The system handles large video uploads, asynchronous processing, multi-resolution transcoding, and HLS adaptive streaming delivery.

## Microservices

| Service | Port | Responsibility |
|---------|------|----------------|
| API Gateway | 3000 | Request routing, rate limiting, auth |
| Upload Service | 3001 | Chunked uploads, S3 storage, job creation |
| Metadata Service | 3002 | PostgreSQL CRUD for users, videos, jobs |
| HLS Service | 3003 | HLS playlist and segment generation |
| Notification Service | 3004 | Real-time progress via Redis |
| Transcoding Worker | 3005 | FFmpeg resolution processing |

## Data Flow

1. **Upload**: Frontend splits video into 5MB chunks → Upload Service → MinIO/S3
2. **Queue**: Upload complete → 3 transcoding jobs published to RabbitMQ
3. **Transcode**: Workers consume jobs → FFmpeg → 1080p/720p/480p outputs
4. **HLS**: All resolutions complete → HLS Service generates `.m3u8` + `.ts` segments
5. **Deliver**: Processed files served via CDN (CloudFront in production)

## Infrastructure

- **PostgreSQL**: Persistent metadata (users, videos, jobs)
- **Redis**: Ephemeral processing progress (TTL 24h)
- **RabbitMQ**: Durable job queues with retry via nack+requeue
- **MinIO/S3**: Object storage for raw and processed videos

## Scaling Strategy

Workers scale horizontally via Kubernetes HPA based on RabbitMQ queue depth:

- 10 jobs → 2 workers
- 100 jobs → 10 workers
- 1000 jobs → 50 workers

## Security

- JWT authentication (metadata service)
- bcrypt password hashing
- Rate limiting at API gateway
- Signed URLs for private content (production)
