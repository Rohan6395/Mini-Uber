const express = require('express');
const app = express();
app.use(express.json());

app.post('/login', (req, res) => {
  res.send({ message: 'User logged in successfully!' });
});

app.post('/register', (req, res) => {
  res.send({ message: 'User registered successfully!' });
});

app.listen(5001, () => {
  console.log('User service running on port 5001');
});
