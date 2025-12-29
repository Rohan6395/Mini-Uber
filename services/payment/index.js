const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

let channel, connection;
let payments = []; // In-memory storage
let paymentIdCounter = 1;

async function connectRabbit(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      connection = await amqp.connect('amqp://rabbitmq');
      channel = await connection.createChannel();
      await channel.assertQueue('NOTIFICATIONS');
      console.log('Connected to RabbitMQ');
      return;
    } catch (err) {
      console.error(`RabbitMQ connect attempt ${i + 1} failed: ${err.message}`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error('Could not connect to RabbitMQ after retries');
}

connectRabbit();

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Payment service is running', status: 'ok' });
});

app.post('/pay', async (req, res) => {
  const paymentInfo = req.body;
  const payment = {
    id: paymentIdCounter++,
    userId: paymentInfo.userId,
    rideId: paymentInfo.rideId,
    amount: paymentInfo.amount,
    status: 'success',
    timestamp: new Date().toISOString()
  };
  
  payments.push(payment);
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'PAYMENT_SUCCESS',
      payload: {
        userId: payment.userId,
        rideId: payment.rideId,
        message: `Payment of $${payment.amount.toFixed(2)} for Ride #${payment.rideId} was successful!`,
        payment: payment
      },
    })));
  }

  res.json({ message: 'Payment successful!', payment });
});

app.get('/payments', (req, res) => {
  res.json(payments);
});

app.listen(5003, () => {
  console.log('Payment service running on port 5003');
});
