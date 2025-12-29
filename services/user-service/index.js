const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

// In-memory storage
let users = [];
let drivers = [];
let userIdCounter = 1;
let driverIdCounter = 1;

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

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'User Service is running 🚀', status: 'ok' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Simple authentication (in production, use proper hashing)
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate a simple token (in production, use JWT)
  const token = `token_${user.id}_${Date.now()}`;
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'USER_LOGIN',
      payload: {
        userId: user.id,
        message: `Welcome back ${user.name}! You have successfully logged in.`,
        user: { id: user.id, name: user.name, email: user.email }
      },
    })));
  }
  
  res.json({ 
    message: 'User logged in successfully!',
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const user = {
    id: userIdCounter++,
    name,
    email,
    password, // In production, hash this
    createdAt: new Date().toISOString()
  };
  
  users.push(user);
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'USER_REGISTERED',
      payload: {
        userId: user.id,
        message: `Welcome ${user.name}! Your account has been created successfully.`,
        user: { id: user.id, name: user.name, email: user.email }
      },
    })));
  }
  
  res.json({ 
    message: 'User registered successfully!',
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post('/drivers/register', async (req, res) => {
  const { name, vehicle } = req.body;
  
  const driver = {
    id: driverIdCounter++,
    name,
    vehicle,
    createdAt: new Date().toISOString()
  };
  
  drivers.push(driver);
  
  // Send notification
  if (channel) {
    await channel.sendToQueue('NOTIFICATIONS', Buffer.from(JSON.stringify({
      type: 'DRIVER_REGISTERED',
      payload: {
        driverId: driver.id,
        message: `Driver ${driver.name} registered successfully with vehicle ${driver.vehicle}. You can now accept ride requests!`,
        driver: driver
      },
    })));
  }
  
  res.json({ 
    message: 'Driver registered successfully!',
    driver
  });
});

app.listen(5001, () => {
  console.log('User service running on port 5001');
});
