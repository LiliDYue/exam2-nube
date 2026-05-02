# Examen 2 - Kubernetes AWS

## Deploy infraestructura
cd terraform
terraform init
terraform apply

## Deploy app
kubectl apply -f k8s/

## Flujo
API -> SQS -> Worker -> PDF -> S3 -> SNS