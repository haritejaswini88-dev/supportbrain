import React from 'react';
import { 
  Brain, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Tag, 
  RotateCcw,
  ShieldCheck,
  User,
  Info
} from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';

export default function MemoryPanel() {
  const { selectedCustomer, memoryState } = useCustomer();
  const { status, memories, recurringIssue, error, lastQuery } = memoryState;

  return (
    <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto select-none flex-shrink-0">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Hindsight Memory</h2>
            <p className="text-[11px] text-slate-500 font-medium">Real-time recall engine</p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded-full border border-purple-200">
          Persistent
        </span>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Memory Retrieval States */}

        {/* STATE 2: SEARCHING */}
        {status === 'searching' && (
          <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 text-center animate-pulse">
            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 mx-auto flex items-center justify-center mb-2.5">
              <Search className="w-4 h-4 animate-spin" />
            </div>
            <h4 className="text-xs font-bold text-purple-900">Searching customer memory...</h4>
            <p className="text-[11px] text-purple-700 mt-1">
              Querying Hindsight memory bank for <span className="font-semibold">{selectedCustomer?.name || 'customer'}</span>
            </p>
          </div>
        )}

        {/* STATE 4: SERVICE UNAVAILABLE */}
        {status === 'unavailable' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Memory service temporarily unavailable</h4>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  SupportBrain AI continues to operate normally, but historical recall from Hindsight is currently offline.
                </p>
                {error && (
                  <p className="text-[10px] font-mono text-amber-800 bg-amber-100/60 p-1.5 rounded mt-2 break-all">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATE 1: NO RELEVANT MEMORY FOUND */}
        {(status === 'none' || (status === 'idle' && memories.length === 0)) && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-5 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
              <Brain className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-700">🧠 No relevant previous memory found</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {selectedCustomer?.id === 'CUST-002'
                ? 'Alex Rivera is a new customer with zero prior recorded support interactions.'
                : 'No prior interactions or solutions matched this specific inquiry. Generating fresh support.'}
            </p>
          </div>
        )}

        {/* STATE 3: RELEVANT MEMORY FOUND */}
        {status === 'found' && memories.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>🧠 Relevant Memory Found ({memories.length})</span>
              </span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                Context Loaded
              </span>
            </div>

            {memories.map((mem, idx) => (
              <div
                key={mem.id || idx}
                className="bg-white border-2 border-purple-200/90 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/5 rounded-bl-full pointer-events-none" />

                <div className="space-y-2.5 text-xs">
                  {/* Previous Issue */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Previous Issue
                    </span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {mem.problem || 'Payment failure'}
                    </p>
                  </div>

                  {/* Previous Solution */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Previous Solution
                    </span>
                    <p className="text-slate-700 font-medium mt-0.5">
                      {mem.solution || 'Payment retry'}
                    </p>
                  </div>

                  {/* Outcome */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Outcome
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {mem.outcome || 'Successful'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Source
                      </span>
                      <span className="text-[11px] text-purple-700 font-medium">
                        {mem.source || 'Previous interaction'}
                      </span>
                    </div>
                  </div>

                  {/* Raw note text snippet if available */}
                  {mem.text && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 font-mono leading-tight">
                      "{mem.text.slice(0, 140)}..."
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECURRING ISSUE DETECTION BADGE */}
        {recurringIssue && recurringIssue.detected && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
            <div className="flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5 animate-spin-reverse" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-red-900">Recurring Issue Detected</h4>
                  <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                    {recurringIssue.count} interactions
                  </span>
                </div>
                <p className="text-[11px] text-red-700 mt-1">
                  Customer has experienced <span className="font-semibold">{recurringIssue.issue}</span> multiple times.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER PROFILE CARD */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 mt-4">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">Customer Profile</span>
            </div>
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
              Demo Data
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{selectedCustomer?.name || 'Hari'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer ID:</span>
              <span className="font-mono font-medium text-slate-700">{selectedCustomer?.id || 'CUST-001'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Previous Conversations:</span>
              <span className="font-semibold text-slate-800">{selectedCustomer?.previousConversations ?? 2}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500">Known Issues:</span>
              <span className="font-medium text-slate-800 text-right max-w-[160px] truncate">
                {selectedCustomer?.knownIssues || 'None recorded'}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500">Preferences:</span>
              <span className="text-slate-700 text-right max-w-[160px] truncate">
                {selectedCustomer?.preferences || 'Email support'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Interaction:</span>
              <span className="text-slate-700">{selectedCustomer?.lastInteraction || 'Recently'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
