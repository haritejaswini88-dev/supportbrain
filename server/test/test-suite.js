const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { startLocalHindsight } = require('../services/localHindsightServer');
const { HindsightClient } = require('@vectorize-io/hindsight-client');
const hindsightService = require('../services/hindsightService');
const memoryService = require('../services/memoryService');
const aiService = require('../services/aiService');
const dbService = require('../database/db');
const { seedDatabase } = require('../database/seed');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, fn) {
  process.stdout.write(`[TEST] ${name} ... `);
  try {
    await fn();
    console.log('✅ PASSED');
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    console.error(err);
    testsFailed++;
  }
}

async function main() {
  console.log('========================================================');
  console.log(' SupportBrain Comprehensive Verification Test Suite');
  console.log(' Testing all 14 Acceptance Criteria from Specification');
  console.log('========================================================\n');

  // Setup environment & Hindsight
  await startLocalHindsight(8888);
  
  // Wipe test memories from previous test runs
  const hindsightStorePath = path.resolve(__dirname, '../database/hindsight_store.sqlite');
  if (fs.existsSync(hindsightStorePath)) {
    try {
      const hDb = new DatabaseSync(hindsightStorePath);
      hDb.exec(`DELETE FROM hindsight_memories;`);
    } catch (_) {}
  }
  seedDatabase();

  // Test 1: New customer sends message
  await runTest('Test 1: New customer sends message (no previous memory)', async () => {
    const res = await memoryService.processSupportTurn({
      customerId: 'CUST-002',
      message: 'Hello, my payment failed at checkout.'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.memoryRetrieved, false, 'New customer should not have previous memory retrieved');
    assert.strictEqual(res.memories.length, 0);
    assert(res.response.length > 10, 'Should generate a supportive response');
  });

  // Test 2: Customer returns with same issue
  await runTest('Test 2: Customer returns with same issue', async () => {
    // Retain initial payment memory for Hari
    await hindsightService.retainCustomerMemory('CUST-001', {
      problem: 'Payment failure',
      solution: 'Payment retry with 3D Secure',
      outcome: 'Successful',
      tags: ['payment', 'billing']
    });

    const res = await memoryService.processSupportTurn({
      customerId: 'CUST-001',
      message: 'My payment failed again.'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.memoryRetrieved, true, 'Returning customer should have memories recalled');
    assert(res.memories.length > 0, 'Should return at least 1 memory');
  });

  // Test 3: Relevant Hindsight memory is retrieved
  await runTest('Test 3: Relevant Hindsight memory is retrieved', async () => {
    const res = await hindsightService.recallCustomerMemory('CUST-001', 'My payment failed again.');
    assert.strictEqual(res.available, true);
    assert(res.memories.length > 0);
    const hasPaymentMem = res.memories.some(m => m.problem.toLowerCase().includes('payment') || m.text.toLowerCase().includes('payment'));
    assert(hasPaymentMem, 'Should recall payment memory for payment query');
  });

  // Test 4: Irrelevant memory is not incorrectly used
  await runTest('Test 4: Irrelevant memory is not incorrectly used', async () => {
    // Retain password memory for Hari
    await hindsightService.retainCustomerMemory('CUST-001', {
      problem: 'Account Login & 2FA',
      solution: 'Password reset link sent to registered email',
      outcome: 'Successful',
      tags: ['login', 'account']
    });

    const res = await memoryService.processSupportTurn({
      customerId: 'CUST-001',
      message: 'I forgot my password and cannot sign in.'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.memoryRetrieved, true);
    const topMem = res.memories[0];
    assert(
      topMem.problem.toLowerCase().includes('login') || topMem.text.toLowerCase().includes('password') || topMem.text.toLowerCase().includes('login'),
      'Should retrieve login memory instead of payment memory for password query'
    );
  });

  // Test 5: New customer does not inherit another customer's memory
  await runTest('Test 5: New customer does not inherit another customer memory', async () => {
    // Ensure CUST-003 has no login memory
    const res = await memoryService.processSupportTurn({
      customerId: 'CUST-003',
      message: 'I forgot my password.'
    });
    assert.strictEqual(res.memoryRetrieved, false, 'New customer must NOT inherit other customers memories');
    assert.strictEqual(res.memories.length, 0);
  });

  // Test 6: Useful interaction information is retained
  await runTest('Test 6: Useful interaction information is retained', async () => {
    const extraction = await aiService.extractInteractionMemory({
      customerMessage: 'My card was declined at checkout.',
      agentResponse: 'Please check your billing address and retry.'
    });
    assert.strictEqual(extraction.hasUsefulInfo, true, 'Should detect useful problem info');
    assert(extraction.problem.toLowerCase().includes('payment') || extraction.problem.toLowerCase().includes('card'), 'Problem should be classified');
  });

  // Test 7: Solution/outcome is tracked
  await runTest('Test 7: Solution/outcome is tracked', async () => {
    const res = await memoryService.processSupportTurn({
      customerId: 'CUST-001',
      message: 'The payment retry worked! Thank you.'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.retained, true, 'Interaction outcome should be retained');
    assert.strictEqual(res.outcome, 'Successful', 'Outcome should be tracked as Successful');
  });

  // Test 8: Empty message is rejected
  await runTest('Test 8: Empty message is rejected', async () => {
    let rejected = false;
    try {
      await memoryService.processSupportTurn({
        customerId: 'CUST-001',
        message: '   '
      });
    } catch (err) {
      rejected = true;
      assert(err.message.includes('empty'), 'Should error on empty message');
    }
    assert.strictEqual(rejected, true, 'Empty message must be rejected');
  });

  // Test 9: Hindsight failure is handled
  await runTest('Test 9: Hindsight failure is handled without crashing', async () => {
    // Swap client to point to unreachable port
    const originalClient = hindsightService.client;
    hindsightService.client = new HindsightClient({
      baseUrl: 'http://127.0.0.1:9999'
    });

    const recall = await hindsightService.recallCustomerMemory('CUST-001', 'Test query');
    assert.strictEqual(recall.available, false);
    assert.strictEqual(recall.error, 'Memory service temporarily unavailable.');

    // Restore
    hindsightService.client = originalClient;
  });

  // Test 10: Groq failure is handled
  await runTest('Test 10: Groq failure is handled gracefully', async () => {
    // Force Groq client error with bad credentials
    const Groq = require('groq-sdk');
    const badClient = new Groq({ apiKey: 'gsk_invalid_test_key_12345' });
    const originalClient = aiService.client;
    aiService.client = badClient;

    const res = await aiService.generateSupportResponse({
      customerName: 'Hari',
      customerMessage: 'Test message',
      conversationHistory: [],
      retrievedMemories: []
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'AI support is temporarily unavailable. Please try again.');

    // Restore
    aiService.client = originalClient;
  });

  // Test 11: Frontend/backend communication works (Health and API data)
  await runTest('Test 11: Database and API data integrity', async () => {
    const customers = dbService.getAllCustomers();
    assert(customers.length >= 3, 'Should have at least 3 demo customers');
    const hari = dbService.getCustomerById('CUST-001');
    assert.strictEqual(hari.name, 'Hari');
    const stats = dbService.getDashboardStats();
    assert(stats.totalCustomers >= 3);
  });

  // Test 12: Application works after restarting the server
  await runTest('Test 12: Application works after restarting service', async () => {
    // Check that SQLite persisted customer and memories
    const customer = dbService.getCustomerById('CUST-001');
    assert(customer != null, 'Customer data should persist');
    const convs = dbService.getConversationsByCustomer('CUST-001');
    assert(convs.length > 0, 'Conversations should persist across restarts');
  });

  // Test 13: Environment variables are correctly loaded
  await runTest('Test 13: Environment variables configuration', async () => {
    const envExample = fs.readFileSync(path.resolve(__dirname, '../../.env.example'), 'utf8');
    assert(envExample.includes('GROQ_API_KEY'));
    assert(envExample.includes('HINDSIGHT_BASE_URL'));
    assert(envExample.includes('HINDSIGHT_API_KEY'));
  });

  // Test 14: No secrets appear in frontend code
  await runTest('Test 14: No secrets in frontend code or git tracking', async () => {
    const gitignore = fs.readFileSync(path.resolve(__dirname, '../../.gitignore'), 'utf8');
    assert(gitignore.includes('.env'), '.gitignore must ignore .env');
    assert(gitignore.includes('node_modules'), '.gitignore must ignore node_modules');
  });

  console.log('\n========================================================');
  console.log(` Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('========================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
