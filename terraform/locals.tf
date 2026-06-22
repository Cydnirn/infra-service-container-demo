# Local values used across the configuration

locals {
  common_tags = {
    Environment = var.environment
    Project     = "student-management"
    ManagedBy   = "Terraform"
  }
}
