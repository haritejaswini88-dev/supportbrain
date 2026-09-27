import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Brain, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useCustomer } from '../context/CustomerContext';

export default function DashboardPage({ onNavigateToChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { switchCustomer } = useCustomer();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await api.getDashboardData();
        setData(res);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const stats = data?.stats || {
    totalConversations: 8,
    returningCustomers: 2,
    memoriesRetrieved: 5,
    recurringIssues: 1
  };

  const statCards = [
    {
      title: 'Total Conversations',
      value: stats.totalConversations,
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      desc: 'Support interactions logged'
    },
    {
      title: 'Returning Customers',
      value: stats.returningCustomers,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      desc: 'Retained across sessions'
    },
    {
      title: 'Memories Retrieved',
      value: stats.memoriesRetrieved,
      icon: Brain,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      desc: 'Hindsight contextual recalls'
    },
    {
      title: 'Recurring Issues',
      value: stats.recurringIssues,
      icon: RotateCcw,
      color: 'text-red-600',
      bg: 'bg-red-50',
      desc: 'Identified repeating patterns'
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Support Agent Dashboard</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Demo Data
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time memory metrics, returning customer retention, and recurring problem tracking.
          </p>
        </div>

        <button
          onClick={() => {
            switchCustomer('CUST-001');
            onNavigateToChat();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm shadow-purple-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch Live Support Demo</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{card.value}</div>
                <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Conversations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Customer Conversations</h2>
              <p className="text-xs text-slate-500">Live conversation outcomes and memory tags</p>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              Live Feed
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recentConversations?.length > 0 ? (
              data.recentConversations.map((c) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{c.customer_name || 'Customer'}</span>
                      <span className="text-slate-400 font-mono text-xs">({c.customer_id})</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        c.outcome === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {c.outcome || 'In Progress'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">{c.issue_summary || c.title}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs text-slate-400">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => {
                        switchCustomer(c.customer_id);
                        onNavigateToChat();
                      }}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-0.5"
                    >
                      <span>Open Chat</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No recent conversations recorded.</p>
            )}
          </div>
        </div>

        {/* Right Column: Recurring Issues & Customer Overview */}
        <div className="space-y-6">
          {/* Recurring Issues Spotlight */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-500" />
                <h2 className="text-base font-bold text-slate-900">Recurring Issues</h2>
              </div>
              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                AI Detected
              </span>
            </div>

            <div className="space-y-3">
              {data?.recurringIssues?.length > 0 ? (
                data.recurringIssues.map((r, i) => (
                  <div key={i} className="bg-red-50/50 border border-red-200/80 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-900">{r.issue_type}</span>
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                        {r.occurrence_count} interactions
                      </span>
                    </div>
                    <p className="text-[11px] text-red-700">
                      Impacts: <span className="font-semibold">{r.customer_name}</span> ({r.customer_id})
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No recurring issues detected yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Customers Spotlight */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Customer Profiles</h2>
              <span className="text-xs text-slate-400 font-mono">3 Demo Users</span>
            </div>

            <div className="space-y-2.5">
              {data?.customers?.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    switchCustomer(cust.id);
                    onNavigateToChat();
                  }}
                  className="p-3 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-200 rounded-xl transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{cust.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">({cust.id})</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{cust.preferences}</p>
                  </div>
                  <span className="text-xs font-semibold text-purple-600">Select &rarr;</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
