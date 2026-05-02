# Examen 2 - Kubernetes AWS

## Deploy infraestructura
cd terraform
terraform init
terraform apply

## Deploy app
kubectl apply -f k8s/

## Flujo
API -> SQS -> Worker -> PDF -> S3 -> SNS

## Docker hub
cd services/api
docker build -t <tu-usuario>/api:latest .
docker push <tu-usuario>/api:latest

cd ../worker
docker build -t <tu-usuario>/worker:latest .
docker push <tu-usuario>/worker:latest

cd ../pdf-generator
docker build -t <tu-usuario>/pdf:latest .
docker push <tu-usuario>/pdf:latest

cd ../notifier
docker build -t <tu-usuario>/notifier:latest .
docker push <tu-usuario>/notifier:latest

## Desplegar en Kubernetes
kubectl apply -f k8s/
sudo /usr/local/bin/k3s kubectl apply -f k8s/

## Verificar Pods
kubectl get pods

## Probar API
Cliente
curl -X POST http://<IP>:30007/clientes \
-H "Content-Type: application/json" \
-d '{"razon_social":"Empresa","nombre_comercial":"Test","rfc":"RFC123","correo":"test@test.com","telefono":"123"}'

Venta
curl -X POST http://<IP>:30007/ventas \
-H "Content-Type: application/json" \
-d '{"cliente_id":1,"total":100}'

Descargar PDF
curl http://<IP>:30007/download/RFC123/1 --output nota.pdf

