const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// USER → RIDE
app.post('/api/ride/book', async (req, res) => {
  const result = await axios.post(
    'http://ride-service:5002/book',
    req.body
  );
  res.json(result.data);
});

// USER → PAYMENT
app.post('/api/payment/pay', async (req, res) => {
  const result = await axios.post(
    'http://payment-service:5003/pay',
    req.body
  );
  res.json(result.data);
});

app.listen(80, () => {
  console.log('API Gateway running on port 80');
});
