const express = require('express');
const router = express.Router();
const dbService = require('../database/db');

// GET all customers
router.get('/', (req, res) => {
  try {
    const customers = dbService.getAllCustomers();
    const enriched = customers.map(cust => {
      const convs = dbService.getConversationsByCustomer(cust.id);
      const recurring = dbService.getRecurringIssues(cust.id);
      const lastConv = convs[0];

      return {
        ...cust,
        conversationCount: convs.length,
        knownIssues: recurring.map(r => r.issue_type).join(', ') || (lastConv?.issue_summary || 'None recorded'),
        lastInteraction: lastConv?.updated_at || cust.created_at,
        status: convs.some(c => c.status === 'active') ? 'Active In Support' : 'Idle'
      };
    });

    res.json({
      success: true,
      customers: enriched
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single customer profile
router.get('/:id', (req, res) => {
  try {
    const cust = dbService.getCustomerById(req.params.id);
    if (!cust) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const convs = dbService.getConversationsByCustomer(cust.id);
    const recurring = dbService.getRecurringIssues(cust.id);
    const lastConv = convs[0];

    res.json({
      success: true,
      customer: {
        ...cust,
        previousConversations: convs.length,
        knownIssues: recurring.map(r => r.issue_type).join(', ') || (lastConv?.issue_summary || 'None recorded'),
        lastInteraction: lastConv?.updated_at ? new Date(lastConv.updated_at).toLocaleDateString() : 'Recently',
        recurringIssues: recurring,
        isDemoData: true
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
