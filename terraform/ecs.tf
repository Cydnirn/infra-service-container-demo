# ECS Fargate cluster, task definition, service, and Application Load Balancer

resource "aws_ecs_cluster" "main" {
  name = "student-management-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "student-management-cluster"
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "student-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.lab_role_arn
  task_role_arn            = var.lab_role_arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        # PostgreSQL (RDS via Proxy)
        { name = "DB_HOST", value = aws_db_proxy.postgres.endpoint },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = aws_db_instance.postgres.db_name },
        # DocumentDB
        { name = "DOCDB_CONNECTION_STRING", value = "mongodb://${aws_docdb_cluster.main.endpoint}:27017/?tls=true&tlsCAFile=/usr/local/share/ca-certificates/rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" },
        { name = "DOCDB_DB_NAME", value = "student_management" },
        { name = "DOCDB_COLLECTION", value = "notes" },
        # DynamoDB
        { name = "DYNAMODB_TABLE_NAME", value = aws_dynamodb_table.users.name },
        # CORS
        { name = "CORS_ALLOWED_ORIGIN", value = "*" },
        # Port
        { name = "PORT", value = "8080" },
      ]
      secrets = [
        { name = "DB_USERNAME", valueFrom = "${aws_secretsmanager_secret.rds_credentials.arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${aws_secretsmanager_secret.rds_credentials.arn}:password::" },
        { name = "DOCDB_USERNAME", valueFrom = "${aws_secretsmanager_secret.rds_credentials.arn}:username::" },
        { name = "DOCDB_PASSWORD", valueFrom = "${aws_secretsmanager_secret.rds_credentials.arn}:password::" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name        = "student-backend-task"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "backend" {
  name            = "student-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.backend]

  tags = {
    Name        = "student-backend-service"
    Environment = var.environment
  }
}

resource "aws_lb" "backend" {
  name               = "student-backend-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name        = "student-backend-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "student-backend-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/students"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200,401"
  }

  tags = {
    Name        = "student-backend-tg"
    Environment = var.environment
  }
}

resource "aws_lb_listener" "backend" {
  load_balancer_arn = aws_lb.backend.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

resource "aws_security_group" "alb" {
  name        = "student-alb-sg"
  description = "Security group for the application load balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "student-alb-sg"
    Environment = var.environment
  }
}

resource "aws_security_group" "ecs_backend" {
  name        = "student-ecs-backend-sg"
  description = "Security group for the ECS backend service"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "student-ecs-backend-sg"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/student-backend"
  retention_in_days = 30

  tags = {
    Name        = "student-backend-logs"
    Environment = var.environment
  }
}

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
