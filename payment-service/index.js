const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

let connection, channel;
const QUEUE = 'NOTIFICATIONS';

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

      await channel.assertQueue(QUEUE, { durable: true });
      console.log('✅ RabbitMQ connected (Payment Service)');
      break;
    } catch (err) {
      console.error('❌ RabbitMQ connection failed, retrying...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

connectRabbit();

app.post('/pay', async (req, res) => {
  const { paymentId, amount, userId } = req.body;

  if (!paymentId || !amount || !userId) {
    return res.status(400).json({
      error: 'Invalid payment data'
    });
  }

  try {
    if (!channel) {
      return res.status(503).json({
        error: 'Payment service temporarily unavailable'
      });
    }

    // 🔹 Payment logic would go here (DB, gateway, etc.)

    const event = {
      type: 'PAYMENT_SUCCESS',
      payload: {
        paymentId,
        amount,
        userId
      }
    };

    channel.sendToQueue(
      QUEUE,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    res.status(200).json({
      message: 'Payment processed successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Payment failed'
    });
  }
});

process.on('SIGINT', async () => {
  console.log('🔻 Closing Payment Service connections...');
  await channel?.close();
  await connection?.close();
  process.exit(0);
});

app.listen(5003, () => {
  console.log('💳 Payment service running on port 5003');
});
