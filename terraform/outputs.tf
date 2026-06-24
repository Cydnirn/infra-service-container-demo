# Output values for the student management infrastructure

output "vpc_id" {
  description = "ID of the provisioned VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the isolated database subnets"
  value       = aws_subnet.database[*].id
}

output "ecr_backend_repository_url" {
  description = "URL of the ECR repository for the backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the ECR repository for the frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Endpoint URL of the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64-encoded certificate authority data for the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

# ── Database Outputs ───────────────────────────────────────

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint address"
  value       = aws_db_instance.postgres.address
}

output "rds_proxy_endpoint" {
  description = "RDS Proxy endpoint address"
  value       = aws_db_proxy.postgres.endpoint
}

# output "docdb_endpoint" {
#   description = "DocumentDB cluster endpoint"
#   value       = aws_docdb_cluster.main.endpoint
# }

# output "docdb_reader_endpoint" {
#   description = "DocumentDB cluster reader endpoint"
#   value       = aws_docdb_cluster.main.reader_endpoint
# }

# ── Security Outputs ───────────────────────────────────────

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for note encryption"
  value       = aws_kms_key.notes.arn
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  value       = aws_acm_certificate.main.arn
}

output "db_secret_arn" {
  description = "ARN of the Secrets Manager secret for database credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}
