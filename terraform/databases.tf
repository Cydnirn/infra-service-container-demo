# ───────────────────────────────────────────────────────────
# Amazon RDS (PostgreSQL)
# Stores core Student relational data.
# ───────────────────────────────────────────────────────────

resource "aws_db_instance" "postgres" {
  identifier = "student-management-postgres"

  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = "student_management"
  username = var.db_master_username
  password = var.db_master_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  publicly_accessible = false
  multi_az            = false
  skip_final_snapshot = true

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "student-management-postgres"
    Environment = var.environment
  }
}

# ───────────────────────────────────────────────────────────
# Amazon RDS Proxy
# Sits in front of the RDS instance in private subnets for
# connection pooling.
# ───────────────────────────────────────────────────────────

resource "aws_db_proxy" "postgres" {
  name                   = "student-management-postgres-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = var.lab_role_arn
  vpc_security_group_ids = [aws_security_group.database.id]
  vpc_subnet_ids         = aws_subnet.private[*].id

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.rds_credentials.arn
  }

  tags = {
    Name        = "student-management-postgres-proxy"
    Environment = var.environment
  }

  # Must wait for the DB instance AND the secret version to be ready.
  # Without the secret version the Proxy starts with no credentials.
  depends_on = [
    aws_db_instance.postgres,
    aws_secretsmanager_secret_version.rds_credentials,
  ]
}

resource "aws_db_proxy_default_target_group" "postgres" {
  db_proxy_name = aws_db_proxy.postgres.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "postgres" {
  db_proxy_name          = aws_db_proxy.postgres.name
  target_group_name      = aws_db_proxy_default_target_group.postgres.name
  db_instance_identifier = aws_db_instance.postgres.identifier
}

# Secrets Manager for RDS credentials (used by RDS Proxy)
resource "aws_secretsmanager_secret" "rds_credentials" {
  name_prefix = "student-management/rds-credentials"

  tags = {
    Name        = "student-management-rds-credentials"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id
  secret_string = jsonencode({
    username             = var.db_master_username
    password             = var.db_master_password
    engine               = "postgres"
    host                 = aws_db_instance.postgres.address
    port                 = 5432
    dbname               = aws_db_instance.postgres.db_name
    dbInstanceIdentifier = aws_db_instance.postgres.identifier
  })
}

# ───────────────────────────────────────────────────────────
# Amazon DocumentDB (MongoDB API compatible)
# Stores unstructured student notes/academic remarks.
# ───────────────────────────────────────────────────────────

resource "aws_docdb_cluster" "main" {
  cluster_identifier     = "student-management-docdb"
  engine                 = "docdb"
  engine_version         = "5.0.0"
  master_username        = var.db_master_username
  master_password        = var.db_master_password
  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  skip_final_snapshot          = true
  backup_retention_period      = 7
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  storage_encrypted = true

  tags = {
    Name        = "student-management-docdb"
    Environment = var.environment
  }
}

resource "aws_docdb_cluster_instance" "main" {
  count              = 1
  identifier         = "student-management-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = "db.t3.medium"

  tags = {
    Name        = "student-management-docdb-${count.index}"
    Environment = var.environment
  }
}

resource "aws_docdb_cluster_parameter_group" "main" {
  family = "docdb5.0"
  name   = "student-management-docdb-pg"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = {
    Name        = "student-management-docdb-pg"
    Environment = var.environment
  }
}

# ───────────────────────────────────────────────────────────
# Amazon DynamoDB
# Stores user authentication and session details.
# ───────────────────────────────────────────────────────────

resource "aws_dynamodb_table" "users" {
  name         = "users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "username"

  attribute {
    name = "username"
    type = "S"
  }

  # PITR is automatically enabled for tables in PAY_PER_REQUEST mode,
  # but we enable server-side encryption explicitly.
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "users"
    Environment = var.environment
  }
}

# ───────────────────────────────────────────────────────────
# Security Group for Database Layer
# ───────────────────────────────────────────────────────────

resource "aws_security_group" "database" {
  name        = "student-database-sg"
  description = "Security group for RDS, RDS Proxy, and DocumentDB"
  vpc_id      = aws_vpc.main.id

  # Allow PostgreSQL from private subnets (ECS tasks, EKS pods)
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [for i in range(2) : "10.0.${i + 10}.0/24"]
    description = "PostgreSQL from private subnets"
  }

  # Allow DocumentDB from private subnets (ECS tasks, EKS pods)
  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = [for i in range(2) : "10.0.${i + 10}.0/24"]
    description = "DocumentDB from private subnets"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "student-database-sg"
    Environment = var.environment
  }
}
