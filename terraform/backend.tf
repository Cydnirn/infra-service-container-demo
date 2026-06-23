# S3 Remote Backend for Terraform state
#
# Configure before use:
# Option A: Edit the placeholder values below directly.
# Option B: Leave blank and pass via CLI:
#   terraform init \
#     -backend-config="bucket=YOUR_BUCKET" \
#     -backend-config="key=student-management/terraform.tfstate" \
#     -backend-config="region=us-east-1" \
#     -backend-config="use_lockfile=true"
#
terraform {
  backend "s3" {
    bucket       = "student-management-terraform-284845684968-us-east-1-an"
    key          = "student-management/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
