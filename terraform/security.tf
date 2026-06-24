# ───────────────────────────────────────────────────────────
# Security & Identity Layer
#
# AWS Secrets Manager  — database credentials
# Amazon Cognito       — user authentication (JWT tokens)
# AWS KMS              — envelope encryption for DocumentDB notes
# AWS ACM              — TLS certificate for HTTPS listeners
# ───────────────────────────────────────────────────────────

# ───────────────────────────────────────────────────────────
# AWS Secrets Manager — Database Credentials
# ───────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "student-management/db-credentials"
  description = "RDS and DocumentDB credentials for the student management backend"

  tags = merge(local.common_tags, {
    Name = "student-management-db-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_master_username
    password = var.db_master_password
    host     = aws_db_instance.postgres.address
    port     = 5432
    dbname   = aws_db_instance.postgres.db_name
    engine   = "postgres"
  })
}

# ───────────────────────────────────────────────────────────
# Amazon Cognito User Pool — User Authentication
# ───────────────────────────────────────────────────────────

resource "aws_cognito_user_pool" "main" {
  name = "student-management-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 3
      max_length = 256
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = merge(local.common_tags, {
    Name = "student-management-user-pool"
  })
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "student-management-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # SSR application — the React Router server calls Cognito's InitiateAuth
  # API server-side via amazon-cognito-identity-js. Tokens are stored in
  # HttpOnly cookies and never reach the browser as JavaScript-accessible data.
  # No client secret needed — the library uses SRP (Secure Remote Password)
  # which does not require SECRET_HASH computation.
  generate_secret = false

  # Explicit auth flows used by amazon-cognito-identity-js:
  # - USER_SRP_AUTH: preferred, password never sent in plaintext
  # - USER_PASSWORD_AUTH: fallback for legacy clients
  # - REFRESH_TOKEN_AUTH: silent token renewal
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Token lifetimes
  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  enable_token_revocation = true
}

# ───────────────────────────────────────────────────────────
# AWS KMS — Symmetric Key for Note Encryption
# ───────────────────────────────────────────────────────────

resource "aws_kms_key" "notes" {
  description             = "KMS key for student note envelope encryption in DocumentDB"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowECSExecutionRole"
        Effect = "Allow"
        Principal = {
          AWS = var.lab_role_arn
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:DescribeKey",
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "student-management-notes-key"
  })
}

resource "aws_kms_alias" "notes" {
  name          = "alias/student-management-notes"
  target_key_id = aws_kms_key.notes.key_id
}

# ───────────────────────────────────────────────────────────
# AWS ACM — TLS Certificate (Self-Signed via tls Provider)
# ───────────────────────────────────────────────────────────

resource "tls_private_key" "acm" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "acm" {
  private_key_pem = tls_private_key.acm.private_key_pem

  subject {
    common_name  = "student-management.local"
    organization = "Student Management System"
  }

  validity_period_hours = 8760 # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

resource "aws_acm_certificate" "main" {
  private_key      = tls_private_key.acm.private_key_pem
  certificate_body = tls_self_signed_cert.acm.cert_pem

  tags = merge(local.common_tags, {
    Name = "student-management-acm"
  })
}

# ───────────────────────────────────────────────────────────
# Data Source: AWS Account ID
# ───────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
