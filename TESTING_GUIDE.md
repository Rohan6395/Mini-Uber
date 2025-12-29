# 🧪 Testing Guide - CabNet Application

## Prerequisites
- Docker Desktop must be installed and running
- Ports 3000, 5001-5004, 5672, 15672, 8081-8085 should be available

---

## Step 1: Start All Services

### Open Terminal/PowerShell
Navigate to the Mini-Uber directory:
```bash
cd C:\Users\Asus\Desktop\cabnet\Mini-Uber
```

### Start Docker Compose
```bash
docker-compose up --build
```

**What this does:**
- Builds all Docker images
- Starts all microservices (User, Ride, Payment, Notification)
- Starts RabbitMQ message broker
- Starts API Gateway
- Starts all UI services (5 different UIs)

**Expected Output:**
You should see logs from all services starting up. Wait until you see:
- ✅ All services showing "running" or "listening" messages
- ✅ No error messages (warnings are okay)

**Note:** First time build may take 2-5 minutes. Subsequent starts are faster.

---

## Step 2: Verify Services Are Running

### Check Docker Containers
Open a **new terminal** and run:
```bash
docker ps
```

You should see **11 containers** running:
- rabbitmq
- user-service
- ride-service
- payment-service
- notification-service
- api-gateway
- ui-users
- ui-ride
- ui-driver
- ui-payment
- ui-notification

### Check Service Health
Test the API Gateway:
```bash
curl http://localhost:3000
```
Or open in browser: http://localhost:3000

Should return: `{"message":"API Gateway is running","status":"ok"}`

---

## Step 3: Access the UIs

Open these URLs in your browser:

### 🚖 User Service (Registration/Login)
**URL:** http://localhost:8081

**Test Steps:**
1. Register a new user:
   - Name: `John Doe`
   - Email: `john@example.com`
   - Password: `password123`
   - Click "Register"
   - Check response card for success message

2. Login:
   - Email: `john@example.com`
   - Password: `password123`
   - Click "Sign In"
   - Token should be saved (check browser console/localStorage)

---

### 🚗 Ride Booking Service
**URL:** http://localhost:8082

**Test Steps:**
1. Book a ride:
   - User ID: `1` (from registration)
   - From: `123 Main St, New York`
   - To: `456 Park Ave, New York`
   - Click "Book Ride"
   - Should see success message and ride ID

2. View available rides:
   - Click "Refresh" button
   - Should see your booked ride in the list

3. Manage ride:
   - Enter the Ride ID from step 1
   - Click "Assign Driver" → "Start Ride" → "Complete Ride"
   - Check responses for each action

---

### 👨‍✈️ Driver Dashboard
**URL:** http://localhost:8083

**Test Steps:**
1. Register as driver:
   - Name: `Jane Driver`
   - Vehicle: `Toyota Camry 2020`
   - Click "Register Driver"
   - Note the driver ID from response

2. View available rides:
   - Click "Refresh"
   - Should see pending rides that need drivers
   - Stats should update automatically

---

### 💳 Payment Service
**URL:** http://localhost:8084

**Test Steps:**
1. Make a payment:
   - User ID: `1`
   - Ride ID: `1` (from ride booking)
   - Amount: `25.50`
   - Select payment method
   - Click "Pay Now"
   - Should see success message

2. View payment history:
   - Click "Refresh"
   - Should see your payment in the list
   - Stats should show total amount

---

### 🔔 Notification Service
**URL:** http://localhost:8085

**Test Steps:**
1. Send a notification:
   - User ID: `1`
   - Message: `Your ride has been confirmed!`
   - Select notification type (Info/Success/Warning/Error)
   - Click "Send Notification"
   - Should see success message

2. View notifications:
   - Click "Refresh"
   - Should see:
     - Notifications from ride booking (automatic)
     - Notifications from payment (automatic)
     - Your manually sent notification
   - Stats should update

---

## Step 4: Test Complete Flow

### End-to-End Test Scenario:

1. **Register User** (http://localhost:8081)
   - Register: `Alice Smith`, `alice@test.com`, `pass123`
   - Note the user ID from response (usually 1)

2. **Book Ride** (http://localhost:8082)
   - User ID: `1`
   - From: `Airport Terminal 1`
   - To: `Downtown Hotel`
   - Book the ride
   - Note the ride ID

3. **Check Notifications** (http://localhost:8085)
   - Refresh notifications
   - Should see "RIDE_BOOKED" notification automatically

4. **Register Driver** (http://localhost:8083)
   - Name: `Bob Driver`
   - Vehicle: `Honda Accord 2021`
   - Register

5. **Assign Driver to Ride** (http://localhost:8082)
   - Enter the ride ID from step 2
   - Click "Assign Driver"
   - Click "Start Ride"
   - Click "Complete Ride"

6. **Make Payment** (http://localhost:8084)
   - User ID: `1`
   - Ride ID: `1`
   - Amount: `35.00`
   - Complete payment

7. **Check All Notifications** (http://localhost:8085)
   - Should see:
     - RIDE_BOOKED notification
     - PAYMENT_SUCCESS notification

---

## Step 5: Troubleshooting

### If services don't start:

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **Check for port conflicts:**
   - Make sure ports 3000, 5001-5004, 8081-8085 are not in use
   - Windows: `netstat -ano | findstr :3000`

3. **View logs:**
   ```bash
   docker-compose logs
   ```
   Or for specific service:
   ```bash
   docker-compose logs api-gateway
   docker-compose logs user-service
   ```

4. **Rebuild if needed:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### If UI shows errors:

1. **Check browser console** (F12) for JavaScript errors
2. **Check API Gateway** is accessible: http://localhost:3000
3. **Verify CORS** - API Gateway should have CORS enabled (already done)

### If API calls fail:

1. **Check service connectivity:**
   ```bash
   curl http://localhost:5001
   curl http://localhost:5002
   curl http://localhost:5003
   curl http://localhost:5004
   ```

2. **Check API Gateway routes:**
   ```bash
   curl http://localhost:3000/users/register -X POST -H "Content-Type: application/json" -d "{\"name\":\"Test\",\"email\":\"test@test.com\",\"password\":\"test\"}"
   ```

---

## Step 6: Stop Services

When done testing:
```bash
docker-compose down
```

To remove all containers and volumes:
```bash
docker-compose down -v
```

---

## Quick Test Checklist

- [ ] All 11 containers running (`docker ps`)
- [ ] API Gateway accessible (http://localhost:3000)
- [ ] User registration works (http://localhost:8081)
- [ ] User login works (http://localhost:8081)
- [ ] Ride booking works (http://localhost:8082)
- [ ] Driver registration works (http://localhost:8083)
- [ ] Payment processing works (http://localhost:8084)
- [ ] Notifications appear (http://localhost:8085)
- [ ] End-to-end flow completes successfully

---

## Additional Resources

- **RabbitMQ Management UI:** http://localhost:15672
  - Username: `guest`
  - Password: `guest`
  - Check "Queues" tab to see message flow

- **API Gateway Health:** http://localhost:3000

---

## Notes

- All data is stored in-memory (will reset on service restart)
- Services communicate via RabbitMQ for notifications
- API Gateway routes all requests to appropriate microservices
- UIs are served via Nginx and communicate with API Gateway

Happy Testing! 🚀

