const express = require('express');
const router = express.Router();
const dbService = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// GET all conversations for a customer
router.get('/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    const conversations = dbService.getConversationsByCustomer(customerId);
    res.json({
      success: true,
      conversations
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all conversations across the system
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const conversations = dbService.getAllConversations(limit);
    res.json({
      success: true,
      conversations
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET messages for a conversation
router.get('/details/:conversationId/messages', (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = dbService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const messages = dbService.getMessagesByConversation(conversationId);
    const parsedMessages = messages.map(msg => {
      let memoryData = null;
      if (msg.memory_data) {
        try { memoryData = JSON.parse(msg.memory_data); } catch (_) {}
      }
      return {
        ...msg,
        memory_retrieved: Boolean(msg.memory_retrieved),
        memory_data: memoryData
      };
    });

    res.json({
      success: true,
      conversation,
      messages: parsedMessages
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST start new conversation for customer (closes old active one)
router.post('/new', (req, res) => {
  try {
    const { customerId, title = 'New Support Session' } = req.body || {};
    if (!customerId) {
      return res.status(400).json({ success: false, error: 'customerId is required' });
    }

    // Close any existing active conversation for this customer
    dbService.closeActiveConversations(customerId);

    const newConv = dbService.createConversation({
      id: 'CONV-' + uuidv4().slice(0, 8).toUpperCase(),
      customerId,
      title,
      status: 'active'
    });

    res.json({
      success: true,
      conversation: newConv
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
