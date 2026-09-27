const Groq = require('groq-sdk');

class AIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    this.client = this.apiKey ? new Groq({ apiKey: this.apiKey }) : null;
  }

  getClient() {
    if (!this.client && process.env.GROQ_API_KEY) {
      this.apiKey = process.env.GROQ_API_KEY;
      this.client = new Groq({ apiKey: this.apiKey });
    }
    return this.client;
  }

  /**
   * Generate contextual customer support response
   */
  async generateSupportResponse({
    customerName = 'Customer',
    customerMessage,
    conversationHistory = [],
    retrievedMemories = []
  }) {
    const client = this.getClient();

    // Prepare retrieved memories context for the prompt
    let memoryPromptSection = '';
    if (retrievedMemories && retrievedMemories.length > 0) {
      memoryPromptSection = `
=== RETRIEVED LONG-TERM MEMORY (FROM HINDSIGHT) ===
The following verified previous interaction memories were retrieved for ${customerName}:
${retrievedMemories.map((m, idx) => `[Memory ${idx + 1}]
- Previous Issue/Problem: ${m.problem}
- Previous Solution Attempted: ${m.solution}
- Previous Outcome: ${m.outcome}
- Context/Details: ${m.text || 'N/A'}`).join('\n\n')}

CRITICAL INSTRUCTIONS FOR USING MEMORY:
1. You MUST reference and utilize the relevant retrieved memories naturally. Acknowledge what was tried previously and the outcome (e.g., "I see that you experienced a payment failure earlier, where retrying the payment worked...").
2. Connect previous context to the current issue without making the customer repeat themselves.
3. Check whether the current issue is the same or a recurring occurrence.
`;
    } else {
      memoryPromptSection = `
=== RETRIEVED LONG-TERM MEMORY (FROM HINDSIGHT) ===
No previous interaction memories were found for ${customerName}.
CRITICAL INSTRUCTIONS:
Do NOT claim or pretend to remember any previous conversation or issue. Treat this as a fresh inquiry and provide polite, helpful initial troubleshooting.
`;
    }

    const systemPrompt = `You are SupportBrain AI, an intelligent, empathetic, and professional customer-support agent for SupportBrain ("Support that remembers.").
You are currently assisting: ${customerName}.

Your core capabilities:
- You remember previous customer problems, solutions, and outcomes when retrieved from persistent memory.
- You provide concise, clear, and actionable support steps.
- You maintain a warm, professional, and confident tone.
- You never invent or hallucinate interactions that are not present in retrieved memory.
- If solutions were previously attempted, you take them into account so the customer does not have to repeat themselves.

${memoryPromptSection}
`;

    // Build message thread
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Include recent history (last 6 messages)
    const recent = conversationHistory.slice(-6);
    for (const msg of recent) {
      messages.push({
        role: msg.sender === 'customer' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: customerMessage
    });

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.4,
          max_tokens: 500
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (reply) {
          return {
            success: true,
            response: reply,
            model: this.model
          };
        }
      } catch (err) {
        console.error('[AIService] Groq API error:', err.message);
        // Fall through to error or graceful handler
        return {
          success: false,
          error: 'AI support is temporarily unavailable. Please try again.',
          rawError: err.message
        };
      }
    }

    // If no GROQ_API_KEY is configured in development, inform or use dynamic contextual mock
    if (!this.apiKey) {
      console.warn('[AIService] GROQ_API_KEY not set in environment.');
      
      // If memories were retrieved, produce a faithful contextual response demonstrating memory retrieval
      if (retrievedMemories && retrievedMemories.length > 0) {
        const topMem = retrievedMemories[0];
        return {
          success: true,
          response: `Hello ${customerName}, I found a previous record of your ${topMem.problem.toLowerCase()} from our earlier conversation. Previously, ${topMem.solution.toLowerCase()} resolved the issue successfully (${topMem.outcome.toLowerCase()}). Let's verify if the same issue is occurring again or if there is an updated card or gateway notice. Would you like me to walk you through retrying or checking your verification method?`,
          model: 'fallback-contextual'
        };
      } else {
        return {
          success: true,
          response: `Hello ${customerName}, thanks for reaching out to SupportBrain. I'll be glad to help troubleshoot this problem. Could you share a few more details about what occurred, or any error messages you received?`,
          model: 'fallback-contextual'
        };
      }
    }

    return {
      success: false,
      error: 'AI support is temporarily unavailable. Please try again.'
    };
  }

  /**
   * Analyze interaction to extract structured problem, solution, and outcome for memory retention
   */
  async extractInteractionMemory({ customerMessage, agentResponse, recentMessages = [] }) {
    const client = this.getClient();

    const analysisPrompt = `Analyze the following customer support interaction between a customer and support agent.
Determine if there is useful long-term information worth retaining in persistent memory (e.g. specific problems, attempted solutions, preferences, outcomes).

Customer Message: "${customerMessage}"
Agent Response: "${agentResponse}"

Respond strictly in valid JSON format with this exact schema:
{
  "hasUsefulInfo": boolean,
  "problem": string or null (concise issue name, e.g. "Payment failure"),
  "solution": string or null (concise solution applied or recommended, e.g. "Payment retry"),
  "outcome": "Successful" | "Unresolved" | "Pending",
  "recurring": boolean,
  "tags": array of strings (e.g. ["payment", "billing"])
}`;

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are an AI data extractor. Respond only with JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        });

        const raw = completion.choices[0]?.message?.content;
        const parsed = JSON.parse(raw);
        return {
          hasUsefulInfo: Boolean(parsed.hasUsefulInfo && parsed.problem),
          problem: parsed.problem,
          solution: parsed.solution || 'Troubleshooting guidance provided',
          outcome: parsed.outcome || 'Pending',
          recurring: Boolean(parsed.recurring),
          tags: parsed.tags || ['support']
        };
      } catch (err) {
        console.warn('[AIService] Memory extraction via Groq failed, applying heuristic extraction:', err.message);
      }
    }

    // Heuristic extraction fallback
    const lowerMsg = customerMessage.toLowerCase();
    const isPayment = /pay|payment|card|checkout|billing|transaction/.test(lowerMsg);
    const isLogin = /login|password|2fa|auth|account|signin/.test(lowerMsg);
    const isShipping = /shipping|delivery|order|package|address/.test(lowerMsg);
    const isResolved = /worked|thanks|thank you|fixed|resolved|success/.test(lowerMsg);

    if (isPayment) {
      return {
        hasUsefulInfo: true,
        problem: 'Payment failure',
        solution: 'Payment retry',
        outcome: isResolved ? 'Successful' : 'Pending',
        recurring: /again|second time|recurring|repeated/.test(lowerMsg),
        tags: ['payment', 'billing']
      };
    } else if (isLogin) {
      return {
        hasUsefulInfo: true,
        problem: 'Account Login Issue',
        solution: 'Password reset & verification',
        outcome: isResolved ? 'Successful' : 'Pending',
        recurring: /again|locked/.test(lowerMsg),
        tags: ['account', 'login', 'security']
      };
    } else if (isShipping) {
      return {
        hasUsefulInfo: true,
        problem: 'Shipping / Delivery Delay',
        solution: 'Address update & courier dispatch',
        outcome: isResolved ? 'Successful' : 'Pending',
        recurring: false,
        tags: ['shipping', 'orders']
      };
    }

    return {
      hasUsefulInfo: false,
      problem: null,
      solution: null,
      outcome: 'Pending',
      recurring: false,
      tags: []
    };
  }
}

module.exports = new AIService();
