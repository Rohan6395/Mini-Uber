const express = require('express');
const amqp = require('amqplib');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

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
// RabbitMQ
// =====================
let channel;

async function connectRabbit(retries = 10) {
  while (retries) {
    try {
      const connection = await amqp.connect('amqp://rabbitmq');
      channel = await connection.createChannel();

      // Ensure standard event queues + DLQs exist
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

      console.log('🐰 RabbitMQ connected (User Service)');
      return;

    } catch (err) {
      console.log('⏳ RabbitMQ not ready, retrying...');
      retries--;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  throw new Error('❌ RabbitMQ connection failed');
}

// =====================
// APIs
// =====================

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id',
      [email, hash]
    );

    channel.sendToQueue(
      'USER_EVENTS_QUEUE',
      Buffer.from(JSON.stringify({
        type: 'USER_REGISTERED',
        payload: {
          userId: result.rows[0].id,
          email
        }
      })),
      { persistent: true }
    );

    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(409).json({ error: 'User already exists' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    'SELECT * FROM users WHERE email=$1',
    [email]
  );

  if (!result.rows.length)
    return res.status(401).json({ error: 'Invalid credentials' });

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid)
    return res.status(401).json({ error: 'Invalid credentials' });

  channel.sendToQueue(
    'USER_EVENTS_QUEUE',
    Buffer.from(JSON.stringify({
      type: 'USER_LOGGED_IN',
      payload: { userId: user.id }
    })),
    { persistent: true }
  );

  res.json({ message: 'Login successful' });
});

// =====================
// Startup
// =====================
async function start() {
  try {
    await connectRabbit();
    app.listen(5001, () =>
      console.log('👤 User Service running on port 5001')
    );
  } catch (err) {
    console.error('❌ Failed to start User Service', err);
    process.exit(1);
  }
}

start();
