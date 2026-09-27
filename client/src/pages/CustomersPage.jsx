import React, { useState, useEffect } from 'react';
import { Users, User, ArrowRight, MessageSquare, ShieldCheck, Mail, Phone, Clock, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { useCustomer } from '../context/CustomerContext';

export default function CustomersPage({ onNavigateToChat }) {
  const [customers, setCustomers] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { switchCustomer, selectedCustomerId } = useCustomer();

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getCustomers();
        setCustomers(res.customers || []);
        const current = res.customers?.find(c => c.id === selectedCustomerId) || res.customers?.[0];
        setSelectedProfile(current);
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCustomerId]);

  const handleSelectCustomer = (id) => {
    switchCustomer(id);
    const found = customers.find(c => c.id === id);
    setSelectedProfile(found);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Demo Data
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Browse synthetic customer profiles, interaction counts, known recurring issues, and persistent memory banks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">All Customers</h2>
            <span className="text-xs text-slate-400 font-mono">{customers.length} Demo Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Known Issues</th>
                  <th className="py-3 px-4">Convs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const isCurrent = c.id === selectedCustomerId;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCustomer(c.id)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isCurrent ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{c.name}</span>
                            <span className="text-[11px] text-slate-400">{c.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                        {c.id}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700 max-w-[180px] truncate">
                        {c.knownIssues || 'None'}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {c.conversationCount}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.id === 'CUST-002' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {c.id === 'CUST-002' ? 'New Customer' : 'Returning'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            switchCustomer(c.id);
                            onNavigateToChat();
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>Chat</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Customer Profile Detail Drawer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Customer Profile</h2>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 font-mono">
              Hindsight Bank Attached
            </span>
          </div>

          {selectedProfile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-purple-500/20">
                  {selectedProfile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedProfile.name}</h3>
                  <span className="text-xs font-mono text-slate-500">{selectedProfile.id}</span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{selectedProfile.email}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedProfile.phone || '+1 (555) 000-0000'}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Last active: {new Date(selectedProfile.lastInteraction).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block">Support Preferences</span>
                <p className="text-slate-600 leading-relaxed">{selectedProfile.preferences || 'Standard email'}</p>
              </div>

              <div className="p-3.5 bg-purple-50/60 rounded-xl space-y-1.5 border border-purple-200 text-xs">
                <span className="font-bold text-purple-900 block">Hindsight Memory Scope</span>
                <p className="text-purple-700 leading-relaxed">
                  Bank ID: <code className="bg-purple-100/70 px-1 py-0.5 rounded font-mono">supportbrain_{selectedProfile.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}</code>
                </p>
                <p className="text-[11px] text-purple-600 mt-1">
                  {selectedProfile.id === 'CUST-002'
                    ? 'Currently clean. Memories will be created dynamically when interacting.'
                    : 'Contains historical context on payment and service troubleshooting.'}
                </p>
              </div>

              <button
                onClick={() => {
                  switchCustomer(selectedProfile.id);
                  onNavigateToChat();
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-purple-600/20 active:scale-95 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Chat with {selectedProfile.name}</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select a customer to view profile details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
