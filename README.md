# 🚖 Cab Booking System - Microservices Architecture (Kubernetes + Minikube)

This is a sample **Cab Booking System** built using a microservices architecture and deployed on **Kubernetes using Minikube**. Each service is containerized with Docker and managed through Kubernetes deployments, services, and ingress.

---

## 🧩 Project Structure

This project includes the following services:

- **API Gateway** – Entry point that routes requests to appropriate services.
- **User Service** – Handles user registration and login.
- **Ride Service** – Manages ride creation, allocation, and tracking.
- **Payment Service** – Handles payment processing.
- **Notification Service** – Sends ride and payment notifications.
- **RabbitMQ** – Message broker for inter-service communication.

---

## 🚀 Technologies Used

- Node.js / Express.js (per microservice)
- MongoDB / In-memory data
- RabbitMQ for messaging
- Docker for containerization
- Kubernetes for orchestration
- Minikube for local Kubernetes cluster
- Ingress Controller for routing

---

## 🛠️ Prerequisites

- [Docker](https://www.docker.com/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- PowerShell (on Windows) or terminal (Mac/Linux)

---

## ⚙️ Setup Instructions

### 1. Start Minikube

## 📁 Project Structure

```
cab-booking-system/
│
├── api-gateway/             # Handles request routing and authentication
├── user-service/            # Manages user registration, profiles, and authentication
├── ride-service/            # Handles ride booking, tracking, and status updates
├── payment-service/         # Manages payments and transactions
├── notification-service/    # Sends ride confirmations, alerts, and updates
├── docker-compose.yml       # Defines and runs multi-container Docker applications
```


```bash
minikube start --no-vtx-check --addons=ingress
