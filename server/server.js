const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { startLocalHindsight } = require('./services/localHindsightServer');
const hindsightService = require('./services/hindsightService');
const { seedDatabase } = require('./database/seed');
const dbService = require('./database/db');

const chatRoutes = require('./routes/chatRoutes');
const customerRoutes = require('./routes/customerRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const memoryRoutes = require('./routes/memoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const hindsightHealth = await hindsightService.checkConnection();
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected (SQLite node:sqlite)',
      hindsight: {
        status: hindsightHealth.connected ? 'connected' : 'unavailable',
        version: hindsightHealth.version || null,
        url: hindsightHealth.baseUrl
      },
      groq: {
        status: hasGroqKey ? 'configured' : 'missing_api_key',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
      }
    }
  });
});

// Root ping
app.get('/', (req, res) => {
  res.json({
    name: 'SupportBrain Backend API',
    tagline: 'Support that remembers.',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred.'
  });
});

// Start server
async function start() {
  // Auto-start local Hindsight engine if enabled or in local dev
  const baseUrl = process.env.HINDSIGHT_BASE_URL || 'http://localhost:8888';
  const autoStart = process.env.HINDSIGHT_AUTO_START_LOCAL !== 'false';

  if (autoStart && baseUrl.includes('localhost:8888')) {
    try {
      await startLocalHindsight(8888);
    } catch (err) {
      console.warn('[Server] Could not start local Hindsight server:', err.message);
    }
  }

  // Ensure initial seed data exists if database is empty
  const customers = dbService.getAllCustomers();
  if (!customers || customers.length === 0) {
    console.log('[Server] Seeding initial demo data...');
    seedDatabase();
  }

  // Seed initial memory for Hari in Hindsight so returning customer demo is instant
  try {
    console.log('[Server] Ensuring demo memories initialized for Hari in Hindsight...');
    await hindsightService.retainCustomerMemory('CUST-001', {
      problem: 'Payment failure',
      solution: 'Payment retry',
      outcome: 'Successful',
      notes: 'Customer retried payment with 3D Secure verification successfully.',
      tags: ['payment', 'billing']
    });
  } catch (err) {
    console.warn('[Server] Memory pre-seeding note:', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🧠 SupportBrain Backend running on http://localhost:${PORT}`);
    console.log(`   Memory Engine: Hindsight (${baseUrl})`);
    console.log(`   AI Engine:     Groq (${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'})`);
    console.log(`====================================================`);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
