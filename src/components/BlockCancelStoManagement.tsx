import React, { useState, useMemo } from 'react';
import {
  Ban,
  Plus,
  Trash2,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmationModal } from './ConfirmationModal';
import { parseAndValidateStoTokens } from '../services/stoPendingService';

export const BlockCancelStoManagement: React.FC = () => {
  const { blockedStos, addBlockedStos, removeBlockedSto, resetBlockedStos } = useApp();

  const [rawInput, setRawInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'warning';
    text: string;
  } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Filter blocked STOs by search term
  const filteredBlockedStos = useMemo(() => {
    if (!searchTerm.trim()) return blockedStos;
    const q = searchTerm.trim().toLowerCase();
    return blockedStos.filter((sto) => sto.toLowerCase().includes(q));
  }, [blockedStos, searchTerm]);

  // Handle adding bulk STOs
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;

    const parsedTokens = parseAndValidateStoTokens(rawInput);
    if (parsedTokens.length === 0) {
      setFeedbackMessage({
        type: 'warning',
        text: 'No valid numeric STO numbers detected. Please verify input (letters and non-numeric labels are ignored).',
      });
      return;
    }

    const { addedCount } = addBlockedStos(rawInput);
    const totalFound = parsedTokens.length;

    if (addedCount > 0) {
      setFeedbackMessage({
        type: 'success',
        text: `Successfully registered ${addedCount} STO(s) to the Blocked / Cancelled list.${
          totalFound > addedCount ? ` (${totalFound - addedCount} already existed)` : ''
        }`,
      });
      setRawInput('');
    } else {
      setFeedbackMessage({
        type: 'warning',
        text: `All ${totalFound} provided STO(s) are already in the Blocked / Cancelled list.`,
      });
    }

    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden space-y-4 p-4">
      {/* Module Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              Block / Cancel STO Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Exclude cancelled or replaced STOs from the STO Pending calculations without altering source Planning or Gate records.
          </p>
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded text-xs font-semibold text-rose-900">
            <span>Blocked / Cancelled STOs:</span>
            <span className="font-mono text-sm font-bold text-rose-700">{blockedStos.length}</span>
          </div>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={blockedStos.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset Blocked STO list"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Operational Policy Banner */}
      <div className="bg-blue-50/60 border border-blue-200 rounded p-3 text-xs text-blue-950 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold">Safety & Isolation Guarantee:</span>
          <p className="text-[11px] text-blue-900">
            Adding an STO here will <strong>only</strong> exclude it from the STO Pending Monitor (Core & Partial Pending).
            It will <strong>never</strong> delete Vehicle Planning records, Vehicle Status records, Gate records, or modify relationship links.
          </p>
        </div>
      </div>

      {/* Bulk Input Form */}
      <form onSubmit={handleAddSubmit} className="space-y-2 bg-slate-50 border border-slate-200 rounded p-3">
        <label className="block text-xs font-bold text-slate-700">
          Bulk Paste / Input STOs
        </label>
        <p className="text-[11px] text-slate-500">
          Accepts comma-separated, space-separated, newline-separated, or Excel multi-line copy-paste. Non-numeric tags (e.g. MAIN, AQUA, BAKAL) are automatically filtered out.
        </p>

        <textarea
          rows={3}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Paste STO numbers here (e.g. 4210085492, 4210085493 or multi-row Excel column)..."
          className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
        />

        <div className="flex items-center justify-between">
          <div>
            {feedbackMessage && (
              <div
                className={`text-xs flex items-center gap-1.5 font-medium ${
                  feedbackMessage.type === 'success' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {feedbackMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{feedbackMessage.text}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add STOs to Block List</span>
          </button>
        </div>
      </form>

      {/* Blocked STO List & Management Table */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
            Active Blocked / Cancelled STO Registry ({blockedStos.length})
          </h3>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search in blocked list..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded max-h-[350px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] sticky top-0 z-10 shadow-xs">
              <tr className="divide-x divide-slate-200">
                <th className="py-2 px-2 text-center w-12">#</th>
                <th className="py-2 px-4 w-48 font-bold text-rose-950">Blocked STO Number</th>
                <th className="py-2 px-4">Exclusion Rule Effect</th>
                <th className="py-2 px-2 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredBlockedStos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    {searchTerm
                      ? `No blocked STO matching "${searchTerm}".`
                      : 'No STOs currently blocked or cancelled.'}
                  </td>
                </tr>
              ) : (
                filteredBlockedStos.map((sto, idx) => (
                  <tr key={sto} className="hover:bg-rose-50/40 divide-x divide-slate-100">
                    <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50/50">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-4 font-mono font-bold text-rose-900">
                      <span className="bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200 text-xs">
                        {sto}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Excluded from STO Pending Monitor (Core & Partial)
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => removeBlockedSto(sto)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Remove from blocked list (Restore to calculations)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset Blocked / Cancelled STO List?"
        message={`Are you sure you want to clear all ${blockedStos.length} blocked STO(s)? This will restore all unblocked STOs back into the STO Pending calculations. Vehicle Plans, Vehicle Status records, and Gate records will remain untouched.`}
        confirmText="Reset Blocked List"
        confirmVariant="danger"
        onConfirm={() => {
          resetBlockedStos();
          setIsResetConfirmOpen(false);
          setFeedbackMessage({
            type: 'success',
            text: 'Cleared all Blocked / Cancelled STOs.',
          });
          setTimeout(() => setFeedbackMessage(null), 3000);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
