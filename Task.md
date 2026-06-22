# AI Prompt: Multi-Orchestration CRUD App Generation Specification

You are an expert Cloud Architect and Software Engineer. Your task is to generate the complete source code, configuration files, and IaC manifests for a Student Management CRUD application based on the strict specifications below.

---

## 1. Codebase Architecture & File Structure
Generate all code adhering precisely to this directory layout:

```text
├── backend/
│   ├── main.go
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── terraform/
│   ├── backend.tf
│   ├── providers.tf
│   ├── vpc.tf
│   ├── ecs.tf
│   └── eks.tf
└── k8s/
    ├── backend.yaml
    └── frontend.yaml
```

## 2. Component Specifications
A. Go Backend (backend/main.go)
Framework: Standard library (net/http) or gin-gonic/gin.

Data Store: In-memory thread-safe slice or map protected by a sync.RWMutex.

Data Model:

```go
type Student struct {
ID    string `json:"id"`
Name  string `json:"name"`
Age   int    `json:"age"`
Major string `json:"major"`
}
```

API Endpoints: * GET /students (List all)

GET /students/{id} (Get one)

POST /students (Create)

PUT /students/{id} (Update)

DELETE /students/{id} (Delete)

Port: Listen on port 8080. Implement CORS allowing all origins (*).

B. React Frontend using React Router Framework Mode (frontend/src/)
State Management: Use standard hooks (useState, useEffect).

UI Capabilities: Simple CSS grid/flexbox displaying a table of students, a form to add/edit students, and action buttons for deleting records.

API Config: Read the backend API URL from an environment variable REACT_APP_API_URL.

C. Dockerfiles
Backend: Multi-stage build. Stage 1: golang:1.23-alpine (builder). Stage 2: scratch or alpine:latest containing only the compiled binary. Expose port 8080.

Frontend: Multi-stage build. Stage 1: node:20-alpine (builder). Stage 2: nginx:alpine copying the build artifacts to /usr/share/nginx/html. Expose port 80.

## 3. Infrastructure Specifications (Terraform)
Network (vpc.tf)
Deploy a custom VPC with CIDR 10.0.0.0/16.

Provision 2 Public Subnets and 2 Private Subnets across 2 Availability Zones.

Create an Internet Gateway and 1 NAT Gateway inside a public subnet. Route all private subnet internet traffic (0.0.0.0/0) through the NAT Gateway.

State Management (backend.tf)
Configure the Terraform standard S3 remote backend. Use a placeholder value for bucket and region.

AWS ECS Fargate Track (ecs.tf)
Provision an aws_ecs_cluster.

Create aws_ecs_task_definition utilizing the FARGATE launch type.

Define aws_ecs_service with desired_count = 1 for the backend application to prevent in-memory state inconsistency.

Create an AWS Application Load Balancer (ALB) attached to the public subnets to route external traffic to the containers.

Amazon EKS Track (eks.tf)
Provision an aws_eks_cluster. Do NOT use EKS Auto Mode.

Configure an aws_eks_node_group using Amazon Linux 2 or Bottlerocket AMIs.

Node configuration: Set instance type to t3.medium, with a scaling config of min_size = 2, max_size = 3, desired_size = 2.

## 4. Kubernetes Manifests (k8s/)
Generate fully compliant YAML manifests for the EKS deployment:

backend.yaml: Create a Deployment with replicas: 1 and a cluster-internal Service.

frontend.yaml: Create a Deployment and a Service of type: LoadBalancer to expose the frontend to the public internet. Ensure the frontend pod injects the backend Service URL into REACT_APP_API_URL.

## Output Requirement
Generate the files completely without omitting code lines (// todo or ... comments are strictly forbidden). Provide clean, syntax-valid code block sequences for every file requested in the directory blueprint.
