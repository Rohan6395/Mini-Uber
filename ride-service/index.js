const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

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

app.post('/book', async (req, res) => {
  if (!channel) {
    return res.status(503).json({
      error: 'Notification service unavailable'
    });
  }

  try {
    // Save ride to DB here (important!)
    
    channel.sendToQueue(
      'NOTIFICATIONS',
      Buffer.from(JSON.stringify({
        type: 'RIDE_BOOKED',
        payload: req.body
      })),
      { persistent: true }
    );

    res.status(201).json({ message: 'Ride booked' });

  } catch (err) {
    res.status(500).json({ error: 'Ride booking failed' });
  }
});

  
app.listen(5002, () => {
  console.log('Ride service running on port 5002');
});
