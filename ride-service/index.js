const express = require('express');
const amqp = require('amqplib');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
const Redis = require("ioredis");


// PostgreSQL connection
const pool = new Pool({
  host: 'postgres',
  user: 'admin',
  password: 'admin',
  database: 'appdb'
});


// WebSocket broadcast utility (for driver notifications)
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 7001 });
const wsConnections = new Map();

wss.on("connection", (ws, req) => {
  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);
    if (data.type === "ONLINE") {
      ws.driverId = data.driverId;
      ws.zone = data.zone;
      wsConnections.set(ws.driverId, ws);
    }
    if (data.type === "OFFLINE") {
      wsConnections.delete(ws.driverId);
    }
  });
  ws.on("close", () => {
    if (ws.driverId) wsConnections.delete(ws.driverId);
  });
});




let channel, connection;

async function connectRabbit() {
  while (true) {
    try {
      connection = await amqp.connect('amqp://rabbitmq');
      channel = await connection.createChannel();

      // Ensure standard event queues + DLQs exist (don't consume here)
      const QUEUES = [
        'USER_EVENTS_QUEUE',
        'RIDE_EVENTS_QUEUE',
        'PAYMENT_EVENTS_QUEUE'
      ];

      for (const q of QUEUES) {
        const dlq = `${q}_DLQ`;
        await channel.assertQueue(dlq, { durable: true });
        await channel.assertQueue(q, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': dlq
          }
        });
      }

      await channel.assertQueue('NOTIFICATIONS', { durable: true });
      console.log('RabbitMQ connected');
      break;
    } catch (err) {
      console.error('RabbitMQ connection failed, retrying...');
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}


connectRabbit();



const redis = new Redis({ host: "redis", port: 6379 });
const { v4: uuid } = require("uuid");


// Ride request endpoint (store temp ride in Redis, broadcast to drivers)
app.post("/book", async (req, res) => {
  const { userId, pickup, destination, fare, zone } = req.body;
  const rideId = uuid();
  await redis.hmset(`ride:${rideId}`, {
    userId,
    pickup,
    destination,
    fare,
    status: "SEARCHING"
  });
  await redis.expire(`ride:${rideId}`, 300); // 30 sec TTL
  // Broadcast to drivers via Redis Pub/Sub
  await redis.publish("ride_requests", JSON.stringify({
    rideId,
    pickup,
    destination,
    fare,
    zone
  }));
  res.json({ message: "Searching drivers...", rideId });
});

// Accept ride endpoint (atomic lock, persist to Postgres, notify drivers)
app.post("/accept", async (req, res) => {
  const { rideId, driverId } = req.body;
  // SETNX for atomic lock
  const lock = await redis.setnx(`ride:${rideId}:lock`, driverId);
  if (lock === 1) {
    // Winner: persist to Postgres
    const ride = await redis.hgetall(`ride:${rideId}`);
    await pool.query(
      'INSERT INTO rides (id, user_id, driver_id, pickup, destination, fare, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [rideId, ride.userId, driverId, ride.pickup, ride.destination, ride.fare, 'CONFIRMED']
    );
    await redis.hset(`ride:${rideId}`, 'status', 'CONFIRMED', 'driverId', driverId);
    // Notify all drivers (WebSocket)
    wsConnections.forEach((ws, id) => {
      ws.send(JSON.stringify({
        type: id === driverId ? 'RIDE_CONFIRMED' : 'RIDE_REJECTED',
        rideId
      }));
    });
    res.json({ message: 'Ride confirmed', rideId, driverId });
  } else {
    res.status(409).json({ message: 'Ride already taken' });
  }
});

// TTL Expiry Worker: Check for expired rides and notify user
const expirySub = new Redis({ host: "redis", port: 6379 });

expirySub.psubscribe("__keyevent@0__:expired", (err, count) => {
  if (err) {
    console.error("Failed to subscribe to keyevent expired", err);
  } else {
    console.log("Subscribed to Redis key expiry events");
  }
});

expirySub.on("pmessage", async (pattern, channel, message) => {
  if (message.startsWith("ride:")) {
    const rideId = message.split(":")[1];
    // Optionally, check if ride is still in searching state
    // Notify user: No driver found
    console.log(`Ride expired: ${rideId}, notifying user: NO_DRIVER_FOUND`);
    // Here you can publish to a notification queue or update DB as needed
    // Example: channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({ rideId, type: 'NO_DRIVER_FOUND' })));
  }
});

app.listen(5002, () => {
  console.log('Ride service running on port 5002');
});
