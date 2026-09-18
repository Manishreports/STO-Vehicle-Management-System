import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Check,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoPendingItem, formatPendingItemsForExcel } from '../services/stoPendingService';
import { formatWeight } from '../utils/weightFormatter';

export const StoPendingMonitor: React.FC = () => {
  const {
    corePendingItems,
    partialPendingItems,
    blockedStos,
    completedStos,
    toggleCompletedSto,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'core' | 'partial'>('core');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSection, setCopiedSection] = useState<'core' | 'partial' | null>(null);

  // Filter items based on user search
  const filteredCore = useMemo(() => {
    if (!searchTerm.trim()) return corePendingItems;
    const q = searchTerm.trim().toLowerCase();
    return corePendingItems.filter(
      (item) =>
        item.sto.toLowerCase().includes(q) ||
        item.cfa.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.loading.toLowerCase().includes(q) ||
        (item.vehicleNumber || '').toLowerCase().includes(q) ||
        (item.gateSlip || '').toLowerCase().includes(q)
    );
  }, [corePendingItems, searchTerm]);

  const filteredPartial = useMemo(() => {
    if (!searchTerm.trim()) return partialPendingItems;
    const q = searchTerm.trim().toLowerCase();
    return partialPendingItems.filter(
      (item) =>
        item.sto.toLowerCase().includes(q) ||
        item.cfa.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.loading.toLowerCase().includes(q) ||
        (item.vehicleNumber || '').toLowerCase().includes(q) ||
        (item.gateSlip || '').toLowerCase().includes(q)
    );
  }, [partialPendingItems, searchTerm]);

  // Handle Copy to Excel (TSV clipboard)
  const handleCopyToExcel = (type: 'core' | 'partial') => {
    const targetItems = type === 'core' ? filteredCore : filteredPartial;
    const label = type === 'core' ? 'Core Pending (Vehicle Out Pending)' : 'Partial Pending (Incomplete STO)';
    const tsvData = formatPendingItemsForExcel(targetItems, label);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvData).then(() => {
        setCopiedSection(type);
        setTimeout(() => setCopiedSection(null), 2500);
      });
    }
  };

  const currentItems = activeSubTab === 'core' ? filteredCore : filteredPartial;

  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden space-y-3 p-4">
      {/* Header and Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" />
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              STO Pending Monitor
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational tracking of unblocked STOs. Automatically excludes{' '}
            <span className="font-semibold text-rose-700">{blockedStos.length} Blocked/Cancelled STOs</span>.
          </p>
        </div>

        {/* Section Action / Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopyToExcel(activeSubTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors shadow-xs ${
              copiedSection === activeSubTab
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
            title={`Copy ${activeSubTab === 'core' ? 'Core Pending' : 'Partial Pending'} to Excel clipboard`}
          >
            {copiedSection === activeSubTab ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>COPY TO EXCEL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Core Pending vs Partial Pending */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
          <button
            onClick={() => setActiveSubTab('core')}
            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
              activeSubTab === 'core'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Core Pending ({corePendingItems.length})
            <span className="ml-1.5 text-[10px] font-normal text-slate-500">
              [Vehicle Out NOT DONE]
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('partial')}
            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
              activeSubTab === 'partial'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Partial Pending ({partialPendingItems.length})
            <span className="ml-1.5 text-[10px] font-normal text-slate-500">
              [Vehicle Out DONE | STO Incomplete]
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search STO, CFA, Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Distinction Info Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-[11px] text-slate-600 flex items-center justify-between">
        <div>
          {activeSubTab === 'core' ? (
            <span>
              <strong>Core Pending:</strong> Unblocked STOs on active plans where vehicle dispatch/out has NOT happened.
            </span>
          ) : (
            <span>
              <strong>Partial Pending:</strong> Unblocked STOs where the vehicle has dispatched, but individual STO fulfillment remains incomplete.
            </span>
          )}
        </div>
        <div className="font-mono text-slate-500">
          Showing {currentItems.length} unique deduplicated STO{currentItems.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Operational Table */}
      <div className="overflow-x-auto border border-slate-200 rounded max-h-[500px]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] sticky top-0 z-10 shadow-xs">
            <tr className="divide-x divide-slate-200">
              <th className="py-2 px-2 text-center w-10">#</th>
              <th className="py-2 px-3 w-28">Date</th>
              <th className="py-2 px-3 w-36">CFA</th>
              <th className="py-2 px-3 w-36">Loading</th>
              <th className="py-2 px-3 text-right w-24">Weight</th>
              <th className="py-2 px-3 w-28">Location</th>
              <th className="py-2 px-3 w-36 font-bold text-blue-950">STO Number</th>
              <th className="py-2 px-3 w-28">Gate Slip</th>
              <th className="py-2 px-3 w-32">Vehicle No</th>
              <th className="py-2 px-3 w-28">Vehicle In</th>
              <th className="py-2 px-3 w-28">Vehicle Out</th>
              <th className="py-2 px-3">Status</th>
              {activeSubTab === 'partial' && (
                <th className="py-2 px-2 text-center w-28">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {currentItems.length === 0 ? (
              <tr>
                <td
                  colSpan={activeSubTab === 'partial' ? 13 : 12}
                  className="py-8 text-center text-slate-400"
                >
                  {searchTerm
                    ? `No matching ${activeSubTab === 'core' ? 'Core' : 'Partial'} Pending STOs found for "${searchTerm}".`
                    : `No ${activeSubTab === 'core' ? 'Core' : 'Partial'} Pending STOs at this time.`}
                </td>
              </tr>
            ) : (
              currentItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-blue-50/40 divide-x divide-slate-100">
                  <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50/50">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-700">{item.date}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{item.cfa}</td>
                  <td className="py-2 px-3 text-slate-700">{item.loading}</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                    {item.weight || (item.weightMt ? formatWeight(item.weightMt) : '—')}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800">{item.location}</td>
                  <td className="py-2 px-3 font-mono font-bold text-blue-900">
                    <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {item.sto}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                    {item.gateSlip || '—'}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">
                    {item.vehicleNumber || '—'}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600">{item.vehicleIn || 'Pending'}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">
                    {item.vehicleOut || 'Pending'}
                  </td>
                  <td className="py-2 px-3">
                    {activeSubTab === 'core' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Vehicle Out Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                        <Layers className="w-3 h-3 text-purple-600" />
                        <span>Dispatched (Incomplete)</span>
                      </span>
                    )}
                  </td>
                  {activeSubTab === 'partial' && (
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => toggleCompletedSto(item.sto)}
                        className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors"
                        title="Mark STO as completed / fulfilled"
                      >
                        Mark Complete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
