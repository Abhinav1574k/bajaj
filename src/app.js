const express = require('express');
const cors = require('cors');
require('dotenv').config();

const ticketRoutes = require('./routes/ticketRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());

// Routes
app.use('/tickets', ticketRoutes);

// Health check / welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Support Ticket System Backend API!'
  });
});

// Fallback 404 Route for unmatched endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`
  });
});

// Centralized error handler middleware
app.use(errorHandler);

module.exports = app;
