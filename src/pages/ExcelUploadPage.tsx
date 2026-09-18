import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clipboard,
  FileText,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TablePagination } from '../components/TablePagination';
import {
  parseExcelWorkbookDynamic,
  parseGatePasteDynamic,
  DetectedColumnMap,
} from '../services/gateParserService';
import { GateRecord } from '../types/models';

export const ExcelUploadPage: React.FC = () => {
  const {
    gateRecords,
    appendGateRecords,
    replaceGateRecords,
    resetGateRecords,
    getFilterState,
    updateFilterState,
  } = useApp();

  const filterKey = 'excel_upload';
  const filterState = getFilterState(filterKey);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadMode, setUploadMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Direct paste support
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  // Dynamic header mapping diagnostics
  const [sheetDiagnostics, setSheetDiagnostics] = useState<DetectedColumnMap[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseExcelWorkbookDynamic(file);
      setSheetDiagnostics(result.sheetDiagnostics);

      if (result.records.length === 0) {
        const errorDetail =
          result.errors.length > 0
            ? result.errors.join(' | ')
            : 'Required Gate field not detected: STO / Gate Slip / Vehicle No. / Gate In / Gate Out';
        setStatusMessage({
          text: `Upload failed: ${errorDetail}`,
          isError: true,
        });
        return;
      }

      if (uploadMode === 'REPLACE') {
        replaceGateRecords(result.records);
      } else {
        appendGateRecords(result.records);
      }

      const validSheets = result.sheetDiagnostics.filter((s) => s.isValid).map((s) => s.sheetName);
      setStatusMessage({
        text: `Successfully ${uploadMode === 'REPLACE' ? 'replaced with' : 'appended'} ${result.records.length} canonical Gate records from ${file.name} (Sheets: ${validSheets.join(', ')}).`,
        isError: false,
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setStatusMessage({ text: `Failed to parse Excel file: ${err.message}`, isError: true });
    }
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) {
      setStatusMessage({ text: 'Please paste gate text data first.', isError: true });
      return;
    }

    try {
      const result = parseGatePasteDynamic(pasteText);
      setSheetDiagnostics(result.sheetDiagnostics);

      if (result.records.length === 0) {
        const errorDetail =
          result.errors.length > 0
            ? result.errors.join(' | ')
            : 'Required Gate field not detected: STO / Gate Slip / Vehicle No. / Gate In / Gate Out';
        setStatusMessage({
          text: `Parse failed: ${errorDetail}`,
          isError: true,
        });
        return;
      }

      if (uploadMode === 'REPLACE') {
        replaceGateRecords(result.records);
      } else {
        appendGateRecords(result.records);
      }

      setStatusMessage({
        text: `Parsed and applied ${result.records.length} canonical Gate records with dynamic column resolution.`,
        isError: false,
      });
      setPasteText('');
      setShowPasteBox(false);
    } catch (err: any) {
      setStatusMessage({ text: `Parse error: ${err.message}`, isError: true });
    }
  };

  // Filter gate records
  const filteredRecords = gateRecords.filter((rec) => {
    if (!filterState.globalSearch) return true;
    const q = filterState.globalSearch.toLowerCase();
    return (
      rec.sto.toLowerCase().includes(q) ||
      rec.gateSlip.toLowerCase().includes(q) ||
      rec.vehicleNumber.toLowerCase().includes(q) ||
      (rec.remarks && rec.remarks.toLowerCase().includes(q))
    );
  });

  const paginatedRecords = filteredRecords.slice(
    (filterState.currentPage - 1) * filterState.rowsPerPage,
    filterState.currentPage * filterState.rowsPerPage
  );

  return (
    <div className="p-4 space-y-4 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 rounded p-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Excel Upload (Gate In / Gate Out Integration)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sole source for vehicle execution data. Matching rule (Section 18): Join key is{' '}
            <strong className="text-blue-800 font-mono">STO Number ONLY</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPasteBox(!showPasteBox)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5 text-blue-700" />
            <span>Paste Text Mode</span>
          </button>

          {gateRecords.length > 0 && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Gate Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone & Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 rounded p-6 text-center transition-colors shadow-xs flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-blue-50 rounded-full text-blue-700">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm">Upload Excel or CSV Gate File</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Select or drop your operational Gate log file (.xlsx, .xls, .csv). Supported columns:{' '}
              <code className="text-slate-700 font-mono bg-slate-100 px-1 py-0.5 rounded">
                Gate Slip | Vehicle In | Vehicle Number | Vehicle Out | STO Number | Remarks
              </code>
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
            <span>Import Mode:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="gateMode"
                checked={uploadMode === 'APPEND'}
                onChange={() => setUploadMode('APPEND')}
                className="text-blue-600"
              />
              <span>Append</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="gateMode"
                checked={uploadMode === 'REPLACE'}
                onChange={() => setUploadMode('REPLACE')}
                className="text-rose-600"
              />
              <span className="text-rose-800">Replace Dataset</span>
            </label>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              id="gate-file-input"
            />
            <label
              htmlFor="gate-file-input"
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Browse & Process File</span>
            </label>
          </div>
        </div>

        {/* Informational Guidance Panel */}
        <div className="bg-slate-50 border border-slate-300 rounded p-4 text-xs space-y-3 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Operational Gate Rules</span>
          </div>

          <ul className="space-y-2 text-slate-600 list-disc pl-4 leading-relaxed">
            <li>
              <strong>Section 18 Strict Rule:</strong> STO Number is the <em>ONLY</em> join key between Gate In / Gate Out and Vehicle Planning.
            </li>
            <li>
              No matching on dates, location, or transporter alone is permitted.
            </li>
            <li>
              When a plan has multiple STOs, the first matching Gate record provides the vehicle execution metrics.
            </li>
            <li>
              Conflicting gate slips across active plans immediately raise centralized system alerts.
            </li>
          </ul>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-slate-500 block text-[11px]">Total Gate Records Stored:</span>
            <span className="font-mono text-base font-bold text-slate-800">{gateRecords.length} records</span>
          </div>
        </div>
      </div>

      {/* Direct Paste Drawer */}
      {showPasteBox && (
        <div className="bg-white border border-slate-300 rounded p-4 space-y-3 text-xs animate-in fade-in duration-100 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900">Paste Gate In/Out Tabular Data</span>
            <span className="text-[11px] text-slate-500">
              Columns: Gate Slip | Vehicle In | Vehicle Number | Vehicle Out | STO Number | Remarks
            </span>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`GS-1001\t14-09-2026 09:30\tMH20AA1234\t14-09-2026 18:45\t4210085492\tLoaded and released
GS-1002\t14-09-2026 10:15\tMH20BB5678\t\t4210085493\tOnloading`}
            rows={5}
            className="w-full font-mono text-xs p-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPasteBox(false)}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessPaste}
              className="px-4 py-1 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800"
            >
              Parse Pasted Gate Data
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3 rounded border text-xs flex items-center gap-2 ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          {statusMessage.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Dynamic Column Mapping Summary Card (Diagnostic Info) */}
      {sheetDiagnostics.length > 0 && (
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <span className="font-bold text-slate-800">
                Dynamic Header Recognition & Column Resolution
              </span>
              <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                {sheetDiagnostics.length} Sheet(s) Analyzed
              </span>
            </div>
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
            >
              <span>{showDiagnostics ? 'Collapse Mapping' : 'Show Mapping Details'}</span>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showDiagnostics && (
            <div className="p-3 space-y-3 bg-slate-50/50">
              <p className="text-[11px] text-slate-500 italic">
                Rule: Column positions are NEVER hardcoded. All fields are resolved purely from semantic headers, ignoring position and unrelated columns.
              </p>

              {sheetDiagnostics.map((diag, sIdx) => (
                <div
                  key={sIdx}
                  className={`p-3 rounded border ${
                    diag.isValid ? 'bg-white border-slate-200' : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 font-mono">{diag.sheetName}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          diag.sheetType === 'COMBINED'
                            ? 'bg-blue-100 text-blue-800'
                            : diag.sheetType === 'GATE_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : diag.sheetType === 'GATE_OUT'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {diag.sheetType}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Header row detected at: <strong>Row {diag.headerRowIndex + 1}</strong>
                      </span>
                    </div>

                    {!diag.isValid ? (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Missing Required Field: {diag.missingRequiredFields.join(', ')}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Canonical Mapping Resolved
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {/* STO */}
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">STO Number</span>
                      {diag.stoColIndex !== -1 ? (
                        <div>
                          <span className="font-bold text-blue-900 block truncate" title={diag.stoColHeader}>
                            "{diag.stoColHeader}"
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Col {diag.stoColIndex + 1}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          {diag.sheetType === 'GATE_OUT' ? 'Optional (Not present)' : 'Not detected'}
                        </span>
                      )}
                    </div>

                    {/* Gate Slip */}
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Gate Slip</span>
                      {diag.slipColIndex !== -1 ? (
                        <div>
                          <span className="font-bold text-emerald-800 block truncate" title={diag.slipColHeader}>
                            "{diag.slipColHeader}"
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Col {diag.slipColIndex + 1}</span>
                        </div>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px]">Required (Missing)</span>
                      )}
                    </div>

                    {/* Vehicle Number */}
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Vehicle Number</span>
                      {diag.vehicleNoColIndex !== -1 ? (
                        <div>
                          <span className="font-bold text-slate-900 block truncate" title={diag.vehicleNoColHeader}>
                            "{diag.vehicleNoColHeader}"
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Col {diag.vehicleNoColIndex + 1}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          {diag.sheetType === 'GATE_OUT' ? 'Optional' : 'Not detected'}
                        </span>
                      )}
                    </div>

                    {/* Gate In */}
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Gate In</span>
                      {diag.gateInColIndex !== -1 ? (
                        <div>
                          <span className="font-bold text-slate-900 block truncate" title={diag.gateInColHeader}>
                            "{diag.gateInColHeader}"
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Col {diag.gateInColIndex + 1}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          {diag.sheetType === 'GATE_OUT' ? 'Optional (Gate Out Only)' : 'Not detected'}
                        </span>
                      )}
                    </div>

                    {/* Gate Out */}
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Gate Out</span>
                      {diag.gateOutColIndex !== -1 ? (
                        <div>
                          <span className="font-bold text-slate-900 block truncate" title={diag.gateOutColHeader}>
                            "{diag.gateOutColHeader}"
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Col {diag.gateOutColIndex + 1}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          {diag.sheetType === 'GATE_IN' ? 'Optional (Pending Exit)' : 'Not detected'}
                        </span>
                      )}
                    </div>

                    {/* Remarks */}
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Remarks</span>
                      {diag.remarksColIndex !== -1 ? (
                        <div>
                          <span className="font-bold text-slate-700 block truncate" title={diag.remarksColHeader}>
                            "{diag.remarksColHeader}"
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Col {diag.remarksColIndex + 1}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Auto / Optional</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gate Records Table */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        <div className="p-2.5 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-800">
            Registered Gate Records ({filteredRecords.length})
          </span>

          <input
            type="text"
            value={filterState.globalSearch}
            onChange={(e) => updateFilterState(filterKey, { globalSearch: e.target.value, currentPage: 1 })}
            placeholder="Search by STO, Slip, Vehicle No..."
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr className="divide-x divide-slate-200">
                <th className="py-2 px-2 text-center w-12">#</th>
                <th className="py-2 px-3 w-36">STO Number (Key)</th>
                <th className="py-2 px-3 w-32">Gate Slip</th>
                <th className="py-2 px-3 w-32">Vehicle Number</th>
                <th className="py-2 px-3 w-36">Vehicle In</th>
                <th className="py-2 px-3 w-36">Vehicle Out</th>
                <th className="py-2 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No Gate records found. Upload an Excel file or paste gate rows above.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => {
                  const sNo = (filterState.currentPage - 1) * filterState.rowsPerPage + idx + 1;
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-100 text-slate-800"
                    >
                      <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50">
                        {sNo}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900">
                        <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {rec.sto}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-emerald-800">
                        {rec.gateSlip}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {rec.vehicleNumber}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {rec.vehicleInTime || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {rec.vehicleOutTime || '—'}
                      </td>
                      <td className="py-2 px-4 text-slate-700">
                        {rec.remarks || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          totalItems={filteredRecords.length}
          currentPage={filterState.currentPage}
          rowsPerPage={filterState.rowsPerPage}
          onPageChange={(p) => updateFilterState(filterKey, { currentPage: p })}
          onRowsPerPageChange={(r) => updateFilterState(filterKey, { rowsPerPage: r })}
        />
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset All Gate Records?"
        message="This will clear all uploaded Gate In/Gate Out entries. Vehicle Plans will show empty gate data until new gate records are uploaded. Are you sure?"
        confirmText="Reset Gate Records"
        confirmVariant="danger"
        onConfirm={() => {
          resetGateRecords();
          setIsResetConfirmOpen(false);
          setStatusMessage({ text: 'All gate records have been cleared.', isError: false });
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
