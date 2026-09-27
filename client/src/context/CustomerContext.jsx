import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const CustomerContext = createContext();

export function CustomerProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('CUST-001'); // Hari by default
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [memoryState, setMemoryState] = useState({
    status: 'idle', // 'idle' | 'searching' | 'found' | 'none' | 'unavailable'
    memories: [],
    recurringIssue: null,
    lastQuery: '',
    error: null
  });
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch customers and system health
  const refreshCustomers = async () => {
    try {
      const data = await api.getCustomers();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Error checking health:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([refreshCustomers(), checkHealth()]);
      setLoading(false);
    }
    init();
  }, []);

  // Update selected customer details whenever selectedCustomerId or customers changes
  useEffect(() => {
    if (!selectedCustomerId) return;
    async function loadCustomer() {
      try {
        const data = await api.getCustomer(selectedCustomerId);
        if (data.customer) {
          setSelectedCustomer(data.customer);
        }
      } catch (err) {
        // Fallback from array if single fetch fails
        const found = customers.find(c => c.id === selectedCustomerId);
        if (found) setSelectedCustomer(found);
      }
    }
    loadCustomer();
    // Reset active conversation & memory panel when switching customer
    setActiveConversationId(null);
    setMemoryState({
      status: 'idle',
      memories: [],
      recurringIssue: null,
      lastQuery: '',
      error: null
    });
  }, [selectedCustomerId, customers]);

  const switchCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
  };

  return (
    <CustomerContext.Provider
      value={{
        customers,
        selectedCustomerId,
        selectedCustomer,
        switchCustomer,
        activeConversationId,
        setActiveConversationId,
        memoryState,
        setMemoryState,
        health,
        refreshCustomers,
        checkHealth,
        loading
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
