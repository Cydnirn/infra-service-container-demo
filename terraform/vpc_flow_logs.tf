# Flow logs for VPC network traffic monitoring

resource "aws_flow_log" "vpc" {
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.main.id
  iam_role_arn         = var.lab_role_arn

  tags = {
    Name        = "student-management-vpc-flow-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/vpc/student-management-flow-logs"
  retention_in_days = 30

  tags = {
    Name        = "student-management-vpc-flow-logs"
    Environment = var.environment
  }
}
