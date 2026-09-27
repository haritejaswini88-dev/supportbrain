const express = require('express');
const router = express.Router();
const dbService = require('../database/db');

router.get('/', (req, res) => {
  try {
    const stats = dbService.getDashboardStats();
    const recentConversations = dbService.getAllConversations(8);
    const recurringIssues = dbService.getRecurringIssues();
    const customers = dbService.getAllCustomers();

    res.json({
      success: true,
      stats,
      recentConversations,
      recurringIssues,
      customers: customers.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        preferences: c.preferences
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
