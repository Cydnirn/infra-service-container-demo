terraform {
  backend "s3" {
    bucket = "placeholder-terraform-state-bucket"
    key    = "student-management/terraform.tfstate"
    region = "us-east-1"
  }
}
