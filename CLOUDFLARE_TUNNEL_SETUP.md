# Cloudflare Tunnel Setup Guide

This guide will help you expose your Docker Desktop K8s deployment publicly using Cloudflare Tunnel (Secure & Free).

## What is Cloudflare Tunnel?

Cloudflare Tunnel creates a secure, encrypted tunnel from your local machine to Cloudflare's network, without needing to expose your local ports to the internet. Perfect for:
- No port forwarding needed
- Free SSL/TLS certificates
- DDoS protection
- Publicly accessible URL

---

## Prerequisites

- ✅ Cloudflare account: `abhisheksharmaksp222@gmail.com`
- ✅ Docker Desktop K8s deployed and running
- ✅ API Gateway accessible at `http://localhost` or `http://localhost:80`

---

## Step 1: Download & Install Cloudflare Tunnel

### Option A: Windows (Easiest)
1. Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Select **Cloudflared** → **Windows** → Download the exe
3. Place `cloudflared.exe` in a folder (e.g., `C:\cloudflared\`)
4. Open PowerShell and verify:
   ```powershell
   C:\cloudflared\cloudflared.exe --version
   ```

### Option B: Using Chocolatey
```powershell
choco install cloudflare-warp
```

### Option C: Using scoop
```powershell
scoop install cloudflared
```

---

## Step 2: Authenticate with Cloudflare

```powershell
cloudflared tunnel login
```

This will:
1. Open browser automatically
2. Log in with: `abhisheksharmaksp222@gmail.com`
3. Select domain (or create free subdomain)
4. Save credentials to `~/.cloudflared/credentials.json`

---

## Step 3: Create a Tunnel

```powershell
cloudflared tunnel create cab-booking
```

Output will show:
```
Tunnel credentials saved to /Users/username/.cloudflared/<UUID>.json
Tunnel URL: <UUID>.cfargotunnel.com
```

**Save the UUID for later**

---

## Step 4: Configure the Tunnel

Create file: `~/.cloudflared/config.yml`

**Option A: Using Free Cloudflare Subdomain**
```yaml
tunnel: cab-booking
credentials-file: /Users/username/.cloudflared/<UUID>.json
logfile: /var/log/cloudflared.log
loglevel: info

ingress:
  - hostname: api.yourusername.workers.dev
    service: http://localhost:80
  - service: http_status:404
```

**Option B: Using Your Own Domain**
```yaml
tunnel: cab-booking
credentials-file: /Users/username/.cloudflared/<UUID>.json
logfile: /var/log/cloudflared.log
loglevel: info

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

**Note on Windows paths**: Use forward slashes in config.yml even on Windows:
```yaml
credentials-file: C:/Users/YourUsername/.cloudflared/UUID.json
```

---

## Step 5: Start the Tunnel

### Option A: One-time run
```powershell
cloudflared tunnel run cab-booking
```

Output should show:
```
INF Connection error ... retrying...
INF ... registered tunnel connection ...
```

This means it's connecting! Keep terminal open.

### Option B: Run as Service (Background)

**Windows:**
```powershell
cloudflared service install
cloudflared service start
```

View logs:
```powershell
# Check status
cloudflared service status

# View logs
Get-EventLog -LogName Application | Select-Object -Last 10
```

---

## Step 6: Route Traffic to Tunnel

This step depends on whether you used a custom domain or free subdomain:

### If using Cloudflare-managed domain:
1. Go to: https://dash.cloudflare.com/
2. Find your tunnel: **Access** > **Tunnels**
3. Click your tunnel > **Public Hostname** > Add public hostname
4. Subdomain: `api`
5. Domain: (select your domain)
6. Service: `http://localhost:80`

### If using custom domain:
1. Go to: https://dash.cloudflare.com/
2. Navigate to your domain's DNS settings
3. Add CNAME record:
   - Name: `api`
   - Target: `<UUID>.cfargotunnel.com`
   - Proxy status: **Proxied** (orange)

---

## Step 7: Test Your Deployment

Whichever method you chose, your app is now live! Test with:

```powershell
# Test health endpoint
curl https://api.yourdomain-or-subdomain.com/health

# Test API endpoints
curl https://api.yourdomain-or-subdomain.com/api/users/register

# Share with friends!
# https://api.yourdomain-or-subdomain.com
```

---

## Complete URL Examples

After setup, your public URLs will be:

| Endpoint | URL |
|----------|-----|
| Health Check | `https://api.yourdomain.com/health` |
| Register User | `https://api.yourdomain.com/api/users/register` |
| Login | `https://api.yourdomain.com/api/users/login` |
| Book Ride | `https://api.yourdomain.com/api/rides` |
| Accept Ride | `https://api.yourdomain.com/api/rides/accept` |
| Driver WebSocket | `wss://api.yourdomain.com/ws` |

---

## Troubleshooting

### Tunnel not connecting
```powershell
# Check if K8s is running
kubectl get pods -n cab-system

# Check if API Gateway is listening
kubectl port-forward svc/api-gateway 8080:80 -n cab-system
# Then test: curl http://localhost:8080/health
```

### Getting 502 Bad Gateway
- Ensure API Gateway pod is running: `kubectl get pods -n cab-system`
- Check logs: `kubectl logs -f deployment/api-gateway -n cab-system`
- Verify service: `kubectl get svc api-gateway -n cab-system`

### Credentials file not found
```powershell
# Find credentials
Get-ChildItem ~/.cloudflared/

# Should see: <UUID>.json
```

### Port already in use
The tunnel connects via HTTPS (port 443, standard), not localhost port. If tunnel runs, you're good!

---

## Advanced: Protect with Cloudflare Access

Want to add authentication?

1. Go to: https://dash.cloudflare.com/
2. **Access** > **Applications** > **Create**
3. Add your tunnel subdomain
4. Add allowed emails
5. Users must authenticate before accessing

---

## Keep Tunnel Running

### Option 1: Keep Terminal Open
Run `cloudflared tunnel run cab-booking` and keep terminal running

### Option 2: Background Service (Windows)
```powershell
cloudflared service install
cloudflared service start
```

The service will auto-start on reboot!

---

## Share Your App

Once live, share the URL:
```
🔗 https://api.yourdomain.com
```

Your Cab Booking System is now **LIVE & PUBLIC**! 🚀

---

## Useful Commands

```powershell
# List all tunnels
cloudflared tunnel list

# View tunnel details
cloudflared tunnel info cab-booking

# Delete tunnel
cloudflared tunnel delete cab-booking

# Run with debug logs
cloudflared tunnel run cab-booking --loglevel debug

# Check tunnel status
cloudflared tunnel validate cab-booking
```

---

## NEXT STEPS

1. ✅ Deploy K8s (`deploy.ps1`)
2. ✅ Start Cloudflare Tunnel (`cloudflared tunnel run cab-booking`)
3. ✅ Get public URL
4. ✅ Share with the world! 🌍
