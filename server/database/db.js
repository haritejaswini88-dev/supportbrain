const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbDir = path.resolve(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'supportbrain.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    preferences TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    title TEXT,
    issue_summary TEXT,
    solution_summary TEXT,
    outcome TEXT DEFAULT 'In Progress',
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    memory_retrieved INTEGER DEFAULT 0,
    memory_data TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS recurring_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    last_occurred_at TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );
`);

function getAllCustomers() {
  const stmt = db.prepare('SELECT * FROM customers ORDER BY id ASC');
  return stmt.all();
}

function getCustomerById(id) {
  const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
  return stmt.get(id);
}

function createCustomer({ id, name, email, phone, preferences }) {
  const stmt = db.prepare(`
    INSERT INTO customers (id, name, email, phone, preferences, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      preferences = excluded.preferences
  `);
  stmt.run(id, name, email, phone, preferences, new Date().toISOString());
  return getCustomerById(id);
}

function getConversationsByCustomer(customerId) {
  const stmt = db.prepare(`
    SELECT * FROM conversations 
    WHERE customer_id = ? 
    ORDER BY updated_at DESC
  `);
  return stmt.all(customerId);
}

function getAllConversations(limit = 50) {
  const stmt = db.prepare(`
    SELECT c.*, cust.name as customer_name 
    FROM conversations c
    JOIN customers cust ON c.customer_id = cust.id
    ORDER BY c.updated_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

function getConversationById(id) {
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
  return stmt.get(id);
}

function getActiveConversation(customerId) {
  const stmt = db.prepare(`
    SELECT * FROM conversations 
    WHERE customer_id = ? AND status = 'active'
    ORDER BY updated_at DESC LIMIT 1
  `);
  return stmt.get(customerId);
}

function createConversation({ id, customerId, title, issue_summary, solution_summary, outcome = 'In Progress', status = 'active' }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO conversations (id, customer_id, title, issue_summary, solution_summary, outcome, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, customerId, title || 'Support Inquiry', issue_summary || '', solution_summary || '', outcome, status, now, now);
  return getConversationById(id);
}

function updateConversation(id, { title, issue_summary, solution_summary, outcome, status }) {
  const conv = getConversationById(id);
  if (!conv) return null;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE conversations SET
      title = COALESCE(?, title),
      issue_summary = COALESCE(?, issue_summary),
      solution_summary = COALESCE(?, solution_summary),
      outcome = COALESCE(?, outcome),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `);
  stmt.run(title ?? null, issue_summary ?? null, solution_summary ?? null, outcome ?? null, status ?? null, now, id);
  return getConversationById(id);
}

function closeActiveConversations(customerId) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE conversations SET status = 'closed', updated_at = ?
    WHERE customer_id = ? AND status = 'active'
  `);
  stmt.run(now, customerId);
}

function getMessagesByConversation(conversationId) {
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
  `);
  return stmt.all(conversationId);
}

function addMessage({ id, conversationId, sender, content, memory_retrieved = 0, memory_data = null }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, sender, content, memory_retrieved, memory_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, conversationId, sender, content, memory_retrieved ? 1 : 0, memory_data ? JSON.stringify(memory_data) : null, now);
  
  // Update conversation updated_at
  const updateConv = db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?');
  updateConv.run(now, conversationId);

  return {
    id,
    conversation_id: conversationId,
    sender,
    content,
    memory_retrieved: Boolean(memory_retrieved),
    memory_data,
    created_at: now
  };
}

function getRecurringIssues(customerId = null) {
  if (customerId) {
    const stmt = db.prepare('SELECT * FROM recurring_issues WHERE customer_id = ? ORDER BY occurrence_count DESC');
    return stmt.all(customerId);
  }
  const stmt = db.prepare(`
    SELECT r.*, c.name as customer_name 
    FROM recurring_issues r
    JOIN customers c ON r.customer_id = c.id
    ORDER BY r.occurrence_count DESC
  `);
  return stmt.all();
}

function recordRecurringIssue(customerId, issueType) {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM recurring_issues WHERE customer_id = ? AND LOWER(issue_type) = LOWER(?)').get(customerId, issueType);
  if (existing) {
    const stmt = db.prepare('UPDATE recurring_issues SET occurrence_count = occurrence_count + 1, last_occurred_at = ? WHERE id = ?');
    stmt.run(now, existing.id);
    return { ...existing, occurrence_count: existing.occurrence_count + 1, last_occurred_at: now };
  } else {
    const stmt = db.prepare('INSERT INTO recurring_issues (customer_id, issue_type, occurrence_count, last_occurred_at) VALUES (?, ?, 1, ?)');
    const result = stmt.run(customerId, issueType, now);
    return { id: result.lastInsertRowid, customer_id: customerId, issue_type: issueType, occurrence_count: 1, last_occurred_at: now };
  }
}

function getDashboardStats() {
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const totalConversations = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;
  const totalMemoriesRetrieved = db.prepare('SELECT COUNT(*) as count FROM messages WHERE memory_retrieved = 1').get().count;
  const recurringIssuesCount = db.prepare('SELECT COUNT(*) as count FROM recurring_issues WHERE occurrence_count > 1').get().count;
  const returningCustomersCount = db.prepare(`
    SELECT COUNT(DISTINCT customer_id) as count FROM conversations 
    GROUP BY customer_id HAVING COUNT(*) > 1
  `).all().length;

  return {
    totalCustomers,
    totalConversations,
    returningCustomers: returningCustomersCount || 1, // Demo sensible
    memoriesRetrieved: totalMemoriesRetrieved,
    recurringIssues: recurringIssuesCount,
    isDemoData: true
  };
}

module.exports = {
  db,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  getConversationsByCustomer,
  getAllConversations,
  getConversationById,
  getActiveConversation,
  createConversation,
  updateConversation,
  closeActiveConversations,
  getMessagesByConversation,
  addMessage,
  getRecurringIssues,
  recordRecurringIssue,
  getDashboardStats
};
