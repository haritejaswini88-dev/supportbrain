import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Brain, 
  User, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  AlertCircle,
  MessageSquarePlus,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { api } from '../services/api';

export default function ChatWindow() {
  const { 
    selectedCustomerId, 
    selectedCustomer, 
    activeConversationId, 
    setActiveConversationId,
    setMemoryState 
  } = useCustomer();

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(''); // 'memory' | 'ai' | ''
  const [errorMsg, setErrorMsg] = useState(null);
  const messagesEndRef = useRef(null);

  // Load conversation messages when customer or active conversation changes
  useEffect(() => {
    async function loadMessages() {
      if (!selectedCustomerId) return;
      setErrorMsg(null);
      try {
        // Fetch conversations for this customer
        const convData = await api.getCustomerConversations(selectedCustomerId);
        const convs = convData.conversations || [];
        
        let targetConvId = activeConversationId;
        if (!targetConvId && convs.length > 0) {
          // Default to latest active conversation
          const active = convs.find(c => c.status === 'active') || convs[0];
          targetConvId = active.id;
          setActiveConversationId(targetConvId);
        }

        if (targetConvId) {
          const detailData = await api.getConversationDetails(targetConvId);
          setMessages(detailData.messages || []);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setMessages([]);
      }
    }
    loadMessages();
  }, [selectedCustomerId, activeConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    setErrorMsg(null);

    // Append optimistic user message
    const tempUserMsg = {
      id: 'temp-' + Date.now(),
      sender: 'customer',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Update UI loading states
    setIsLoading(true);
    setLoadingPhase('memory');
    setMemoryState({
      status: 'searching',
      memories: [],
      recurringIssue: null,
      lastQuery: text,
      error: null
    });

    try {
      // Simulate slight phase transition for smooth realistic UI feedback
      setTimeout(() => {
        setLoadingPhase('ai');
      }, 400);

      const res = await api.sendChatMessage(selectedCustomerId, text, activeConversationId);

      if (!activeConversationId && res.conversationId) {
        setActiveConversationId(res.conversationId);
      }

      // Update AI message in UI
      const agentMsg = {
        id: 'msg-' + Date.now(),
        sender: 'agent',
        content: res.response,
        memory_retrieved: res.memoryRetrieved,
        memory_data: res.memories,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, agentMsg]);

      // Update Memory Panel state
      if (!res.memoryServiceAvailable) {
        setMemoryState({
          status: 'unavailable',
          memories: [],
          recurringIssue: null,
          lastQuery: text,
          error: 'Memory service temporarily unavailable'
        });
      } else if (res.memoryRetrieved && res.memories && res.memories.length > 0) {
        setMemoryState({
          status: 'found',
          memories: res.memories,
          recurringIssue: res.recurringIssue,
          lastQuery: text,
          error: null
        });
      } else {
        setMemoryState({
          status: 'none',
          memories: [],
          recurringIssue: null,
          lastQuery: text,
          error: null
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      const isUnavailable = err.message.includes('unavailable') || err.message.includes('Network');
      setErrorMsg(err.message || 'Support service is temporarily unavailable. Please try again.');

      setMemoryState({
        status: isUnavailable ? 'unavailable' : 'none',
        memories: [],
        recurringIssue: null,
        lastQuery: text,
        error: err.message
      });
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  const quickPrompts = [
    { label: 'My payment failed.', text: 'My payment failed.' },
    { label: 'My payment failed again.', text: 'My payment failed again.' },
    { label: 'I forgot my password.', text: 'I forgot my password.' },
    { label: 'Retrying worked! Thanks.', text: 'Retrying the payment with 3D Secure worked! Thank you.' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Customer Info Subheader */}
      <div className="px-6 py-3 bg-white/80 backdrop-blur border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {selectedCustomer?.name?.charAt(0) || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{selectedCustomer?.name || 'Hari'}</span>
              <span className="px-2 py-0.2 bg-slate-100 text-slate-600 rounded font-mono text-[11px] font-semibold">
                {selectedCustomer?.id || 'CUST-001'}
              </span>
              {selectedCustomer?.id === 'CUST-002' ? (
                <span className="px-2 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                  New Customer — No Memory
                </span>
              ) : (
                <span className="px-2 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                  Returning Customer
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Preferences: {selectedCustomer?.preferences || 'Email support'}
            </p>
          </div>
        </div>

        {/* Demo Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
          <span>Hindsight Isolated Bank</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Welcome Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="max-w-md mx-auto my-12 text-center bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center mb-4 shadow-sm shadow-purple-500/10">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Support that remembers.</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {selectedCustomer?.id === 'CUST-002'
                ? 'Alex Rivera has no previous memory. Ask a question to see how new customers are handled without previous context assumptions.'
                : 'Hari has persistent previous interaction memory stored in Hindsight. Try asking about a payment failure to see memory retrieval in action.'}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Click a demo scenario to begin:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPrompts.slice(0, 2).map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(qp.text)}
                    className="text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors"
                  >
                    "{qp.label}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'customer';
          return (
            <div
              key={msg.id || index}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div className={`space-y-1 ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    {isUser ? selectedCustomer?.name || 'Customer' : 'SupportBrain AI'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 shadow-sm rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Memory Retrieved Indicator Badge on AI Bubble */}
                  {!isUser && msg.memory_retrieved && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs text-purple-700 font-semibold bg-purple-50/60 p-2 rounded-lg border border-purple-100">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>🧠 Memory Retrieved: Context from previous interaction applied</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-xl animate-pulse">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs flex-shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="bg-white border border-purple-200 p-4 rounded-2xl rounded-tl-none shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {loadingPhase === 'memory'
                    ? 'Searching customer memory in Hindsight...'
                    : 'SupportBrain is thinking...'}
                </span>
              </div>
              <div className="h-2 w-48 bg-purple-100 rounded-full"></div>
            </div>
          </div>
        )}

        {/* Error State Banner */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-6 py-2 bg-slate-100/60 border-t border-slate-200 flex items-center gap-2 overflow-x-auto select-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
          Demo:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp.text)}
            disabled={isLoading}
            className="text-xs font-medium bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 text-slate-600 px-3 py-1 rounded-full border border-slate-200 transition-all flex-shrink-0 disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            placeholder="Type your problem..."
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold px-5 py-3 rounded-xl transition-all flex items-center gap-2 text-sm shadow-sm shadow-purple-600/20 active:scale-95 disabled:active:scale-100"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
