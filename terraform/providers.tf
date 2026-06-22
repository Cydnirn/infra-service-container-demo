terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ─────────────────────────────────────────────────────────
  # S3 Remote Backend (template — configure before use)
  #
  # Option A: Edit the placeholder values below directly.
  # Option B: Leave blank and pass via CLI:
  #   terraform init \
  #     -backend-config="bucket=YOUR_BUCKET" \
  #     -backend-config="key=student-management/terraform.tfstate" \
  #     -backend-config="region=us-east-1" \
  #     -backend-config="dynamodb_table=YOUR_LOCK_TABLE"
  #
  # The LabRole must have s3:GetObject, s3:PutObject on the bucket
  # and dynamodb:GetItem, dynamodb:PutItem on the lock table.
  # ─────────────────────────────────────────────────────────
  backend "s3" {
    bucket         = "REPLACE_WITH_YOUR_BUCKET_NAME"
    key            = "student-management/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "REPLACE_WITH_YOUR_DYNAMODB_LOCK_TABLE" // Optional
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
