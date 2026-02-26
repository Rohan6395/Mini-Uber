# CAB BOOKING SYSTEM - DEPLOYMENT GUIDE
# This guide helps you deploy the application using Docker Desktop K8s + Cloudflare Tunnel

## PREREQUISITE CHECKLIST

### 1. ENABLE KUBERNETES IN DOCKER DESKTOP
   - Open Docker Desktop Settings
   - Go to Settings > Kubernetes
   - Check "Enable Kubernetes"
   - Click "Apply & Restart"
   - Wait 2-3 minutes for K8s to start

### 2. VERIFY KUBECTL IS INSTALLED
   - Run: kubectl version
   - Should show both Client and Server version

### 3. DOCKER HUB LOGIN
   - Run: docker login
   - Username: brahman1101
   - Password: <your-dockerhub-password>

### 4. CLOUDFLARE ACCOUNT
   - Already have account: abhisheksharmaksp222@gmail.com
   - Will download Cloudflare Tunnel later

---

## STEP-BY-STEP DEPLOYMENT

### STEP 1: BUILD & PUSH DOCKER IMAGES TO DOCKER HUB
```powershell
cd c:\Users\nobit\Desktop\cab-net

# Build all backend services
docker build -t brahman1101/cab-user-service:latest ./backend/user-service
docker build -t brahman1101/cab-ride-service:latest ./backend/ride-service
docker build -t brahman1101/cab-driver-service:latest ./backend/driver-service
docker build -t brahman1101/cab-payment-service:latest ./backend/payment-service
docker build -t brahman1101/cab-notification-service:latest ./backend/notification-service
docker build -t brahman1101/cab-api-gateway:latest ./backend/api-gateway

# Push all images to Docker Hub
docker push brahman1101/cab-user-service:latest
docker push brahman1101/cab-ride-service:latest
docker push brahman1101/cab-driver-service:latest
docker push brahman1101/cab-payment-service:latest
docker push brahman1101/cab-notification-service:latest
docker push brahman1101/cab-api-gateway:latest
```

### STEP 2: DEPLOY TO KUBERNETES (IN ORDER)
```powershell
# Create namespace and base configs
kubectl apply -f K8s/00-namespace.yaml
kubectl apply -f K8s/01-configmap.yaml
kubectl apply -f K8s/02-secret.yaml

# Deploy databases and message queues
kubectl apply -f K8s/03-postgres.yaml
kubectl apply -f K8s/04-rabbitmq.yaml
kubectl apply -f K8s/05-redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n cab-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n cab-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n cab-system --timeout=300s

# Deploy microservices
kubectl apply -f K8s/06-user-service.yaml
kubectl apply -f K8s/07-ride-service.yaml
kubectl apply -f K8s/08-driver-service.yaml
kubectl apply -f K8s/09-payment-service.yaml
kubectl apply -f K8s/10-notification-service.yaml

# Wait for services to be ready
kubectl wait --for=condition=ready pod -l app=user-service -n cab-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=ride-service -n cab-system --timeout=300s

# Deploy API Gateway last
kubectl apply -f K8s/11-api-gateway.yaml

# Wait for API Gateway
kubectl wait --for=condition=ready pod -l app=api-gateway -n cab-system --timeout=300s
```

### STEP 3: VERIFY ALL PODS ARE RUNNING
```powershell
kubectl get pods -n cab-system

# Should see all pods in "Running" state
# Expected output:
# NAME                                    READY   STATUS    RESTARTS   AGE
# postgres-xxxxx                          1/1     Running   0          2m
# rabbitmq-xxxxx                          1/1     Running   0          2m
# redis-xxxxx                             1/1     Running   0          2m
# user-service-xxxxx                      1/1     Running   0          1m
# ride-service-xxxxx                      1/1     Running   0          1m
# driver-service-xxxxx                    1/1     Running   0          1m
# payment-service-xxxxx                   1/1     Running   0          1m
# notification-service-xxxxx              1/1     Running   0          1m
# api-gateway-xxxxx                       1/1     Running   0          30s
```

### STEP 4: GET EXTERNAL IP OF API GATEWAY
```powershell
kubectl get svc api-gateway -n cab-system

# For Docker Desktop, you might see:
# - EXTERNAL-IP as pending (localhost works)
# - Access via: http://localhost:80
```

### STEP 5: SET UP CLOUDFLARE TUNNEL
```powershell
# Download and install Cloudflare Tunnel (cloudflared)
# From: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# After installation, run:
cloudflared tunnel login
# This will open browser, login with abhisheksharmaksp222@gmail.com

# Create tunnel
cloudflared tunnel create cab-booking
# Save the tunnel ID

# Create config file at: ~/.cloudflared/config.yml
# Content:
---
tunnel: cab-booking
credentials-file: /path/to/credentials/UUID.json
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
---

# Start tunnel
cloudflared tunnel run cab-booking

# Your app is now live at: https://api.yourdomain.com
```

---

## MONITORING & DEBUGGING

### View logs
```powershell
# API Gateway logs
kubectl logs -f deployment/api-gateway -n cab-system

# User Service logs
kubectl logs -f deployment/user-service -n cab-system

# All pods
kubectl logs -f deployment/<service-name> -n cab-system
```

### Port forward (for local testing)
```powershell
# Forward API Gateway to localhost:8080
kubectl port-forward svc/api-gateway 8080:80 -n cab-system

# Access at: http://localhost:8080
```

### Health check
```powershell
# Test API Gateway
curl http://localhost:80/health
```

### Delete everything
```powershell
kubectl delete namespace cab-system
```

---

## NOTES
- Keep the Cloudflare tunnel running in background
- Once tunnel starts, you get a public URL
- All your services are now live!
- Database is persistent in Docker Desktop volume
