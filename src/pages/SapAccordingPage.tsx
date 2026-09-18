import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Trash2,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TablePagination } from '../components/TablePagination';
import { SapRecord } from '../types/models';

export const SapAccordingPage: React.FC = () => {
  const {
    sapSubTab,
    setSapSubTab,
    sapRecords,
    addSapRecord,
    deleteSapRecord,
    plans,
    getFilterState,
    updateFilterState,
  } = useApp();

  const filterKey = 'sap_according';
  const filterState = getFilterState(filterKey);

  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SapRecord | null>(null);

  // New SAP Record
  const [date, setDate] = useState('14-09-2026');
  const [docNumber, setDocNumber] = useState('');
  const [stoNumber, setStoNumber] = useState('');
  const [plant, setPlant] = useState('1001');
  const [material, setMaterial] = useState('Finished Goods');
  const [quantity, setQuantity] = useState('18');
  const [uom, setUom] = useState('TO');
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'PENDING' | 'ERROR'>('SYNCED');

  const currentMode =
    sapSubTab === 'online' ? 'ONLINE' : sapSubTab === 'offline' ? 'OFFLINE' : 'ONLINE';

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !docNumber || !stoNumber) {
      alert('Please fill Date, SAP Document Number, and STO Number.');
      return;
    }

    addSapRecord({
      date,
      docNumber: docNumber.trim(),
      stoNumber: stoNumber.trim(),
      plant: plant.trim(),
      material: material.trim(),
      quantity: Number(quantity) || 0,
      uom: uom.trim(),
      mode: currentMode,
      syncStatus,
    });

    setDocNumber('');
    setStoNumber('');
    setShowAddForm(false);
  };

  const handleExportData = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sapRecords, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `SAP_Records_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ['S.No', 'Date', 'Mode', 'SAP Doc No', 'STO Number', 'Plant', 'Material', 'Quantity', 'UoM', 'Sync Status'];
      const rows = sapRecords.map((r, i) => [
        String(i + 1),
        r.date,
        r.mode,
        r.docNumber,
        r.stoNumber,
        r.plant,
        r.material,
        String(r.quantity),
        r.uom,
        r.syncStatus,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SAP_Records_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Filtered by sub-tab and search
  const filteredRecords = sapRecords.filter((rec) => {
    if (sapSubTab === 'online' && rec.mode !== 'ONLINE') return false;
    if (sapSubTab === 'offline' && rec.mode !== 'OFFLINE') return false;
    if (sapSubTab === 'raipur-local' && !rec.material.toLowerCase().includes('raipur') && rec.plant !== 'RAIPUR') {
      // allow all if none specifically marked
    }

    if (!filterState.globalSearch) return true;
    const q = filterState.globalSearch.toLowerCase();
    return (
      rec.docNumber.toLowerCase().includes(q) ||
      rec.stoNumber.toLowerCase().includes(q) ||
      rec.plant.toLowerCase().includes(q) ||
      rec.material.toLowerCase().includes(q)
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
            <Layers className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              SAP According (ERP Synchronized Module)
            </h2>
          </div>
        </div>

        {/* Sub-tab Switcher (Section 44) */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded p-1">
          {(['dashboard', 'online', 'offline', 'raipur-local', 'export'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSapSubTab(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded capitalize transition-all ${
                sapSubTab === tab
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* SubTab Views */}
      {sapSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total SAP Records</span>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-900">{sapRecords.length}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">ERP ledger entries</span>
          </div>

          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Online Direct</span>
            <div className="mt-1 text-2xl font-bold font-mono text-blue-700">
              {sapRecords.filter((r) => r.mode === 'ONLINE').length}
            </div>
            <span className="text-[11px] text-blue-600 mt-1 block">Real-time synced</span>
          </div>

          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Offline Buffer</span>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-600">
              {sapRecords.filter((r) => r.mode === 'OFFLINE').length}
            </div>
            <span className="text-[11px] text-amber-600 mt-1 block">Pending transmission</span>
          </div>

          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Plans in Sync</span>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-700">
              {plans.length}
            </div>
            <span className="text-[11px] text-emerald-600 mt-1 block">Active dispatch plans</span>
          </div>
        </div>
      )}

      {sapSubTab === 'export' && (
        <div className="bg-white border border-slate-300 rounded p-6 shadow-xs space-y-4 max-w-xl">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Export SAP Reconciled Datasets</h3>
            <p className="text-xs text-slate-500 mt-1">
              Download current ERP ledger and STO records in structured open formats for external SAP RFC/BAPI tools.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportData('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={() => handleExportData('json')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>
      )}

      {/* Online, Offline, or Table View */}
      {(sapSubTab === 'online' || sapSubTab === 'offline' || sapSubTab === 'raipur-local' || sapSubTab === 'dashboard') && (
        <div className="space-y-3">
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add SAP Document</span>
            </button>

            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={filterState.globalSearch}
                onChange={(e) => updateFilterState(filterKey, { globalSearch: e.target.value, currentPage: 1 })}
                placeholder="Search doc number, STO..."
                className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddSubmit}
              className="bg-amber-50/50 border border-amber-200 rounded p-3 text-xs space-y-3 animate-in fade-in duration-100 shadow-xs"
            >
              <div className="font-bold text-amber-950 border-b border-amber-200 pb-1.5">
                Register New SAP Document ({currentMode})
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Date *</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">SAP Doc No *</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="9000123456"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">STO Number *</label>
                  <input
                    type="text"
                    value={stoNumber}
                    onChange={(e) => setStoNumber(e.target.value)}
                    placeholder="4210085492"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Plant</label>
                  <input
                    type="text"
                    value={plant}
                    onChange={(e) => setPlant(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Material</label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Qty</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">UoM</label>
                  <input
                    type="text"
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Sync Status</label>
                  <select
                    value={syncStatus}
                    onChange={(e) => setSyncStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    <option value="SYNCED">Synced</option>
                    <option value="PENDING">Pending</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-700 text-white font-medium rounded hover:bg-amber-800"
                >
                  Save Record
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
              <table className="w-full text-xs text-center border-collapse font-sans">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                  <tr className="divide-x divide-slate-200">
                    <th className="py-1 px-1.5 text-center w-12">#</th>
                    <th className="py-1 px-2 text-center w-24">Date</th>
                    <th className="py-1 px-2 text-center w-20">Mode</th>
                    <th className="py-1 px-2 text-center w-32">SAP Doc No</th>
                    <th className="py-1 px-2 text-center w-32">STO Number</th>
                    <th className="py-1 px-1.5 text-center w-16">Plant</th>
                    <th className="py-1 px-2 text-center w-36">Material</th>
                    <th className="py-1 px-1.5 text-center w-20">Quantity</th>
                    <th className="py-1 px-1.5 text-center w-16">UoM</th>
                    <th className="py-1 px-2 text-center w-24">Sync</th>
                    <th className="py-1 px-1.5 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        No SAP records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((rec, idx) => {
                      const sNo = (filterState.currentPage - 1) * filterState.rowsPerPage + idx + 1;
                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-amber-50/30 transition-colors divide-x divide-slate-100 text-slate-800 leading-tight"
                        >
                          <td className="py-1 px-1.5 text-center font-mono text-slate-500 bg-slate-50">
                            {sNo}
                          </td>
                          <td className="py-1 px-2 font-medium text-center">{rec.date}</td>
                          <td className="py-1 px-2 font-mono text-[10px] uppercase font-semibold text-slate-600 text-center">
                            {rec.mode}
                          </td>
                          <td className="py-1 px-2 font-mono font-bold text-slate-900 text-center">{rec.docNumber}</td>
                          <td className="py-1 px-2 font-mono font-bold text-blue-900 text-center">
                            <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {rec.stoNumber}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 font-mono text-slate-600 text-center">{rec.plant}</td>
                          <td className="py-1 px-2 text-slate-700 text-center">{rec.material}</td>
                          <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-800">
                            {rec.quantity}
                          </td>
                          <td className="py-1 px-1.5 text-center font-mono text-slate-500">{rec.uom}</td>
                          <td className="py-1 px-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                rec.syncStatus === 'SYNCED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.syncStatus === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {rec.syncStatus}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center">
                            <button
                              onClick={() => setDeleteTarget(rec)}
                              title="Delete SAP record"
                              className="p-1 text-rose-600 hover:text-rose-800 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete SAP Record"
        message={`Are you sure you want to delete SAP Doc "${deleteTarget?.docNumber}" for STO ${deleteTarget?.stoNumber}?`}
        confirmText="Delete Record"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteSapRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
