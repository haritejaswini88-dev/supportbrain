import React from 'react';
import { 
  Brain, 
  MessageSquare, 
  LayoutDashboard, 
  Users, 
  History, 
  Database,
  Sparkles,
  Server,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';

export default function Sidebar({ activePage, setActivePage }) {
  const { customers, selectedCustomerId, switchCustomer, health } = useCustomer();

  const navItems = [
    { id: 'chat', label: 'Support Chat', icon: MessageSquare, badge: 'Live' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users, count: customers.length },
    { id: 'conversations', label: 'Conversations', icon: History },
    { id: 'memory', label: 'Memory Inspector', icon: Database, highlight: true },
  ];

  const hindsightConnected = health?.services?.hindsight?.status === 'connected';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-lg tracking-tight">SupportBrain</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">MVP</span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">Support that remembers.</p>
          </div>
        </div>
      </div>

      {/* Customer Quick Selector */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center justify-between">
          <span>Active Customer</span>
          <span className="text-[10px] font-medium text-purple-400">Demo Switcher</span>
        </div>
        <select
          value={selectedCustomerId}
          onChange={(e) => switchCustomer(e.target.value)}
          aria-label="Active Customer Switcher"
          className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.id}) {c.id === 'CUST-002' ? '— [New]' : ''}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-400 mt-1.5">
          {selectedCustomerId === 'CUST-001' && '👤 Primary returning demo customer (Hari)'}
          {selectedCustomerId === 'CUST-002' && '✨ New customer with zero previous memory'}
          {selectedCustomerId === 'CUST-003' && '📦 Returning customer with shipping context'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 px-3 py-1">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-purple-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isActive ? 'bg-purple-700 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && (
                <span className="text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            Hindsight Memory
          </span>
          <span className="flex items-center gap-1 font-medium text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {hindsightConnected ? 'Connected' : 'Active (Local)'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI Reasoning
          </span>
          <span className="text-[11px] font-mono text-indigo-300">
            {health?.services?.groq?.status === 'configured' ? 'Groq Llama-3.3' : 'Context Engine'}
          </span>
        </div>
      </div>
    </aside>
  );
}
