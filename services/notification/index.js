const amqp = require('amqplib');

async function connectRabbit(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqp.connect('amqp://rabbitmq');
      const channel = await connection.createChannel();
      await channel.assertQueue('NOTIFICATIONS');

      channel.consume('NOTIFICATIONS', (message) => {
        const msg = JSON.parse(message.content.toString());
        console.log(`📨 Notification Received: ${msg.type}`);
        console.log(msg.payload);
        channel.ack(message);
      });

      console.log('Notification service connected to RabbitMQ');
      return;
    } catch (err) {
      console.error(`RabbitMQ connect attempt ${i + 1} failed: ${err.message}`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error('Notification service could not connect to RabbitMQ after retries');
}

connectRabbit();
