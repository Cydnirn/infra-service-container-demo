# EKS cluster and managed node group with IRSA

resource "aws_eks_cluster" "main" {
  name     = "student-management-eks"
  role_arn = var.lab_role_arn
  version  = "1.36"

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_public_access  = true
    endpoint_private_access = true
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  tags = {
    Name        = "student-management-eks"
    Environment = var.environment
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "student-management-node-group"
  node_role_arn   = var.lab_role_arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = ["t3.medium"]

  scaling_config {
    min_size     = 2
    max_size     = 3
    desired_size = 2
  }

  update_config {
    max_unavailable = 1
  }

  tags = {
    Name        = "student-management-node-group"
    Environment = var.environment
  }
}

# ───────────────────────────────────────────────────────────
# IRSA — IAM Role for Service Account
# Allows backend pods to call KMS (encrypt/decrypt) and
# Secrets Manager (get secret value) without static credentials.
# ───────────────────────────────────────────────────────────

data "aws_iam_policy_document" "irsa_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = [aws_eks_cluster.main.identity[0].oidc[0].issuer]
    }
    actions = ["sts:AssumeRoleWithWebIdentity"]
    condition {
      test     = "StringEquals"
      variable = "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub"
      values   = ["system:serviceaccount:student-management:student-backend-sa"]
    }
  }
}

data "aws_iam_policy_document" "irsa_permissions" {
  statement {
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.notes.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
    ]
    resources = [aws_secretsmanager_secret.db_credentials.arn]
  }
}

resource "aws_iam_role" "irsa" {
  name               = "student-management-irsa-role"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume.json

  inline_policy {
    name   = "student-management-irsa-policy"
    policy = data.aws_iam_policy_document.irsa_permissions.json
  }

  tags = merge(local.common_tags, {
    Name = "student-management-irsa-role"
  })
}

resource "aws_security_group" "eks_cluster" {
  name        = "student-eks-cluster-sg"
  description = "Security group for the EKS cluster"
  vpc_id      = aws_vpc.main.id

  # Allow the cluster to communicate with the database layer
  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [for i in range(2) : "10.0.${i + 20}.0/24"]
    description = "PostgreSQL to database subnets"
  }

  egress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = [for i in range(2) : "10.0.${i + 20}.0/24"]
    description = "DocumentDB to database subnets"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "student-eks-cluster-sg"
    Environment = var.environment
  }
}
