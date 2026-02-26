const express = require('express');
const Redis = require('ioredis');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

// =====================
// Health Check
// =====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'driver-service' });
});

const redis = new Redis({ host: 'redis', port: 6379 });

// =====================
// REST endpoints for driver status (via API Gateway)
// =====================

// Go Online
app.post('/driver/go-online', async (req, res) => {
  const { driverId, zone } = req.body;
  await redis.sadd(`zone:${zone}`, driverId);
  await redis.set(`driver:${driverId}:status`, 'online');
  await redis.set(`driver:${driverId}:zone`, zone);
  res.json({ message: 'Driver online', driverId, zone });
});

// Go Offline
app.post('/driver/go-offline', async (req, res) => {
  const { driverId } = req.body;
  const zone = await redis.get(`driver:${driverId}:zone`);
  if (zone) await redis.srem(`zone:${zone}`, driverId);
  await redis.del(`driver:${driverId}:status`);
  await redis.del(`driver:${driverId}:zone`);
  res.json({ message: 'Driver offline', driverId });
});


// =====================
// WebSocket server on port 7001
// =====================
const wss = new WebSocket.Server({ port: 7001 });
console.log('Driver WS running on 7001');

wss.on('connection', (ws, req) => {
  console.log('Driver Connected');

  ws.on('message', async (msg) => {
    const data = JSON.parse(msg);

    // DRIVER GO ONLINE
    if (data.type === 'ONLINE') {
      const { driverId, zone } = data;
      await redis.sadd(`zone:${zone}`, driverId);
      await redis.set(`driver:${driverId}:zone`, zone);
      await redis.set(`driver:${driverId}:socket`, driverId);
      ws.driverId = driverId;
      console.log(`Driver ${driverId} online in ${zone}`);
    }

    // DRIVER GO OFFLINE
    if (data.type === 'OFFLINE') {
      if (ws.driverId) {
        const zone = await redis.get(`driver:${ws.driverId}:zone`);
        if (zone) await redis.srem(`zone:${zone}`, ws.driverId);
        console.log(`Driver ${ws.driverId} offline`);
      }
    }

    // DRIVER ACCEPT RIDE (atomic lock via Redis SETNX)
    if (data.type === 'ACCEPT_RIDE') {
      const { rideId, driverId } = data;
      const lock = await redis.setnx(`ride:${rideId}:lock`, driverId);

      if (lock === 1) {
        await redis.hset(`ride:${rideId}`, 'status', 'BOOKED', 'driverId', driverId);

        ws.send(JSON.stringify({
          type: 'RIDE_CONFIRMED',
          rideId
        }));

        // Notify other drivers that the ride is taken
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'RIDE_REJECTED',
              rideId
            }));
          }
        });

        console.log(`Ride ${rideId} booked by ${driverId}`);
      } else {
        ws.send(JSON.stringify({
          type: 'RIDE_ALREADY_TAKEN',
          rideId
        }));
      }
    }
  });

  ws.on('close', async () => {
    if (ws.driverId) {
      const zone = await redis.get(`driver:${ws.driverId}:zone`);
      if (zone) await redis.srem(`zone:${zone}`, ws.driverId);
      console.log(`Driver ${ws.driverId} offline`);
    }
  });
});


// =====================
// Redis Pub/Sub — Listen for ride requests and broadcast to drivers
// =====================
const sub = new Redis({ host: 'redis', port: 6379 });

sub.subscribe('ride_requests');

sub.on('message', async (_, message) => {
  const ride = JSON.parse(message);
  console.log(`New ride request in zone ${ride.zone}:`, ride.rideId);

  // Find all drivers in the ride's zone
  const drivers = await redis.smembers(`zone:${ride.zone}`);

  drivers.forEach(driverId => {
    wss.clients.forEach(client => {
      if (client.driverId === driverId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'NEW_RIDE',
          ride
        }));
      }
    });
  });
});


// =====================
// HTTP server on port 7002
// =====================
app.listen(7002, () => {
  console.log('Driver service HTTP running on port 7002');
});
