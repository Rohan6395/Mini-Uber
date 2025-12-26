const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

let channel, connection;

async function connectRabbit() {
  connection = await amqp.connect('amqp://rabbitmq');
  channel = await connection.createChannel();
  await channel.assertQueue('NOTIFICATIONS');
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
