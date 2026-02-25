const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// =====================
// CORS — allow all UI origins
// =====================
app.use(cors());
app.use(express.json());

// =====================
// Health check
// =====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', gateway: 'running' });
});

// =====================
// USER SERVICE PROXY
// =====================

// Register
app.post('/api/users/register', async (req, res) => {
  try {
    const response = await axios.post(
      'http://user-service:5001/register',
      req.body,
      { timeout: 5000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleProxyError(error, res, 'user-service');
  }
});

// Login
app.post('/api/users/login', async (req, res) => {
  try {
    const response = await axios.post(
      'http://user-service:5001/login',
      req.body,
      { timeout: 5000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleProxyError(error, res, 'user-service');
  }
});

// =====================
// RIDE SERVICE PROXY
// =====================

// Book a ride
app.post('/api/rides', async (req, res) => {
  try {
    const response = await axios.post(
      'http://ride-service:5002/book',
      req.body,
      { timeout: 5000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleProxyError(error, res, 'ride-service');
  }
});

// Accept a ride
app.post('/api/rides/accept', async (req, res) => {
  try {
    const response = await axios.post(
      'http://ride-service:5002/accept',
      req.body,
      { timeout: 5000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleProxyError(error, res, 'ride-service');
  }
});

// =====================
// PAYMENT SERVICE PROXY
// =====================

app.post('/api/payments', async (req, res) => {
  try {
    const response = await axios.post(
      'http://payment-service:5003/pay',
      req.body,
      { timeout: 5000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleProxyError(error, res, 'payment-service');
  }
});

// =====================
// DRIVER SERVICE PROXY
// =====================

// Go Online
app.post('/api/drivers/go-online', async (req, res) => {
  try {
    const response = await axios.post(
      'http://driver-service:7002/driver/go-online',
      req.body,
      { timeout: 5000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleProxyError(error, res, 'driver-service');
  }
});

// Go Offline
app.post('/api/drivers/go-offline', async (req, res) => {
  try {
    const response = await axios.post(
      'http://driver-service:7002/driver/go-offline',
      req.body,
      { timeout: 5000 }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleProxyError(error, res, 'driver-service');
  }
});


// =====================
// Error handler helper
// =====================
function handleProxyError(error, res, serviceName) {
  if (error.response) {
    return res.status(error.response.status).json({
      message: error.response.data?.message || error.response.data?.error || `${serviceName} error`,
      service: serviceName
    });
  }
  if (error.request) {
    return res.status(503).json({
      message: `${serviceName} unavailable`,
      service: serviceName
    });
  }
  return res.status(500).json({
    message: 'Internal gateway error'
  });
}


app.listen(80, () => {
  console.log('🚀 API Gateway running on port 80');
});
