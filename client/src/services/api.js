const API_BASE = 'https://supportbrain-d12o-ihl3fw1zu-haritejaswini88-devs-projects.vercel.app/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data?.error || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to SupportBrain server. Please ensure the backend is running.');
    }
    throw err;
  }
}

export const api = {
  // Customers
  async getCustomers() {
    return fetchJson('/customers');
  },

  async getCustomer(id) {
    return fetchJson(`/customers/${id}`);
  },

  // Conversations
  async getCustomerConversations(customerId) {
    return fetchJson(`/conversations/${customerId}`);
  },

  async getAllConversations(limit = 50) {
    return fetchJson(`/conversations?limit=${limit}`);
  },

  async getConversationDetails(conversationId) {
    return fetchJson(`/conversations/details/${conversationId}/messages`);
  },

  async startNewConversation(customerId, title) {
    return fetchJson('/conversations/new', {
      method: 'POST',
      body: JSON.stringify({ customerId, title }),
    });
  },

  // Chat
  async sendChatMessage(customerId, message, conversationId = null) {
    return fetchJson('/chat', {
      method: 'POST',
      body: JSON.stringify({ customerId, message, conversationId }),
    });
  },

  // Memories
  async getCustomerMemories(customerId) {
    return fetchJson(`/memories/${customerId}`);
  },

  async retainMemory(customerId, memoryData) {
    return fetchJson(`/memories/${customerId}/retain`, {
      method: 'POST',
      body: JSON.stringify(memoryData),
    });
  },

  async testRecall(customerId, query) {
    return fetchJson(`/memories/${customerId}/recall`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  // Dashboard
  async getDashboardData() {
    return fetchJson('/dashboard');
  },

  // Health
  async getHealth() {
    return fetchJson('/health');
  },
};
