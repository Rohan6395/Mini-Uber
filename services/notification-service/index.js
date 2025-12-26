const amqp = require('amqplib');

async function connectRabbit() {
  const connection = await amqp.connect('amqp://rabbitmq');
  const channel = await connection.createChannel();
  await channel.assertQueue('NOTIFICATIONS');

  channel.consume('NOTIFICATIONS', (message) => {
    const msg = JSON.parse(message.content.toString());
    console.log(`📨 Notification Received: ${msg.type}`);
    console.log(msg.payload);
    channel.ack(message);
  });
}

connectRabbit();

