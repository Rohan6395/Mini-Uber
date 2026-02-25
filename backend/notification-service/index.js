const amqp = require('amqplib');

const QUEUES = [
  'USER_EVENTS_QUEUE',
  'RIDE_EVENTS_QUEUE',
  'PAYMENT_EVENTS_QUEUE'
];

async function connectRabbit(retries = 10) {
  while (retries) {
    try {
      const connection = await amqp.connect('amqp://rabbitmq');
      const channel = await connection.createChannel();

      // Process one message at a time
      channel.prefetch(1);

      console.log('📩 Notification Service started');

      for (const queue of QUEUES) {
        console.log(`👂 Listening on ${queue}`);

        // Ensure the queue exists on startup so consumers don't fail
        const dlqName = `${queue}_DLQ`;
        await channel.assertQueue(dlqName, { durable: true });
        await channel.assertQueue(queue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': dlqName
          }
        });

        channel.consume(queue, async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString());

            console.log(`📨 ${queue} → ${event.type}`);
            console.log(event.payload);

            // 👉 email / sms / push logic goes here

            channel.ack(msg);
          } catch (err) {
            console.error('❌ Processing failed, sending to DLQ');
            channel.nack(msg, false, false); // goes to DLQ
          }
        });

/////     this i was trying to make the registration forcely pushing into DLQ judt to see them in noticafication logs
/// if u want to test u can comment out them and follow these commands -- >docker compose build notification-service
////                  docker compose up -d notification-service



        // channel.consume(queue, async (msg) => {
        //   if (!msg) return;

        //   try {
        //     const event = JSON.parse(msg.content.toString());

        //     console.log(`📨 ${queue} → ${event.type}`);

        //     // 💥 Force failure for demo
        //     if (event.type === 'USER_REGISTERED') {
        //       throw new Error('Simulated Failure');
        //     }

        //     channel.ack(msg);

        //   } catch (err) {
        //     console.error('❌ FAILED → sending to DLQ');
        //     channel.nack(msg, false, false); // ❗ goes to DLQ
        //   }
        // });
      }

      return;

    } catch (err) {
      console.log('⏳ RabbitMQ not ready, retrying...');
      retries--;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  throw new Error('❌ RabbitMQ connection failed');
}

connectRabbit();
