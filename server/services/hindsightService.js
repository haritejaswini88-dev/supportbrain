const { HindsightClient, recallResponseToPromptString } = require('@vectorize-io/hindsight-client');

/**
 * Hindsight Memory Service
 * 
 * Isolated service integrating the official Hindsight TypeScript client (@vectorize-io/hindsight-client).
 * Responsible for:
 * - Scoping memory banks per customer (strict multi-tenant memory isolation)
 * - Retaining structured customer problem/solution/outcome memories
 * - Recalling relevant memories using semantic & keyword retrieval
 * - Graceful degradation when Hindsight is unavailable
 */

class HindsightService {
  constructor() {
    this.baseUrl = process.env.HINDSIGHT_BASE_URL || 'http://localhost:8888';
    this.apiKey = process.env.HINDSIGHT_API_KEY || undefined;
    
    this.client = new HindsightClient({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey
    });

    this.createdBanks = new Set();
  }

  /**
   * Derive consistent, normalized bank ID for a given customer
   */
  getBankId(customerId) {
    if (!customerId) return 'supportbrain_default';
    return `supportbrain_${customerId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
  }

  /**
   * Ensure memory bank exists for this customer
   */
  async ensureBank(customerId, customerName = 'Customer') {
    const bankId = this.getBankId(customerId);
    if (this.createdBanks.has(bankId)) return bankId;

    try {
      await this.client.createBank(bankId, {
        name: `Support Memory - ${customerName}`,
        reflectMission: `Customer support interaction memory for ${customerName} (${customerId})`
      });
      this.createdBanks.add(bankId);
    } catch (err) {
      // 409 Conflict or existing bank is acceptable
      this.createdBanks.add(bankId);
    }
    return bankId;
  }

  /**
   * Check connection to Hindsight deployment
   */
  async checkConnection() {
    try {
      const version = await this.client.getVersion();
      return {
        connected: true,
        version: version?.version || '0.10.1',
        baseUrl: this.baseUrl
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message,
        baseUrl: this.baseUrl
      };
    }
  }

  /**
   * Recall relevant memories for a customer given a query
   * @param {string} customerId
   * @param {string} query
   * @returns {Promise<{ available: boolean, memories: Array, promptString: string, error?: string }>}
   */
  async recallCustomerMemory(customerId, query) {
    const bankId = this.getBankId(customerId);

    try {
      await this.ensureBank(customerId);

      const response = await this.client.recall(bankId, query, {
        maxTokens: 1024,
        types: ['world', 'experience', 'observation']
      });

      const rawResults = response?.results || [];

      // Format results into structured view
      const memories = rawResults.map(item => {
        let problem = item.metadata?.problem;
        let solution = item.metadata?.solution;
        let outcome = item.metadata?.outcome;

        // If not in metadata, extract from text format if possible
        if (!problem && item.text) {
          const probMatch = item.text.match(/problem:\s*([^.]+)/i);
          const solMatch = item.text.match(/solution:\s*([^.]+)/i);
          const outMatch = item.text.match(/outcome:\s*([^.]+)/i);
          if (probMatch) problem = probMatch[1].trim();
          if (solMatch) solution = solMatch[1].trim();
          if (outMatch) outcome = outMatch[1].trim();
        }

        return {
          id: item.id,
          text: item.text,
          problem: problem || 'Previous support issue',
          solution: solution || 'Troubleshooting applied',
          outcome: outcome || 'Resolved',
          source: 'Previous customer interaction',
          tags: item.tags || [],
          score: item.scores?.final || item.scores?.semantic || 0.85,
          createdAt: item.occurred_start || new Date().toISOString()
        };
      });

      // Generate prompt string using official Hindsight helper
      let promptString = '';
      try {
        promptString = recallResponseToPromptString(response);
      } catch (_) {
        promptString = memories.map(m => `- ${m.text}`).join('\n');
      }

      return {
        available: true,
        memories,
        promptString,
        count: memories.length
      };
    } catch (err) {
      console.warn(`[HindsightService] Recall failed for ${customerId}:`, err.message);
      return {
        available: false,
        error: 'Memory service temporarily unavailable.',
        memories: [],
        promptString: '',
        count: 0
      };
    }
  }

  /**
   * Retain useful customer support memory into Hindsight
   * @param {string} customerId
   * @param {object} param1 { problem, solution, outcome, notes, tags }
   */
  async retainCustomerMemory(customerId, { problem, solution, outcome = 'Successful', notes = '', tags = [] }) {
    const bankId = this.getBankId(customerId);

    try {
      await this.ensureBank(customerId);

      const content = `Problem: ${problem}. Solution: ${solution}. Outcome: ${outcome}.${notes ? ' Additional details: ' + notes : ''}`;

      const response = await this.client.retain(bankId, content, {
        async: false,
        tags: ['support', customerId, ...(tags || [])],
        metadata: {
          problem,
          solution,
          outcome,
          source: 'customer_interaction',
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        bankId,
        content,
        response
      };
    } catch (err) {
      console.warn(`[HindsightService] Retain failed for ${customerId}:`, err.message);
      return {
        success: false,
        error: 'Memory service temporarily unavailable.',
        errMessage: err.message
      };
    }
  }

  /**
   * List all stored memories for a customer
   */
  async listCustomerMemories(customerId) {
    const bankId = this.getBankId(customerId);

    try {
      await this.ensureBank(customerId);

      const response = await this.client.listMemories(bankId, { limit: 50 });
      const items = response?.items || [];

      return {
        available: true,
        bankId,
        memories: items.map(item => {
          let problem = item.metadata?.problem;
          let solution = item.metadata?.solution;
          let outcome = item.metadata?.outcome;

          if (!problem && item.text) {
            const probMatch = item.text.match(/problem:\s*([^.]+)/i);
            const solMatch = item.text.match(/solution:\s*([^.]+)/i);
            const outMatch = item.text.match(/outcome:\s*([^.]+)/i);
            if (probMatch) problem = probMatch[1].trim();
            if (solMatch) solution = solMatch[1].trim();
            if (outMatch) outcome = outMatch[1].trim();
          }

          return {
            id: item.id,
            text: item.text,
            problem: problem || 'Support issue',
            solution: solution || 'Recommended steps',
            outcome: outcome || 'Resolved',
            source: 'Hindsight Memory Bank',
            tags: item.tags || [],
            createdAt: item.created_at || new Date().toISOString()
          };
        }),
        total: response?.total || items.length
      };
    } catch (err) {
      console.warn(`[HindsightService] List memories failed for ${customerId}:`, err.message);
      return {
        available: false,
        error: 'Memory service temporarily unavailable.',
        memories: [],
        total: 0
      };
    }
  }
}

// Export singleton instance
module.exports = new HindsightService();
