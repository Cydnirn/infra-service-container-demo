# VPC Endpoints for AWS services accessed from private subnets

# Secrets Manager VPC Endpoint (for ECS/EKS to retrieve secrets from private subnets)
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "student-management-secretsmanager-vpce"
    Environment = var.environment
  }
}

# KMS VPC Endpoint (for encrypt/decrypt calls from private subnets)
resource "aws_vpc_endpoint" "kms" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.kms"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "student-management-kms-vpce"
    Environment = var.environment
  }
}

# Cognito VPC Endpoint (not strictly needed for token validation
# since JWKS is fetched over the public internet, but included for
# private subnets that need to reach Cognito APIs)
resource "aws_vpc_endpoint" "cognito" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.cognito-idp"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private[0].id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "student-management-cognito-vpce"
    Environment = var.environment
  }
}

resource "aws_security_group" "vpc_endpoints" {
  name        = "student-vpce-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = aws_subnet.private[*].cidr_block
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "student-vpce-sg"
    Environment = var.environment
  }
}
