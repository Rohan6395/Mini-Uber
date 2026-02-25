const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

let connection, channel;

async function connectRabbit() {
  while (true) {
    try {
      connection = await amqp.connect('amqp://rabbitmq');
      channel = await connection.createChannel();

      // Ensure event queues exist
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
      error: 'Invalid payment data — need paymentId, amount, userId'
    });
  }

  try {
    if (!channel) {
      return res.status(503).json({
        error: 'Payment service temporarily unavailable'
      });
    }

    const event = {
      type: 'PAYMENT_SUCCESS',
      payload: {
        paymentId,
        amount,
        userId
      }
    };

    // Send to PAYMENT_EVENTS_QUEUE (notification-service listens to this)
    channel.sendToQueue(
      'PAYMENT_EVENTS_QUEUE',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    console.log(`💳 PAYMENT_SUCCESS event sent to PAYMENT_EVENTS_QUEUE for user ${userId}`);

    res.status(200).json({
      message: 'Payment processed successfully',
      paymentId,
      amount,
      userId
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
