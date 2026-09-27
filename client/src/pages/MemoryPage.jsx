import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Tag, 
  Database,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useCustomer } from '../context/CustomerContext';

export default function MemoryPage() {
  const { customers, selectedCustomerId, switchCustomer, selectedCustomer } = useCustomer();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testQuery, setTestQuery] = useState('');
  const [recallResults, setRecallResults] = useState(null);
  const [testingRecall, setTestingRecall] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newMem, setNewMem] = useState({ problem: '', solution: '', outcome: 'Successful', notes: '' });

  const loadMemories = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      const res = await api.getCustomerMemories(selectedCustomerId);
      setMemories(res.memories || []);
    } catch (err) {
      console.error('Error loading customer memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
    setRecallResults(null);
  }, [selectedCustomerId]);

  const handleTestRecall = async (e) => {
    e.preventDefault();
    if (!testQuery.trim() || testingRecall) return;

    setTestingRecall(true);
    try {
      const res = await api.testRecall(selectedCustomerId, testQuery.trim());
      setRecallResults(res);
    } catch (err) {
      console.error('Error testing recall:', err);
      setRecallResults({ available: false, error: err.message, memories: [] });
    } finally {
      setTestingRecall(false);
    }
  };

  const handleCreateMemory = async (e) => {
    e.preventDefault();
    if (!newMem.problem || !newMem.solution) return;

    try {
      await api.retainMemory(selectedCustomerId, newMem);
      setAddModalOpen(false);
      setNewMem({ problem: '', solution: '', outcome: 'Successful', notes: '' });
      await loadMemories();
    } catch (err) {
      alert('Error retaining memory: ' + err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Hindsight Memory Inspector</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full border border-purple-200">
              Persistent Store
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Audit and test persistent semantic memory banks isolated per customer using official Hindsight SDK.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm shadow-purple-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Retain New Memory</span>
        </button>
      </div>

      {/* Customer Selector Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memory Bank:</span>
          <div className="flex gap-2">
            {customers.map((c) => {
              const active = c.id === selectedCustomerId;
              return (
                <button
                  key={c.id}
                  onClick={() => switchCustomer(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {c.name} ({c.id}) {c.id === 'CUST-002' ? '[New]' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          Bank ID: <span className="text-purple-700 font-bold">supportbrain_{selectedCustomerId.toLowerCase().replace(/[^a-z0-9]/g, '_')}</span>
        </div>
      </div>

      {/* Live Recall Simulator Tool */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/30 text-purple-300 flex items-center justify-center border border-purple-500/40">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Live Query Recall Simulator</h2>
              <p className="text-xs text-slate-400">Test how Hindsight retrieves memories against arbitrary customer problem queries</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30">
            Hindsight SDK Recall
          </span>
        </div>

        <form onSubmit={handleTestRecall} className="flex gap-3">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="e.g. My payment failed again, or I forgot my password..."
            className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={testingRecall || !testQuery.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all flex-shrink-0"
          >
            {testingRecall ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Run Recall</span>
          </button>
        </form>

        {/* Live Recall Results Output */}
        {recallResults && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                Retrieval Result: {recallResults.memories?.length || 0} memories matched
              </span>
              <span className="text-[11px] font-mono text-purple-300">
                Status: {recallResults.available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            {recallResults.memories?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recallResults.memories.map((m, idx) => (
                  <div key={idx} className="bg-slate-800/80 border border-purple-500/30 p-3.5 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-purple-300">{m.problem}</span>
                      <span className="text-[10px] font-mono bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded border border-purple-700">
                        Score: {m.score}
                      </span>
                    </div>
                    <p className="text-slate-300">Solution: {m.solution}</p>
                    <p className="text-emerald-400 font-semibold">Outcome: {m.outcome}</p>
                    <p className="text-[11px] text-slate-400 font-mono italic">"{m.text}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No memories passed relevance threshold for this query.</p>
            )}
          </div>
        )}
      </div>

      {/* Persistent Memories Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">
              Retained Memories in Hindsight ({memories.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Customer: <span className="font-bold text-slate-900">{selectedCustomer?.name}</span>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading customer memories from Hindsight...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
            <Brain className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No memories retained for {selectedCustomer?.name}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {selectedCustomer?.id === 'CUST-002'
                ? 'Alex Rivera is a brand new customer. As interactions occur in the Support Chat, useful problems, solutions, and outcomes will be retained here automatically!'
                : 'No memories are currently stored in this customer bank.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="bg-white border-2 border-slate-200/90 hover:border-purple-300 p-5 rounded-2xl shadow-sm transition-all relative overflow-hidden space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {mem.source || 'Hindsight Bank'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(mem.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Problem / Issue
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5">{mem.problem}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Attempted Solution
                    </span>
                    <p className="text-slate-700 font-medium mt-0.5">{mem.solution}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Outcome
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {mem.outcome || 'Successful'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                  "{mem.text}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Memory Ingestion Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Retain Memory into Hindsight</h3>
            <p className="text-xs text-slate-500">
              Manually add a confirmed problem and solution to <span className="font-bold">{selectedCustomer?.name}</span>'s memory bank.
            </p>

            <form onSubmit={handleCreateMemory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Problem / Issue Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment failure"
                  value={newMem.problem}
                  onChange={(e) => setNewMem({ ...newMem, problem: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Solution Attempted</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment retry with 3D Secure verification"
                  value={newMem.solution}
                  onChange={(e) => setNewMem({ ...newMem, solution: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Outcome</label>
                <select
                  value={newMem.outcome}
                  onChange={(e) => setNewMem({ ...newMem, outcome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Successful">Successful</option>
                  <option value="Unresolved">Unresolved</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Additional Context / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional context about the interaction..."
                  value={newMem.notes}
                  onChange={(e) => setNewMem({ ...newMem, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
                >
                  Retain to Hindsight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
