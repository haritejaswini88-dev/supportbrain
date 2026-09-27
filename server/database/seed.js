const { db, createCustomer, createConversation, addMessage, recordRecurringIssue } = require('./db');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  console.log('[Seed] Seeding database with synthetic demo customers and conversations...');

  // Reset structured SQLite tables
  db.exec(`
    DELETE FROM messages;
    DELETE FROM conversations;
    DELETE FROM recurring_issues;
    DELETE FROM customers;
  `);

  // Reset Hindsight store if present
  const hindsightStorePath = path.resolve(__dirname, 'hindsight_store.sqlite');
  if (fs.existsSync(hindsightStorePath)) {
    try {
      const hDb = new DatabaseSync(hindsightStorePath);
      hDb.exec(`
        DELETE FROM hindsight_memories WHERE bank_id = 'supportbrain_cust_002';
      `);
    } catch (_) {}
  }

  // 1. Hari - Primary demo customer (CUST-001)
  const hari = createCustomer({
    id: 'CUST-001',
    name: 'Hari',
    email: 'hari@example.com',
    phone: '+1 (555) 234-5678',
    preferences: 'Email support, immediate receipt notifications'
  });

  // Hari has previous historical conversations (demo data)
  const conv1Id = 'CONV-HARI-001';
  createConversation({
    id: conv1Id,
    customerId: hari.id,
    title: 'Payment Issue',
    issue_summary: 'Payment failed during annual subscription checkout',
    solution_summary: 'Suggested payment retry after verifying 3D Secure verification',
    outcome: 'Resolved',
    status: 'closed'
  });

  addMessage({
    id: uuidv4(),
    conversationId: conv1Id,
    sender: 'customer',
    content: 'My payment failed when trying to renew my annual plan.',
    memory_retrieved: 0
  });

  addMessage({
    id: uuidv4(),
    conversationId: conv1Id,
    sender: 'agent',
    content: 'I understand how frustrating that is. Often this occurs due to temporary 3D Secure bank validation timeouts. Please retry your card payment or use a verified credit card.',
    memory_retrieved: 0
  });

  addMessage({
    id: uuidv4(),
    conversationId: conv1Id,
    sender: 'customer',
    content: 'Retrying the payment with 3D Secure worked! Thank you.',
    memory_retrieved: 0
  });

  addMessage({
    id: uuidv4(),
    conversationId: conv1Id,
    sender: 'agent',
    content: 'Glad to hear the payment retry was successful! Your subscription is renewed.',
    memory_retrieved: 0
  });

  const conv2Id = 'CONV-HARI-002';
  createConversation({
    id: conv2Id,
    customerId: hari.id,
    title: 'Account Login & 2FA Setup',
    issue_summary: 'Assistance setting up two-factor authentication on mobile',
    solution_summary: 'Guided through authenticator app configuration',
    outcome: 'Resolved',
    status: 'closed'
  });

  addMessage({
    id: uuidv4(),
    conversationId: conv2Id,
    sender: 'customer',
    content: 'Can you help me enable 2FA on my account settings?',
    memory_retrieved: 0
  });

  addMessage({
    id: uuidv4(),
    conversationId: conv2Id,
    sender: 'agent',
    content: 'Certainly! Go to Security Settings > Two-Factor Authentication and scan the QR code with Google Authenticator.',
    memory_retrieved: 0
  });

  // Record initial recurring issue for Hari
  recordRecurringIssue(hari.id, 'Payment failure');

  // 2. Alex Rivera - Brand New Customer (CUST-002)
  // Has NO previous conversations and NO previous memories
  createCustomer({
    id: 'CUST-002',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    phone: '+1 (555) 987-6543',
    preferences: 'In-app chat support only'
  });

  // 3. Sarah Chen - Returning Customer with Shipping / Account inquiries (CUST-003)
  const sarah = createCustomer({
    id: 'CUST-003',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    phone: '+1 (555) 345-6789',
    preferences: 'SMS alerts and fast ticket resolution'
  });

  const conv3Id = 'CONV-SARAH-001';
  createConversation({
    id: conv3Id,
    customerId: sarah.id,
    title: 'Shipping Address Correction',
    issue_summary: 'Changed delivery destination prior to warehouse dispatch',
    solution_summary: 'Updated shipping address to secondary office address',
    outcome: 'Resolved',
    status: 'closed'
  });

  console.log('[Seed] Database successfully seeded with 3 demo customers and initial records.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
