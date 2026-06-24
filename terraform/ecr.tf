resource "aws_ecr_repository" "backend" {
  name = "student-backend"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "student-backend-ecr"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "frontend" {
  name = "student-frontend"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "student-frontend-ecr"
    Environment = var.environment
  }
}
