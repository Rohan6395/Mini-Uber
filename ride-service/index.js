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

app.post('/book', async (req, res) => {
  const rideData = req.body;
  // Send notification
  await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
    type: 'RIDE_BOOKED',
    payload: rideData,
  })));

  res.send({ message: 'Ride booked successfully!' });
});

app.listen(5002, () => {
  console.log('Ride service running on port 5002');
});
