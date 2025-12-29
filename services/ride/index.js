const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

let channel, connection;
let rides = []; // In-memory storage
let rideIdCounter = 1;

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
  res.json({ message: 'Ride service is running', status: 'ok' });
});

app.post('/book', async (req, res) => {
  const rideData = req.body;
  const ride = {
    id: rideIdCounter++,
    userId: rideData.userId,
    from: rideData.from,
    to: rideData.to,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  rides.push(ride);
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'RIDE_BOOKED',
      payload: {
        userId: ride.userId,
        message: `Ride #${ride.id} booked successfully! From ${ride.from} to ${ride.to}. Waiting for driver assignment...`,
        ride: ride
      },
    })));
  }

  res.json({ message: 'Ride booked successfully!', ride });
});

app.get('/rides', (req, res) => {
  res.json(rides);
});

app.get('/rides/available', (req, res) => {
  const availableRides = rides.filter(r => r.status === 'pending' && !r.driverId);
  res.json(availableRides);
});

app.post('/assign', async (req, res) => {
  const { rideId } = req.body;
  const ride = rides.find(r => r.id === parseInt(rideId));
  
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  
  ride.driverId = `driver_${Math.floor(Math.random() * 1000)}`;
  ride.status = 'assigned';
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'DRIVER_ASSIGNED',
      payload: {
        userId: ride.userId,
        message: `Driver has been assigned to your Ride #${ride.id}! Your driver will arrive shortly.`,
        ride: ride
      },
    })));
  }
  
  res.json({ message: 'Driver assigned successfully!', ride });
});

app.post('/start', async (req, res) => {
  const { rideId } = req.body;
  const ride = rides.find(r => r.id === parseInt(rideId));
  
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  
  ride.status = 'active';
  ride.startedAt = new Date().toISOString();
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'RIDE_STARTED',
      payload: {
        userId: ride.userId,
        message: `Your Ride #${ride.id} has started! Enjoy your trip from ${ride.from} to ${ride.to}.`,
        ride: ride
      },
    })));
  }
  
  res.json({ message: 'Ride started!', ride });
});

app.post('/complete', async (req, res) => {
  const { rideId } = req.body;
  const ride = rides.find(r => r.id === parseInt(rideId));
  
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  
  ride.status = 'completed';
  ride.completedAt = new Date().toISOString();
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'RIDE_COMPLETED',
      payload: {
        userId: ride.userId,
        message: `Your Ride #${ride.id} has been completed! Thank you for using CabNet.`,
        ride: ride
      },
    })));
  }
  
  res.json({ message: 'Ride completed!', ride });
});

app.listen(5002, () => {
  console.log('Ride service running on port 5002');
});
