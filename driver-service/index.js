const express = require('express');
const Redis = require('ioredis');
const WebSocket = require('ws');
const app = express();
app.use(express.json());

const redis = new Redis({ host: 'redis', port: 6379 });

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
  await redis.srem(`zone:${zone}`, driverId);
  await redis.del(`driver:${driverId}:status`);
  await redis.del(`driver:${driverId}:zone`);
  res.json({ message: 'Driver offline', driverId });
});

// WebSocket server for driver connections
const wss = new WebSocket.Server({ port: 7001 });
console.log('Driver WS running on 7001');
wss.on('connection', (ws, req) => {
  console.log('Driver Connected');
  ws.on('message', async (msg) => {
    const data = JSON.parse(msg);
    if (data.type === 'ONLINE') {
      const { driverId, zone } = data;
      await redis.sadd(`zone:${zone}`, driverId);
      await redis.set(`driver:${driverId}:zone`, zone);
      ws.driverId = driverId;
      console.log(`Driver ${driverId} online in ${zone}`);
    }
    if (data.type === 'OFFLINE') {
      if (ws.driverId) {
        const zone = await redis.get(`driver:${ws.driverId}:zone`);
        await redis.srem(`zone:${zone}`, ws.driverId);
        console.log(`Driver ${ws.driverId} offline`);
      }
    }
  });
  ws.on('close', async () => {
    if (ws.driverId) {
      const zone = await redis.get(`driver:${ws.driverId}:zone`);
      await redis.srem(`zone:${zone}`, ws.driverId);
      console.log(`Driver ${ws.driverId} offline`);
    }
  });
});

app.listen(7002, () => {
  console.log('Driver service running on port 7002');
});
