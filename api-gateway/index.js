const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

/**
 * RIDE BOOKING
 * POST /api/rides
 */
app.post('/api/rides', async (req, res) => {
  try {
    const response = await axios.post(
      'http://ride-service:5002/book',
      req.body,
      { timeout: 5000 }
    );

    return res.status(response.status).json(response.data);

  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data.message || 'Ride service error',
        service: 'ride-service'
      });
    }

    if (error.request) {
      return res.status(503).json({
        message: 'Ride service unavailable',
        service: 'ride-service'
      });
    }

    return res.status(500).json({
      message: 'Internal gateway error'
    });
  }
});


/**
 * PAYMENT
 * POST /api/payments
 */
app.post('/api/payments', async (req, res) => {
  try {
    const response = await axios.post(
      'http://payment-service:5003/pay',
      req.body,
      { timeout: 5000 }
    );

    return res.status(response.status).json(response.data);

  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data.message || 'Payment service error',
        service: 'payment-service'
      });
    }

    if (error.request) {
      return res.status(503).json({
        message: 'Payment service unavailable',
        service: 'payment-service'
      });
    }

    return res.status(500).json({
      message: 'Internal gateway error'
    });
  }
});


app.listen(80, () => {
  console.log('🚀 API Gateway running on port 80');
});
