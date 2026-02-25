const express = require('express');
const amqp = require('amqplib');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { v4: uuid } = require('uuid');

const app = express();
app.use(express.json());

// =====================
// PostgreSQL
// =====================
const pool = new Pool({
  host: 'postgres',
  user: 'admin',
  password: 'admin',
  database: 'appdb'
});

// =====================
// Redis
// =====================
const redis = new Redis({ host: 'redis', port: 6379 });

// =====================
// RabbitMQ
// =====================
let channel, connection;

async function connectRabbit() {
  while (true) {
    try {
      connection = await amqp.connect('amqp://rabbitmq');
      channel = await connection.createChannel();

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

      console.log('🐰 RabbitMQ connected (Ride Service)');
      break;
    } catch (err) {
      console.error('RabbitMQ connection failed, retrying...');
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

connectRabbit();

// =====================
// Pickup → Zone mapping
// =====================
const PICKUP_TO_ZONE = {
  'HSR': 'HSR_LAYOUT',
  'HSR Layout': 'HSR_LAYOUT',
  'BTM': 'BTM_LAYOUT',
  'BTM Layout': 'BTM_LAYOUT',
  'Koramangala': 'KORAMANGALA',
  'Indiranagar': 'INDIRANAGAR',
  'Whitefield': 'WHITEFIELD',
  'Electronic City': 'ELECTRONIC_CITY'
};

// =====================
// Ride Booking — store in Redis, publish to Redis Pub/Sub + RabbitMQ
// =====================
app.post('/book', async (req, res) => {
  const { userId, pickup, destination, fare } = req.body;
  // Zone can be sent by UI or auto-resolved from pickup
  let zone = req.body.zone;

  if (!userId || !pickup || !destination || !fare) {
    return res.status(400).json({ error: 'Missing required fields: userId, pickup, destination, fare' });
  }

  // Auto-resolve zone from pickup if not provided
  if (!zone) {
    zone = PICKUP_TO_ZONE[pickup];
  }
  if (!zone) {
    return res.status(400).json({ error: `Cannot resolve zone for pickup: "${pickup}". Valid pickups: ${Object.keys(PICKUP_TO_ZONE).join(', ')}` });
  }

  const rideId = uuid();

  await redis.hmset(`ride:${rideId}`, {
    userId,
    pickup,
    destination,
    fare,
    zone,
    status: 'SEARCHING'
  });

  await redis.expire(`ride:${rideId}`, 300); // 5 min TTL

  // Publish to Redis Pub/Sub for driver-service to pick up
  const rideData = { rideId, userId, pickup, destination, fare, zone };

  await redis.publish('ride_requests', JSON.stringify(rideData));
  console.log(`📢 Published ride ${rideId} to ride_requests channel in zone ${zone}`);

  // Publish RIDE_BOOKED event to RabbitMQ for notification-service
  if (channel) {
    channel.sendToQueue(
      'RIDE_EVENTS_QUEUE',
      Buffer.from(JSON.stringify({
        type: 'RIDE_BOOKED',
        payload: rideData
      })),
      { persistent: true }
    );
    console.log(`📨 RIDE_BOOKED event sent to RIDE_EVENTS_QUEUE`);
  }

  res.json({ message: 'Searching drivers...', rideId, zone });
});

// =====================
// Accept Ride — atomic lock, persist to PostgreSQL, notify
// =====================
app.post('/accept', async (req, res) => {
  const { rideId, driverId } = req.body;

  if (!rideId || !driverId) {
    return res.status(400).json({ error: 'Missing rideId or driverId' });
  }

  // SETNX for atomic lock
  const lock = await redis.setnx(`ride:${rideId}:lock`, driverId);

  if (lock === 1) {
    const ride = await redis.hgetall(`ride:${rideId}`);

    if (!ride || !ride.userId) {
      return res.status(404).json({ error: 'Ride not found or expired' });
    }

    // Persist to PostgreSQL
    try {
      await pool.query(
        'INSERT INTO rides (id, user_id, driver_id, pickup, destination, fare, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [rideId, ride.userId, driverId, ride.pickup, ride.destination, ride.fare, 'CONFIRMED']
      );
    } catch (dbErr) {
      console.error('DB insert error:', dbErr.message);
    }

    await redis.hset(`ride:${rideId}`, 'status', 'CONFIRMED', 'driverId', driverId);

    // Publish RIDE_CONFIRMED event to RabbitMQ
    if (channel) {
      channel.sendToQueue(
        'RIDE_EVENTS_QUEUE',
        Buffer.from(JSON.stringify({
          type: 'RIDE_CONFIRMED',
          payload: { rideId, driverId, userId: ride.userId, pickup: ride.pickup, destination: ride.destination, fare: ride.fare }
        })),
        { persistent: true }
      );
      console.log(`📨 RIDE_CONFIRMED event sent to RIDE_EVENTS_QUEUE`);
    }

    res.json({ message: 'Ride confirmed', rideId, driverId });
  } else {
    res.status(409).json({ message: 'Ride already taken' });
  }
});

// =====================
// TTL Expiry — listen for expired ride keys
// =====================
const expirySub = new Redis({ host: 'redis', port: 6379 });

expirySub.psubscribe('__keyevent@0__:expired', (err) => {
  if (err) {
    console.error('Failed to subscribe to keyevent expired', err);
  } else {
    console.log('Subscribed to Redis key expiry events');
  }
});

expirySub.on('pmessage', async (pattern, ch, message) => {
  if (message.startsWith('ride:') && !message.includes(':lock')) {
    const rideId = message.split(':')[1];
    console.log(`Ride expired: ${rideId}, notifying user: NO_DRIVER_FOUND`);

    // Publish RIDE_EXPIRED event
    if (channel) {
      channel.sendToQueue(
        'RIDE_EVENTS_QUEUE',
        Buffer.from(JSON.stringify({
          type: 'RIDE_EXPIRED',
          payload: { rideId }
        })),
        { persistent: true }
      );
    }
  }
});

// =====================
// Start
// =====================
app.listen(5002, () => {
  console.log('🚗 Ride service running on port 5002');
});
