# Checklist: AWS Cloud Provisioning & Terraform Modularization

Use this checklist to track your progress as you deploy the pre-built application containers onto AWS infrastructure using Terraform and subsequently refactor the infrastructure into reusable modules.

## Phase 1: AWS Infrastructure Provisioning (Monolithic Terraform)
- [ ] Configure `providers.tf` with the standard AWS provider and an S3 remote backend block.
- [ ] Provision the VPC topology in `vpc.tf` (2 Public Subnets, 2 Private Subnets, 1 IGW, 1 NAT Gateway).
- [ ] **AWS ECS Fargate Target (`ecs.tf`):**
  - [ ] Provision the `aws_ecs_cluster` and `aws_ecs_task_definition` resources.
  - [ ] Configure the `aws_ecs_service` with a strict `desired_count = 1` for the backend component.
  - [ ] Build the Application Load Balancer (ALB), Target Groups, and Listener rules to route traffic.
- [ ] **Amazon EKS Target (`eks.tf`):**
  - [ ] Provision the `aws_eks_cluster` resource alongside all required IAM cluster execution roles.
  - [ ] Configure an `aws_eks_node_group` using `t3.medium` instances (Statically disabled EKS Auto Mode).
- [ ] Run `terraform init`, `terraform plan`, and `terraform apply` to cleanly spin up the live environment.

## Phase 2: Kubernetes Application Lifecycle (EKS Target)
- [ ] Update local kubeconfig context via the AWS CLI to point to the new cluster.
- [ ] Apply the generated Kubernetes manifests (`k8s/backend.yaml`, `k8s/frontend.yaml`).
- [ ] Verify backend pods are bound to exactly 1 replica and the frontend load balancer successfully serves the app.

## Phase 3: Infrastructure Code Refactoring (Modularization Challenge)
- [ ] Deconstruct the working monolithic setup into separate programmatic directories:
  - [ ] `modules/vpc/`
  - [ ] `modules/ecs/`
  - [ ] `modules/eks/`
- [ ] Declare explicit input parameters (`variables.tf`) and structured return schemas (`outputs.tf`) for each module layer.
- [ ] Refactor the root level `main.tf` to invoke all three modules cleanly.
- [ ] Execute `terraform init` and validate that configuration drift is zero and state transfers cleanly.
