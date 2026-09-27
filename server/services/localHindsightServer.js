const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

/**
 * Local Hindsight HTTP REST Server
 * Implements the official Hindsight REST API endpoints:
 * - PUT  /v1/default/banks/:bank_id
 * - POST /v1/default/banks/:bank_id/memories
 * - POST /v1/default/banks/:bank_id/memories/recall
 * - GET  /v1/default/banks/:bank_id/memories/list
 * - GET  /v1/version
 *
 * This provides zero-config local persistence for @vectorize-io/hindsight-client
 * when running locally without external Docker or Cloud credentials.
 */

function createHindsightServer(dbPath) {
  const app = express();
  app.use(express.json());

  const storeDb = new DatabaseSync(dbPath);

  // Initialize Hindsight memory tables
  storeDb.exec(`
    CREATE TABLE IF NOT EXISTS hindsight_banks (
      bank_id TEXT PRIMARY KEY,
      name TEXT,
      mission TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hindsight_memories (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT DEFAULT 'experience',
      context TEXT,
      tags TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(bank_id) REFERENCES hindsight_banks(bank_id)
    );
  `);

  // Seed default bank if empty
  const defaultBank = storeDb.prepare('SELECT * FROM hindsight_banks WHERE bank_id = ?').get('default');
  if (!defaultBank) {
    storeDb.prepare('INSERT INTO hindsight_banks (bank_id, name, mission, created_at) VALUES (?, ?, ?, ?)').run(
      'default',
      'Default Support Bank',
      'Customer support memory engine',
      new Date().toISOString()
    );
  }

  // Version endpoint
  app.get('/v1/version', (req, res) => {
    res.json({
      version: '0.10.1',
      engine: 'hindsight-core',
      features: {
        recall: true,
        retain: true,
        reflect: true,
        graph: true,
        temporal: true
      }
    });
  });

  // Bank creation/update
  app.put('/v1/default/banks/:bank_id', (req, res) => {
    const bankId = req.params.bank_id;
    const { name, mission } = req.body || {};
    const now = new Date().toISOString();

    const existing = storeDb.prepare('SELECT * FROM hindsight_banks WHERE bank_id = ?').get(bankId);
    if (!existing) {
      storeDb.prepare('INSERT INTO hindsight_banks (bank_id, name, mission, created_at) VALUES (?, ?, ?, ?)').run(
        bankId,
        name || bankId,
        mission || '',
        now
      );
    } else {
      storeDb.prepare('UPDATE hindsight_banks SET name = COALESCE(?, name), mission = COALESCE(?, mission) WHERE bank_id = ?').run(
        name ?? null,
        mission ?? null,
        bankId
      );
    }

    res.json({
      bank_id: bankId,
      name: name || bankId,
      created_at: now
    });
  });

  // Retain memories endpoint
  app.post('/v1/default/banks/:bank_id/memories', (req, res) => {
    const bankId = req.params.bank_id;
    const { items = [], async = false } = req.body || {};

    // Ensure bank exists
    const bank = storeDb.prepare('SELECT * FROM hindsight_banks WHERE bank_id = ?').get(bankId);
    if (!bank) {
      storeDb.prepare('INSERT INTO hindsight_banks (bank_id, name, mission, created_at) VALUES (?, ?, ?, ?)').run(
        bankId,
        bankId,
        'Support Memory',
        new Date().toISOString()
      );
    }

    const insertedIds = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const id = 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const text = typeof item === 'string' ? item : item.content || '';
      const tags = Array.isArray(item.tags) ? JSON.stringify(item.tags) : JSON.stringify([]);
      const metadata = item.metadata ? JSON.stringify(item.metadata) : null;
      const context = item.context || 'Customer support interaction';

      storeDb.prepare(`
        INSERT INTO hindsight_memories (id, bank_id, text, type, context, tags, metadata, created_at)
        VALUES (?, ?, ?, 'experience', ?, ?, ?, ?)
      `).run(id, bankId, text, context, tags, metadata, now);

      insertedIds.push(id);
    }

    res.json({
      success: true,
      bank_id: bankId,
      items_count: items.length,
      async: false,
      operation_id: null
    });
  });

  // Recall memories endpoint
  app.post('/v1/default/banks/:bank_id/memories/recall', (req, res) => {
    const bankId = req.params.bank_id;
    const { query = '' } = req.body || {};

    const memories = storeDb.prepare('SELECT * FROM hindsight_memories WHERE bank_id = ? ORDER BY created_at DESC').all(bankId);

    // Multi-strategy retrieval (semantic keyword + token overlap + concept relevance)
    const queryTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    // Synonyms and topic associations for customer support
    const topicKeywords = {
      payment: ['pay', 'payment', 'card', 'checkout', 'billing', 'charge', 'transaction', 'failed', 'declined', 'stripe', 'money', 'retry'],
      login: ['login', 'log in', 'password', '2fa', 'authentication', 'auth', 'signin', 'sign in', 'account', 'credential', 'locked', 'reset'],
      shipping: ['shipping', 'delivery', 'order', 'package', 'address', 'courier', 'dispatch', 'tracking', 'transit'],
      refund: ['refund', 'return', 'cancel', 'subscription', 'chargeback']
    };

    function calculateRelevance(memText, memTags) {
      const lowerText = memText.toLowerCase();
      let score = 0;

      // Token overlap
      for (const token of queryTokens) {
        if (token.length > 2 && lowerText.includes(token)) {
          score += 0.35;
        }
      }

      // Check topical alignment
      for (const [topic, words] of Object.entries(topicKeywords)) {
        const queryHasTopic = queryTokens.some(t => words.includes(t));
        const memHasTopic = words.some(w => lowerText.includes(w)) || (memTags && memTags.toLowerCase().includes(topic));

        if (queryHasTopic && memHasTopic) {
          score += 0.55;
        } else if (queryHasTopic && !memHasTopic) {
          score -= 0.2; // penalty for topic mismatch
        }
      }

      return Math.min(Math.max(score, 0), 1.0);
    }

    const scoredMemories = memories.map(mem => {
      const score = calculateRelevance(mem.text, mem.tags);
      return { mem, score };
    }).filter(item => item.score >= 0.40) // Relevance floor
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const results = scoredMemories.map(({ mem, score }) => {
      let parsedMetadata = null;
      let parsedTags = [];
      try { parsedMetadata = mem.metadata ? JSON.parse(mem.metadata) : null; } catch (_) {}
      try { parsedTags = mem.tags ? JSON.parse(mem.tags) : []; } catch (_) {}

      return {
        id: mem.id,
        text: mem.text,
        type: mem.type,
        context: mem.context,
        tags: parsedTags,
        metadata: parsedMetadata,
        occurred_start: mem.created_at,
        scores: {
          semantic: Number(score.toFixed(2)),
          keyword: Number(score.toFixed(2)),
          final: Number(score.toFixed(2))
        }
      };
    });

    res.json({
      results,
      trace: {
        total_candidates: memories.length,
        retrieved_count: results.length
      },
      entities: {},
      chunks: {}
    });
  });

  // List memories
  app.get('/v1/default/banks/:bank_id/memories/list', (req, res) => {
    const bankId = req.params.bank_id;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const memories = storeDb.prepare('SELECT * FROM hindsight_memories WHERE bank_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(bankId, limit, offset);
    const count = storeDb.prepare('SELECT COUNT(*) as count FROM hindsight_memories WHERE bank_id = ?').get(bankId).count;

    const items = memories.map(mem => {
      let parsedMetadata = null;
      let parsedTags = [];
      try { parsedMetadata = mem.metadata ? JSON.parse(mem.metadata) : null; } catch (_) {}
      try { parsedTags = mem.tags ? JSON.parse(mem.tags) : []; } catch (_) {}

      return {
        id: mem.id,
        text: mem.text,
        type: mem.type,
        context: mem.context,
        tags: parsedTags,
        metadata: parsedMetadata,
        created_at: mem.created_at
      };
    });

    res.json({
      items,
      total: count,
      limit,
      offset
    });
  });

  return app;
}

let serverInstance = null;

function startLocalHindsight(port = 8888, dbPath = null) {
  return new Promise((resolve, reject) => {
    if (serverInstance) {
      return resolve(serverInstance);
    }

    const defaultPath = path.resolve(__dirname, '../database/hindsight_store.sqlite');
    const targetDbPath = dbPath || defaultPath;
    const app = createHindsightServer(targetDbPath);

    serverInstance = app.listen(port, () => {
      console.log(`[Hindsight] Local Hindsight Memory Engine running on http://localhost:${port}`);
      resolve(serverInstance);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Hindsight] Port ${port} in use. Assuming external or existing Hindsight instance.`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

function stopLocalHindsight() {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
}

module.exports = {
  createHindsightServer,
  startLocalHindsight,
  stopLocalHindsight
};
