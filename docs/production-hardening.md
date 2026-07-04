Production hardening checklist

- Secrets: Do NOT commit or document plaintext secrets. Use environment variables and a secrets manager (Vault, AWS Secrets Manager, Azure Key Vault, or GCP Secret Manager).
- Replace local example credentials with placeholders in `README.md` and per-service docs.
- TLS: Terminate TLS at the ingress or load balancer; ensure internal traffic is encrypted when crossing networks.
- Monitoring: Enable Prometheus metrics and alerting for high error rates, queue backlogs, and worker failures.
- Backups: Regular DB backups and object storage lifecycle policies.
- RBAC and Network Policies: Lock down pod-to-pod communication in k8s and use least privilege for cloud IAM roles.
- Dependency scanning: Enable Dependabot and Snyk (or similar) in CI; fail builds on high/critical findings.

Example: Use environment variables for S3 credentials instead of hard-coded defaults. For Kubernetes, store sensitive values in `Secret` and mount as env vars.
