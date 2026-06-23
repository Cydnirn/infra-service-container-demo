# Checklist: Multi-Orchestration App with DB Persistence & Advanced IAM

Use this checklist to track your progress as you deploy a React Router frontend and a multi-database Go backend (RDS, DocumentDB, DynamoDB) to AWS, followed by advanced security and code refactoring challenges.

## Phase 1: AWS Infrastructure Provisioning (Monolithic Terraform)
- [ ] Configure `providers.tf` with the standard AWS provider and an S3 remote backend block.
- [ ] **Network (`vpc.tf`):** Provision 2 Public, 2 Private, and 2 Isolated DB Subnets, plus 1 IGW and 1 NAT Gateway.
- [ ] **Databases (`databases.tf`):**
  - [ ] Provision the Amazon RDS instance (for core student data).
  - [ ] Provision the Amazon RDS Proxy (placed in Private subnets) to manage connection pooling.
  - [ ] Provision the Amazon DocumentDB cluster (for unstructured student notes).
  - [ ] Provision the Amazon DynamoDB table (for user authentication).
- [ ] **AWS ECS Target (`ecs.tf`):**
  - [ ] Provision the `aws_ecs_cluster` and Fargate task definitions.
  - [ ] Inject DB endpoints, RDS Proxy addresses, and secrets natively into the ECS Task as environment variables.
  - [ ] Build the Application Load Balancer (ALB) and Listeners to route traffic to the frontend.
- [ ] **Amazon EKS Target (`eks.tf`):**
  - [ ] Provision the `aws_eks_cluster` and `aws_eks_node_group` (`t3.medium`, Auto Mode explicitly disabled).
- [ ] Run `terraform init`, `terraform plan`, and `terraform apply` to provision the environment.

## Phase 2: Kubernetes Application Lifecycle (EKS Target)
- [ ] Update local kubeconfig via the AWS CLI to connect to the EKS cluster.
- [ ] **Default Secret Injection:** Create a Kubernetes `Secret` containing the RDS credentials, DocumentDB string, and explicitly pass an `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for DynamoDB access.
- [ ] Apply the generated Kubernetes manifests with Kustomize.
- [ ] Validate the React Router navigation works (Login -> Dashboard -> Student Details).
- [ ] Verify backend read/writes to RDS (structural), DocumentDB (notes), and DynamoDB (login).

## Phase 3: Advanced Security Challenge (IRSA / Pod Identity)
*Note: In AWS Lab/Academy environments, you may need to attach your policies to the pre-existing `LabRole` or ensure your custom IAM Roles comply with lab permission boundaries.*
- [ ] **Goal:** Eliminate hardcoded AWS Keys for DynamoDB access from your Kubernetes cluster.
- [ ] Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from your Kubernetes `Secret`.
- [ ] Create an IAM Policy that explicitly allows `dynamodb:PutItem`, `dynamodb:GetItem`, etc., on your specific table.
- [ ] **Configure IAM for Service Accounts:**
  - [ ] Provision an IAM OIDC provider for your EKS cluster (or setup EKS Pod Identities).
  - [ ] Create an IAM Role trusting the OIDC provider (or Pod Identity association) and attach the DynamoDB policy.
- [ ] Create a Kubernetes `ServiceAccount` and annotate it with the ARN of your newly created IAM Role.
- [ ] Update `backend.yaml` to run using `serviceAccountName: <your-new-service-account>`.
- [ ] Restart the backend pods and verify DynamoDB login still works without the hardcoded keys.

## Phase 4: Infrastructure Code Refactoring (Modularization)
- [ ] Deconstruct the working monolithic Terraform setup into separate programmatic directories:
  - [ ] `modules/vpc/`
  - [ ] `modules/databases/` (New module for RDS, DocDB, DynamoDB)
  - [ ] `modules/ecs/`
  - [ ] `modules/eks/`
- [ ] Declare explicit input parameters (`variables.tf`) and structured return schemas (`outputs.tf`) for each module layer.
- [ ] Refactor the root level `main.tf` to invoke all four modules cleanly, passing database endpoints as outputs from the DB module into the ECS/EKS modules.
- [ ] Execute `terraform init` and `terraform apply` to validate zero configuration drift.
