# Cab Booking System - Automated Deployment Script
# This script builds, pushes, and deploys everything to Docker Desktop K8s

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('build-push', 'deploy-k8s', 'full', 'cleanup')]
    [string]$Action = 'full'
)

$ErrorActionPreference = "Stop"

$ProjectRoot = "c:\Users\nobit\Desktop\cab-net"
$DockerHubUsername = "brahman1101"
$KubernetesNamespace = "cab-system"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "CAB BOOKING SYSTEM - DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Function to verify prerequisites
function Verify-Prerequisites {
    Write-Host "`n[*] Verifying prerequisites..." -ForegroundColor Yellow
    
    $missing = @()
    
    if (-not (Test-Command docker)) {
        $missing += "docker"
    }
    if (-not (Test-Command kubectl)) {
        $missing += "kubectl"
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "Missing tools: $($missing -join ', ')" -ForegroundColor Red
        exit 1
    }
    
    # Check Docker Desktop K8s
    try {
        $context = kubectl config current-context 2>$null
        if ($context -like "*docker-desktop*") {
            Write-Host "[OK] Docker Desktop K8s is active" -ForegroundColor Green
        } else {
            Write-Host "[!] Warning: Current k8s context is not 'docker-desktop'" -ForegroundColor Yellow
            Write-Host "    Current context: $context" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] Kubernetes is not running. Please enable K8s in Docker Desktop!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[OK] All prerequisites OK" -ForegroundColor Green
}

# Function to build and push images
function Build-And-Push-Images {
    Write-Host "`n[*] Building and pushing Docker images..." -ForegroundColor Yellow
    
    Set-Location $ProjectRoot
    
    $services = @(
        "user-service",
        "ride-service", 
        "driver-service",
        "payment-service",
        "notification-service",
        "api-gateway"
    )
    
    foreach ($service in $services) {
        Write-Host "`n  Building $service..." -ForegroundColor Cyan
        $imageName = "$DockerHubUsername/cab-$service`:latest"
        
        $buildPath = "./backend/$service"
        if (-not (Test-Path $buildPath)) {
            Write-Host "  [ERROR] Path not found: $buildPath" -ForegroundColor Red
            continue
        }
        
        try {
            & docker build -t $imageName $buildPath
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Built: $imageName" -ForegroundColor Green
            } else {
                Write-Host "  [ERROR] Build failed for $service" -ForegroundColor Red
            }
        } catch {
            Write-Host "  [ERROR] Error building $service : $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`n[*] Pushing images to Docker Hub..." -ForegroundColor Yellow
    Write-Host "    Make sure you are logged in: docker login" -ForegroundColor Yellow
    
    foreach ($service in $services) {
        Write-Host "`n  Pushing $service..." -ForegroundColor Cyan
        $imageName = "$DockerHubUsername/cab-$service`:latest"
        
        try {
            & docker push $imageName
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Pushed: $imageName" -ForegroundColor Green
            } else {
                Write-Host "  [ERROR] Push failed for $service" -ForegroundColor Red
            }
        } catch {
            Write-Host "  [ERROR] Error pushing $service : $_" -ForegroundColor Red
        }
    }
}

# Function to deploy to Kubernetes
function Deploy-To-Kubernetes {
    Write-Host "`n[*] Deploying to Kubernetes..." -ForegroundColor Yellow
    
    Set-Location $ProjectRoot
    
    # Apply manifests in order
    $manifests = @(
        'K8s/00-namespace.yaml',
        'K8s/01-configmap.yaml',
        'K8s/02-secret.yaml',
        'K8s/postgres-init-configmap.yaml',
        'K8s/03-postgres.yaml',
        'K8s/04-rabbitmq.yaml',
        'K8s/05-redis.yaml',
        'K8s/06-user-service.yaml',
        'K8s/07-ride-service.yaml',
        'K8s/08-driver-service.yaml',
        'K8s/09-payment-service.yaml',
        'K8s/10-notification-service.yaml',
        'K8s/11-api-gateway.yaml'
    )
    
    foreach ($manifest in $manifests) {
        Write-Host "  Applying $manifest..." -ForegroundColor Cyan
        try {
            & kubectl apply -f $manifest 2>&1 | Out-Null
            Write-Host "  [OK] Applied: $manifest" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] Error applying $manifest : $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`n[*] Waiting for pods to be ready (this may take a few minutes)..." -ForegroundColor Yellow
    
    try {
        Write-Host "  Waiting for postgres..." -ForegroundColor Cyan
        & kubectl wait --for=condition=ready pod -l app=postgres -n $KubernetesNamespace --timeout=300s 2>&1 | Out-Null
        Write-Host "  [OK] Postgres is ready" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Timeout waiting for postgres" -ForegroundColor Yellow
    }
    
    try {
        Write-Host "  Waiting for rabbitmq..." -ForegroundColor Cyan
        & kubectl wait --for=condition=ready pod -l app=rabbitmq -n $KubernetesNamespace --timeout=300s 2>&1 | Out-Null
        Write-Host "  [OK] RabbitMQ is ready" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Timeout waiting for rabbitmq" -ForegroundColor Yellow
    }
    
    try {
        Write-Host "  Waiting for api-gateway..." -ForegroundColor Cyan
        & kubectl wait --for=condition=ready pod -l app=api-gateway -n $KubernetesNamespace --timeout=300s 2>&1 | Out-Null
        Write-Host "  [OK] API Gateway is ready" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Timeout waiting for api-gateway" -ForegroundColor Yellow
    }
}

# Function to show status
function Show-Status {
    Write-Host "`n[*] Deployment Status:" -ForegroundColor Yellow
    Write-Host ""
    & kubectl get all -n $KubernetesNamespace
    
    Write-Host "`n[*] Services:" -ForegroundColor Yellow
    & kubectl get svc -n $KubernetesNamespace
    
    Write-Host "`n[*] Pods Details:" -ForegroundColor Yellow
    & kubectl describe pods -n $KubernetesNamespace
}

# Function to cleanup
function Cleanup {
    Write-Host "`n[*] Cleaning up..." -ForegroundColor Yellow
    Write-Host "    Are you sure you want to delete all resources? (yes/no)" -ForegroundColor Red
    
    $confirm = Read-Host "    "
    if ($confirm -eq 'yes') {
        try {
            & kubectl delete namespace $KubernetesNamespace
            Write-Host "[OK] Cleanup completed" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Error during cleanup: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "[!] Cleanup cancelled" -ForegroundColor Yellow
    }
}

# Main execution
try {
    Verify-Prerequisites
    
    switch ($Action) {
        'build-push' {
            Build-And-Push-Images
        }
        'deploy-k8s' {
            Deploy-To-Kubernetes
            Show-Status
        }
        'full' {
            Build-And-Push-Images
            Write-Host "`n[!] Note: Images built but NOT deployed yet!" -ForegroundColor Yellow
            Write-Host "[!] Run with -Action deploy-k8s to deploy to K8s" -ForegroundColor Yellow
            Write-Host "[!] Or run: .\deploy.ps1 -Action full again" -ForegroundColor Yellow
        }
        'cleanup' {
            Cleanup
        }
    }
    
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n[ERROR] Fatal error: $_" -ForegroundColor Red
    exit 1
}
