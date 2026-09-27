const express = require('express');
const router = express.Router();
const hindsightService = require('../services/hindsightService');
const memoryService = require('../services/memoryService');

// GET all Hindsight memories for a customer
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await memoryService.getCustomerMemories(customerId);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST manually retain a memory into Hindsight
router.post('/:customerId/retain', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { problem, solution, outcome, notes, tags } = req.body || {};

    if (!problem || !solution) {
      return res.status(400).json({ success: false, error: 'problem and solution are required.' });
    }

    const result = await hindsightService.retainCustomerMemory(customerId, {
      problem,
      solution,
      outcome: outcome || 'Successful',
      notes,
      tags
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST direct recall query test against Hindsight
router.post('/:customerId/recall', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { query } = req.body || {};

    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required.' });
    }

    const result = await hindsightService.recallCustomerMemory(customerId, query);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
