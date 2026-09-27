const hindsightService = require('./hindsightService');
const aiService = require('./aiService');
const dbService = require('../database/db');
const { v4: uuidv4 } = require('uuid');

class MemoryService {
  /**
   * Main end-to-end SupportBrain turn orchestrator
   * 1. Identify customer
   * 2. Recall relevant memories from Hindsight
   * 3. Send relevant memories + current conversation to AI
   * 4. Generate support response
   * 5. Extract useful interaction info
   * 6. Retain useful memory in Hindsight
   * 7. Track recurring issues & outcomes
   */
  async processSupportTurn({ customerId, message, conversationId = null }) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    const trimmedMsg = (message || '').trim();
    if (!trimmedMsg) {
      throw new Error('Message cannot be empty');
    }

    // 1. Fetch or verify customer
    const customer = dbService.getCustomerById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    // 2. Active conversation handling
    let currentConversation = null;
    if (conversationId) {
      currentConversation = dbService.getConversationById(conversationId);
    }
    if (!currentConversation) {
      currentConversation = dbService.getActiveConversation(customerId);
    }
    if (!currentConversation) {
      currentConversation = dbService.createConversation({
        id: 'CONV-' + uuidv4().slice(0, 8).toUpperCase(),
        customerId: customer.id,
        title: 'Support Inquiry',
        status: 'active'
      });
    }

    // Record incoming user message
    dbService.addMessage({
      id: uuidv4(),
      conversationId: currentConversation.id,
      sender: 'customer',
      content: trimmedMsg
    });

    // 3. Recall relevant memories from Hindsight
    console.log(`[MemoryService] Recalling memories for customer ${customerId} with query: "${trimmedMsg}"`);
    const recallResult = await hindsightService.recallCustomerMemory(customerId, trimmedMsg);

    const memoriesRetrieved = recallResult.available && recallResult.memories && recallResult.memories.length > 0;
    const retrievedMemories = recallResult.memories || [];

    // 4. Retrieve recent conversation history for prompt
    const conversationHistory = dbService.getMessagesByConversation(currentConversation.id);

    // 5. Generate AI response
    const aiResult = await aiService.generateSupportResponse({
      customerName: customer.name,
      customerMessage: trimmedMsg,
      conversationHistory,
      retrievedMemories
    });

    if (!aiResult.success && aiResult.error) {
      // Record failed attempt or return error
      return {
        success: false,
        error: aiResult.error,
        conversationId: currentConversation.id,
        memoryRetrieved: memoriesRetrieved,
        memoryServiceAvailable: recallResult.available,
        memories: retrievedMemories
      };
    }

    const responseText = aiResult.response;

    // 6. Record AI response message in SQLite with memory metadata
    dbService.addMessage({
      id: uuidv4(),
      conversationId: currentConversation.id,
      sender: 'agent',
      content: responseText,
      memory_retrieved: memoriesRetrieved ? 1 : 0,
      memory_data: retrievedMemories
    });

    // 7. Extract useful interaction info for long-term memory
    const extracted = await aiService.extractInteractionMemory({
      customerMessage: trimmedMsg,
      agentResponse: responseText,
      recentMessages: conversationHistory
    });

    let retainedResult = null;
    let recurringInfo = null;

    if (extracted.hasUsefulInfo && extracted.problem) {
      console.log(`[MemoryService] Useful info detected. Retaining in Hindsight: Problem="${extracted.problem}", Solution="${extracted.solution}", Outcome="${extracted.outcome}"`);
      
      // Retain in Hindsight
      retainedResult = await hindsightService.retainCustomerMemory(customerId, {
        problem: extracted.problem,
        solution: extracted.solution,
        outcome: extracted.outcome,
        notes: `Interaction in conversation ${currentConversation.id}`,
        tags: extracted.tags
      });

      // Update recurring issues tracker
      const updatedIssue = dbService.recordRecurringIssue(customerId, extracted.problem);
      if (updatedIssue.occurrence_count > 1) {
        recurringInfo = {
          detected: true,
          issue: extracted.problem,
          count: updatedIssue.occurrence_count,
          lastOccurred: updatedIssue.last_occurred_at
        };
      }

      // Update conversation metadata in SQLite
      dbService.updateConversation(currentConversation.id, {
        title: extracted.problem,
        issue_summary: extracted.problem,
        solution_summary: extracted.solution,
        outcome: extracted.outcome === 'Successful' ? 'Resolved' : 'In Progress'
      });
    }

    return {
      success: true,
      response: responseText,
      conversationId: currentConversation.id,
      customerId: customer.id,
      customerName: customer.name,
      memoryRetrieved: memoriesRetrieved,
      memoryServiceAvailable: recallResult.available,
      memories: retrievedMemories,
      issue: extracted.problem,
      solution: extracted.solution,
      outcome: extracted.outcome,
      retained: Boolean(retainedResult?.success),
      recurringIssue: recurringInfo
    };
  }

  /**
   * Get all persistent memories for customer from Hindsight
   */
  async getCustomerMemories(customerId) {
    const customer = dbService.getCustomerById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    const memoryResult = await hindsightService.listCustomerMemories(customerId);
    const recurring = dbService.getRecurringIssues(customerId);

    return {
      customer,
      ...memoryResult,
      recurringIssues: recurring
    };
  }
}

module.exports = new MemoryService();
