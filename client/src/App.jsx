import React, { useState } from 'react';
import { CustomerProvider, useCustomer } from './context/CustomerContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import ConversationsPage from './pages/ConversationsPage';
import MemoryPage from './pages/MemoryPage';
import { api } from './services/api';

function AppContent() {
  const [activePage, setActivePage] = useState('chat');
  const { selectedCustomerId, setActiveConversationId, setMemoryState } = useCustomer();

  const handleNewConversation = async () => {
    try {
      const res = await api.startNewConversation(selectedCustomerId, 'Fresh Support Session');
      if (res.conversation) {
        setActiveConversationId(res.conversation.id);
        setMemoryState({
          status: 'idle',
          memories: [],
          recurringIssue: null,
          lastQuery: '',
          error: null
        });
      }
    } catch (err) {
      console.error('Error starting new conversation:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      {/* Left Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar 
          activePage={activePage} 
          onNewConversation={handleNewConversation} 
        />

        <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
          {activePage === 'chat' && <ChatPage />}
          {activePage === 'dashboard' && <DashboardPage onNavigateToChat={() => setActivePage('chat')} />}
          {activePage === 'customers' && <CustomersPage onNavigateToChat={() => setActivePage('chat')} />}
          {activePage === 'conversations' && <ConversationsPage onNavigateToChat={() => setActivePage('chat')} />}
          {activePage === 'memory' && <MemoryPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <CustomerProvider>
      <AppContent />
    </CustomerProvider>
  );
}
