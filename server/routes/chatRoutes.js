const express = require('express');
const router = express.Router();
const memoryService = require('../services/memoryService');

router.post('/', async (req, res) => {
  try {
    const { customerId, message, conversationId } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty.'
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId is required.'
      });
    }

    const result = await memoryService.processSupportTurn({
      customerId,
      message,
      conversationId
    });

    if (!result.success && result.error) {
      return res.status(503).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[ChatRoute] Error:', err.message);
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: err.message || 'An error occurred while processing your request.'
    });
  }
});

module.exports = router;
