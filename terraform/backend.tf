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
# NOTE: The terraform {} block with backend configuration is in providers.tf.
# Only one terraform {} block is allowed per module.
