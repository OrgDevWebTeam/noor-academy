# infra

Infrastructure as code (Terraform/OpenTofu) for AWS-managed services:
ECS/Fargate (web, api, worker), RDS PostgreSQL, private S3, SQS/EventBridge, Secrets Manager/KMS,
CDN/WAF. Reviewed like application code. Populated in a later step.

Environments: local, development, staging, production. Only production holds real family data.
