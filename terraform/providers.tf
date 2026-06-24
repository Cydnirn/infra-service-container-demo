terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket       = "student-management-terraform-284845684968-us-east-1-an"
    key          = "student-management/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ───────────────────────────────────────────────────────────
# Variables
# ───────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "lab_role_arn" {
  description = "ARN of the pre-existing LabRole for IAM permissions (ECS execution/task, EKS cluster/node, VPC flow logs)"
  type        = string
}

variable "db_master_username" {
  description = "Master username for RDS and DocumentDB"
  type        = string
  default     = "dbadmin"
  sensitive   = true
}

variable "db_master_password" {
  description = "Master password for RDS and DocumentDB"
  type        = string
  sensitive   = true
}

variable "cognito_callback_urls" {
  description = "List of allowed callback URLs for the Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3000/"]
}

variable "cognito_logout_urls" {
  description = "List of allowed logout URLs for the Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3000/"]
}

# Backend configuration variables — documented for reference.
# These are NOT used directly in the backend block above
# (Terraform does not support variables in backend config).
# Use -backend-config overrides or edit the placeholders instead.

variable "backend_bucket" {
  description = "S3 bucket name for Terraform state storage"
  type        = string
  default     = "REPLACE_WITH_YOUR_BUCKET_NAME"
}

variable "backend_key" {
  description = "S3 object key for the Terraform state file"
  type        = string
  default     = "student-management/terraform.tfstate"
}

variable "backend_region" {
  description = "AWS region of the S3 state bucket"
  type        = string
  default     = "us-east-1"
}

variable "backend_dynamodb_table" {
  description = "DynamoDB table name for Terraform state locking"
  type        = string
  default     = "REPLACE_WITH_YOUR_DYNAMODB_LOCK_TABLE"
}
