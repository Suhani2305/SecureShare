import express from 'express';
import { db } from '../db';

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check
router.get('/db', async (req, res) => {
  try {
    // Try to query the database
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ 
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 