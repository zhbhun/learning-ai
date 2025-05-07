const express = require('express');
const app = express();
const port = 3000;

// Enable JSON body parsing
app.use(express.json());

// Simple GET endpoint
app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from the API!' });
});

// POST endpoint
app.post('/api/data', (req, res) => {
  console.log('Received data:', req.body);
  res.json({ 
    status: 'success',
    data: req.body 
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
