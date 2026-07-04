Shared utilities and configuration used by other services.

Important env vars (examples):
- `DATABASE_URL` - Postgres connection string
- `REDIS_URL` - Redis connection URL
- `RABBITMQ_URL` - RabbitMQ connection URL
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` - Object store credentials

For production, do not use hard-coded credentials; use a secrets manager and mount values into pods as env vars.
