const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

let notifications = []; // In-memory storage
let notificationIdCounter = 1;

async function connectRabbit(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqp.connect('amqp://rabbitmq');
      const channel = await connection.createChannel();
      await channel.assertQueue('NOTIFICATIONS');

      channel.consume('NOTIFICATIONS', (message) => {
        try {
          const msg = JSON.parse(message.content.toString());
          console.log(`📨 Notification Received: ${msg.type}`);
          console.log(msg.payload);
          
          // Extract message and userId from payload
          let notificationMessage = msg.payload?.message;
          let userId = msg.payload?.userId;
          
          // If message is not directly in payload, construct it from type
          if (!notificationMessage) {
            switch(msg.type) {
              case 'RIDE_BOOKED':
                notificationMessage = `Ride #${msg.payload?.ride?.id || 'N/A'} has been booked!`;
                userId = msg.payload?.ride?.userId || msg.payload?.userId;
                break;
              case 'PAYMENT_SUCCESS':
                notificationMessage = `Payment of $${msg.payload?.payment?.amount || msg.payload?.amount || '0'} was successful!`;
                userId = msg.payload?.payment?.userId || msg.payload?.userId;
                break;
              case 'DRIVER_REGISTERED':
                notificationMessage = `Driver ${msg.payload?.driver?.name || 'N/A'} has been registered!`;
                userId = msg.payload?.driverId || msg.payload?.userId;
                break;
              case 'USER_REGISTERED':
                notificationMessage = `Welcome ${msg.payload?.user?.name || 'User'}! Account created successfully.`;
                userId = msg.payload?.user?.id || msg.payload?.userId;
                break;
              case 'USER_LOGIN':
                notificationMessage = `Welcome back ${msg.payload?.user?.name || 'User'}!`;
                userId = msg.payload?.user?.id || msg.payload?.userId;
                break;
              case 'DRIVER_ASSIGNED':
                notificationMessage = `Driver assigned to your ride!`;
                userId = msg.payload?.ride?.userId || msg.payload?.userId;
                break;
              case 'RIDE_STARTED':
                notificationMessage = `Your ride has started!`;
                userId = msg.payload?.ride?.userId || msg.payload?.userId;
                break;
              case 'RIDE_COMPLETED':
                notificationMessage = `Your ride has been completed!`;
                userId = msg.payload?.ride?.userId || msg.payload?.userId;
                break;
              default:
                notificationMessage = `Notification: ${msg.type}`;
                userId = msg.payload?.userId;
            }
          }
          
          // Store notification
          const notification = {
            id: notificationIdCounter++,
            type: msg.type || 'info',
            message: notificationMessage,
            payload: msg.payload,
            userId: userId,
            read: false,
            timestamp: new Date().toISOString()
          };
          notifications.push(notification);
          
          console.log(`✅ Notification stored: ${notification.message}`);
          channel.ack(message);
        } catch (error) {
          console.error('Error processing notification:', error);
          channel.nack(message, false, false); // Reject and don't requeue
        }
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

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Notification service is running', status: 'ok' });
});

app.post('/send', (req, res) => {
  const { userId, message, type } = req.body;
  const notification = {
    id: notificationIdCounter++,
    userId,
    message,
    type: type || 'info',
    read: false,
    timestamp: new Date().toISOString()
  };
  
  notifications.push(notification);
  res.json({ message: 'Notification sent!', notification });
});

app.get('/notifications', (req, res) => {
  res.json(notifications);
});

app.listen(5004, () => {
  console.log('Notification service running on port 5004');
});
