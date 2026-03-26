require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../RIDE-STUDENT')));

// API routes
app.use('/api', routes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'UPC RideConnect API' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('=================================');
  console.log('  UPC RideConnect API');
  console.log('  Port: ' + PORT);
  console.log('  Frontend: http://localhost:' + PORT);
  console.log('  API: http://localhost:' + PORT + '/api');
  console.log('=================================');
});

module.exports = app;
