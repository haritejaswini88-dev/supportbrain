import React, { useState, useEffect } from 'react';
import { 
  History, 
  MessageSquare, 
  User, 
  Brain, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useCustomer } from '../context/CustomerContext';

export default function ConversationsPage({ onNavigateToChat }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const { switchCustomer } = useCustomer();

  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await api.getAllConversations(50);
        setConversations(res.conversations || []);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      }
    }
    loadConversations();
  }, []);

  const handleOpenConversation = async (conv) => {
    setSelectedConversation(conv);
    setLoadingMessages(true);
    try {
      const res = await api.getConversationDetails(conv.id);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Conversation History</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Demo Data
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Audit historical customer inquiries, solution steps applied, outcomes, and memory retention events.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Recorded Conversations</h2>
            <span className="text-xs text-slate-400 font-mono">{conversations.length} Sessions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {conversations.map((c) => {
              const isSelected = selectedConversation?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleOpenConversation(c)}
                  className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-purple-50/50 border-l-4 border-purple-600' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{c.title || 'Support Inquiry'}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        c.outcome === 'Resolved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {c.outcome || 'In Progress'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{c.customer_name || 'Customer'}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-400">{c.customer_id}</span>
                      <span>&bull;</span>
                      <span className="line-clamp-1">{c.issue_summary || 'General Inquiry'}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs text-slate-400">
                      {new Date(c.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <span className="text-xs font-semibold text-purple-600 inline-flex items-center gap-0.5">
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Conversation Detail Inspection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Conversation Detail</h2>
            {selectedConversation && (
              <span className="text-[10px] font-mono text-slate-400">
                {selectedConversation.id}
              </span>
            )}
          </div>

          {selectedConversation ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{selectedConversation.customer_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Issue:</span>
                  <span className="font-semibold text-slate-800">{selectedConversation.issue_summary || selectedConversation.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Outcome:</span>
                  <span className="font-bold text-emerald-700">{selectedConversation.outcome}</span>
                </div>
              </div>

              {/* Message transcript */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Transcript Messages
                </span>

                {loadingMessages ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Loading message logs...</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {messages.map((m) => {
                      const isUser = m.sender === 'customer';
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl text-xs space-y-1 ${
                            isUser ? 'bg-slate-900 text-white' : 'bg-purple-50 text-slate-800 border border-purple-100'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] opacity-75">
                            <span className="font-semibold">{isUser ? 'Customer' : 'SupportBrain AI'}</span>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                          {m.memory_retrieved && (
                            <div className="mt-1 pt-1 border-t border-purple-200/60 flex items-center gap-1 text-[10px] text-purple-700 font-bold">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>🧠 Memory Ingested into Prompt</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  switchCustomer(selectedConversation.customer_id);
                  onNavigateToChat();
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-purple-600/20 active:scale-95 transition-all mt-4"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Resume Live Support Chat</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">
              Click any conversation on the left to view the messages and memory trace.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
