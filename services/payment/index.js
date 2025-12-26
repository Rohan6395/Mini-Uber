const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

let channel, connection;

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

app.post('/pay', async (req, res) => {
  const paymentInfo = req.body;
  // Send notification
  await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
    type: 'PAYMENT_SUCCESS',
    payload: paymentInfo,
  })));

  res.send({ message: 'Payment successful!' });
});

app.listen(5003, () => {
  console.log('Payment service running on port 5003');
});
