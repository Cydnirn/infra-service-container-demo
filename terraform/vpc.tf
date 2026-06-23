# VPC with public, private, and isolated database subnets across two availability zones

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "student-management-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "student-management-igw"
    Environment = var.environment
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "student-management-nat-eip"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "student-management-nat"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# ── Public Subnets ─────────────────────────────────────────

resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "student-management-public-${count.index + 1}"
    Environment = var.environment
    Tier        = "public"
  }
}

# ── Private Subnets (compute layer) ────────────────────────

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "student-management-private-${count.index + 1}"
    Environment = var.environment
    Tier        = "private"
  }
}

# ── Isolated Database Subnets ──────────────────────────────

resource "aws_subnet" "database" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "student-management-database-${count.index + 1}"
    Environment = var.environment
    Tier        = "database"
  }
}

# ── Route Tables ───────────────────────────────────────────

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "student-management-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name        = "student-management-private-rt"
    Environment = var.environment
  }
}

# Database subnets: isolated — no internet route.
# Traffic stays within the VPC.
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "student-management-database-rt"
    Environment = var.environment
  }
}

# ── Route Table Associations ───────────────────────────────

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "database" {
  count = 2

  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

# ── DB Subnet Group for RDS ────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "student-management-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name        = "student-management-db-subnet-group"
    Environment = var.environment
  }
}

# ── DB Subnet Group for DocumentDB ─────────────────────────

resource "aws_docdb_subnet_group" "main" {
  name       = "student-management-docdb-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name        = "student-management-docdb-subnet-group"
    Environment = var.environment
  }
}
