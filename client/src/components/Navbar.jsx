import React from 'react';
import { useCustomer } from '../context/CustomerContext';
import { User, PlusCircle, Sparkles, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ activePage, onNewConversation }) {
  const { customers, selectedCustomerId, switchCustomer, selectedCustomer } = useCustomer();

  const pageTitles = {
    chat: 'Support Chat & Memory Agent',
    dashboard: 'Agent Overview Dashboard',
    customers: 'Customer Directory',
    conversations: 'Conversation History',
    memory: 'Hindsight Memory Inspector',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 flex-shrink-0">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">
          {pageTitles[activePage] || 'SupportBrain'}
        </h1>
        <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
          Demo Data
        </span>
      </div>

      {/* Customer Quick Selector Pills & Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          {customers.map((c) => {
            const isSelected = c.id === selectedCustomerId;
            return (
              <button
                key={c.id}
                onClick={() => switchCustomer(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-purple-700 font-semibold shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>{c.name}</span>
                {c.id === 'CUST-002' && (
                  <span className="px-1 py-0.2 text-[9px] bg-emerald-100 text-emerald-800 rounded font-bold">NEW</span>
                )}
              </button>
            );
          })}
        </div>

        {activePage === 'chat' && (
          <button
            onClick={onNewConversation}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all shadow-purple-600/20 active:scale-95"
            title="Start a fresh conversation session for this customer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Conversation</span>
          </button>
        )}
      </div>
    </header>
  );
}
