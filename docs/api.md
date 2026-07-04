# Falcon API Reference

Base URL: `http://localhost:3000/api`

## Upload

### POST /upload/init

Initialize a chunked upload session.

```json
{
  "title": "My Video",
  "description": "Optional description",
  "fileName": "video.mp4",
  "fileSize": 104857600,
  "chunkSize": 5242880,
  "totalChunks": 20
}
```

### POST /upload/chunk

Upload a single chunk (multipart/form-data).

| Field | Type | Description |
|-------|------|-------------|
| sessionId | string | Upload session ID |
| chunkIndex | number | Zero-based chunk index |
| chunk | file | Binary chunk data |

### POST /upload/complete

Finalize upload and queue transcoding jobs.

```json
{ "sessionId": "uuid" }
```

## Videos

### GET /videos

List all videos.

### GET /videos/:id

Get video details with processing progress.

### POST /videos

Create video metadata record.

### PATCH /videos/:id/status

Update video status.

## Notifications

### GET /notifications/progress/:videoId

Get real-time processing progress from Redis.

```json
{
  "videoId": "uuid",
  "1080p": true,
  "720p": true,
  "480p": false,
  "progress": 66,
  "status": "PROCESSING"
}
```

## Auth

### POST /users/register

### POST /users/login

Returns JWT token for authenticated requests.
