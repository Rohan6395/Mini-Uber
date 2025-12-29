const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Service URLs - use service names for Docker Compose networking
// In Docker, containers communicate using service names, not localhost
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://user-service:5001';
const RIDE_SERVICE = process.env.RIDE_SERVICE_URL || 'http://ride-service:5002';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:5003';
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004';

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API Gateway is running', status: 'ok' });
});

// ========== USER SERVICE ROUTES ==========
app.post('/users/register', async (req, res) => {
  try {
    const result = await axios.post(`${USER_SERVICE}/register`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Registration failed' 
    });
  }
});

app.post('/users/login', async (req, res) => {
  try {
    const result = await axios.post(`${USER_SERVICE}/login`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Login failed' 
    });
  }
});

app.get('/users', async (req, res) => {
  try {
    const result = await axios.get(`${USER_SERVICE}/`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch users' 
    });
  }
});

// ========== RIDE SERVICE ROUTES ==========
app.post('/api/ride/book', async (req, res) => {
  try {
    const result = await axios.post(`${RIDE_SERVICE}/book`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Ride booking failed' 
    });
  }
});

app.post('/rides', async (req, res) => {
  try {
    const result = await axios.post(`${RIDE_SERVICE}/book`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Ride booking failed' 
    });
  }
});

app.get('/rides', async (req, res) => {
  try {
    const result = await axios.get(`${RIDE_SERVICE}/rides`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch rides' 
    });
  }
});

app.get('/rides/available', async (req, res) => {
  try {
    const result = await axios.get(`${RIDE_SERVICE}/rides/available`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch available rides' 
    });
  }
});

app.post('/rides/assign', async (req, res) => {
  try {
    const result = await axios.post(`${RIDE_SERVICE}/assign`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to assign driver' 
    });
  }
});

app.post('/rides/start', async (req, res) => {
  try {
    const result = await axios.post(`${RIDE_SERVICE}/start`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to start ride' 
    });
  }
});

app.post('/rides/complete', async (req, res) => {
  try {
    const result = await axios.post(`${RIDE_SERVICE}/complete`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to complete ride' 
    });
  }
});

// ========== PAYMENT SERVICE ROUTES ==========
app.post('/api/payment/pay', async (req, res) => {
  try {
    const result = await axios.post(`${PAYMENT_SERVICE}/pay`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Payment failed' 
    });
  }
});

app.post('/payments', async (req, res) => {
  try {
    const result = await axios.post(`${PAYMENT_SERVICE}/pay`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Payment failed' 
    });
  }
});

app.get('/payments', async (req, res) => {
  try {
    const result = await axios.get(`${PAYMENT_SERVICE}/payments`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch payments' 
    });
  }
});

// ========== NOTIFICATION SERVICE ROUTES ==========
app.post('/notifications', async (req, res) => {
  try {
    const result = await axios.post(`${NOTIFICATION_SERVICE}/send`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to send notification' 
    });
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const result = await axios.get(`${NOTIFICATION_SERVICE}/notifications`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch notifications' 
    });
  }
});

// ========== DRIVER SERVICE ROUTES ==========
app.post('/drivers', async (req, res) => {
  try {
    const result = await axios.post(`${USER_SERVICE}/drivers/register`, req.body);
    res.json(result.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Driver registration failed' 
    });
  }
});

app.listen(80, () => {
  console.log('API Gateway running on port 80');
});
