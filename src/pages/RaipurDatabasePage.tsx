import React, { useState } from 'react';
import {
  Database,
  Plus,
  Search,
  Trash2,
  FileSpreadsheet,
  Edit2,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TablePagination } from '../components/TablePagination';
import { RaipurRecord } from '../types/models';

export const RaipurDatabasePage: React.FC = () => {
  const {
    raipurRecords,
    addRaipurRecord,
    updateRaipurRecord,
    deleteRaipurRecord,
    resetRaipurData,
    getFilterState,
    updateFilterState,
  } = useApp();

  const filterKey = 'raipur_database';
  const filterState = getFilterState(filterKey);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RaipurRecord | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // New Record State
  const [date, setDate] = useState('14-09-2026');
  const [location, setLocation] = useState('Raipur Main Depot');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [stoNumber, setStoNumber] = useState('');
  const [weight, setWeight] = useState('18 Ton');
  const [remarks, setRemarks] = useState('');

  // Editing State
  const [editData, setEditData] = useState<Partial<RaipurRecord>>({});

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !location || !vehicleNumber) {
      alert('Please fill Date, Location, and Vehicle Number.');
      return;
    }

    addRaipurRecord({
      date,
      location,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      stoNumber: stoNumber.trim(),
      weight,
      remarks,
    });

    setVehicleNumber('');
    setStoNumber('');
    setRemarks('');
    setShowAddForm(false);
  };

  const startEdit = (rec: RaipurRecord) => {
    setEditingId(rec.id);
    setEditData({ ...rec });
  };

  const saveEdit = (id: string) => {
    updateRaipurRecord(id, editData);
    setEditingId(null);
  };

  const handleExportCsv = () => {
    const headers = ['S.No', 'Date', 'Location', 'Vehicle Number', 'STO Number', 'Weight', 'Remarks'];
    const rows = raipurRecords.map((r, i) => [
      String(i + 1),
      r.date,
      r.location,
      r.vehicleNumber,
      r.stoNumber,
      r.weight,
      r.remarks,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Raipur_Database_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter
  const filteredRecords = raipurRecords.filter((rec) => {
    if (!filterState.globalSearch) return true;
    const q = filterState.globalSearch.toLowerCase();
    return (
      rec.location.toLowerCase().includes(q) ||
      rec.vehicleNumber.toLowerCase().includes(q) ||
      rec.stoNumber.toLowerCase().includes(q) ||
      rec.remarks.toLowerCase().includes(q)
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
            <Database className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Raipur Database (Independent Facility Ledger)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated operational records for Raipur facility movements and dispatch tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors shadow-xs"
            title="Reset Raipur Database"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-blue-50/50 border border-blue-200 rounded p-3 text-xs space-y-3 animate-in fade-in duration-100 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2 font-bold text-blue-900">
            <span>Add Raipur Facility Movement Record</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Date *</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="14-09-2026"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Location *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Raipur Depot"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Vehicle Number *</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="CG04AA9999"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">STO Number</label>
              <input
                type="text"
                value={stoNumber}
                onChange={(e) => setStoNumber(e.target.value)}
                placeholder="4210087700"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Weight</label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="18 Ton"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Direct delivery"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              />
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
              className="px-3 py-1 bg-blue-700 text-white font-medium rounded hover:bg-blue-800"
            >
              Save Record
            </button>
          </div>
        </form>
      )}

      {/* Filter / Search */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 border border-slate-300 rounded p-2.5 text-xs">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={filterState.globalSearch}
            onChange={(e) => updateFilterState(filterKey, { globalSearch: e.target.value, currentPage: 1 })}
            placeholder="Search vehicle, location, STO..."
            className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {filterState.globalSearch && (
          <button
            onClick={() => updateFilterState(filterKey, { globalSearch: '', currentPage: 1 })}
            className="text-xs text-blue-700 hover:underline px-2 py-1"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-xs text-center border-collapse font-sans">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr className="divide-x divide-slate-200">
                <th className="py-1 px-1.5 text-center w-12">#</th>
                <th className="py-1 px-2 text-center w-28">Date</th>
                <th className="py-1 px-2 text-center w-40">Location</th>
                <th className="py-1 px-2 text-center w-36">Vehicle Number</th>
                <th className="py-1 px-2 text-center w-36">STO Number</th>
                <th className="py-1 px-2 text-center w-24">Weight</th>
                <th className="py-1 px-2 text-center">Remarks</th>
                <th className="py-1 px-1.5 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No Raipur records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => {
                  const sNo = (filterState.currentPage - 1) * filterState.rowsPerPage + idx + 1;
                  const isEditing = editingId === rec.id;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-100 text-slate-800 leading-tight"
                    >
                      <td className="py-1 px-1.5 text-center font-mono text-slate-500 bg-slate-50">
                        {sNo}
                      </td>

                      {/* Date */}
                      <td className="py-1 px-2 font-medium text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.date || ''}
                            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center"
                          />
                        ) : (
                          rec.date
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-1 px-2 font-medium text-slate-900 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.location || ''}
                            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center"
                          />
                        ) : (
                          rec.location
                        )}
                      </td>

                      {/* Vehicle Number */}
                      <td className="py-1 px-2 font-mono font-bold text-slate-900 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.vehicleNumber || ''}
                            onChange={(e) => setEditData({ ...editData, vehicleNumber: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono uppercase text-center"
                          />
                        ) : (
                          rec.vehicleNumber
                        )}
                      </td>

                      {/* STO Number */}
                      <td className="py-1 px-2 font-mono text-blue-900 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.stoNumber || ''}
                            onChange={(e) => setEditData({ ...editData, stoNumber: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono text-center"
                          />
                        ) : (
                          rec.stoNumber ? (
                            <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {rec.stoNumber}
                            </span>
                          ) : (
                            '—'
                          )
                        )}
                      </td>

                      {/* Weight */}
                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.weight || ''}
                            onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center"
                          />
                        ) : (
                          rec.weight
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-1 px-2 text-slate-700 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.remarks || ''}
                            onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center"
                          />
                        ) : (
                          rec.remarks || '—'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-1 px-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(rec.id)}
                                title="Save"
                                className="p-1 text-emerald-600 hover:text-emerald-800 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                title="Cancel"
                                className="p-1 text-slate-400 hover:text-slate-600 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(rec)}
                                title="Edit"
                                className="p-1 text-blue-600 hover:text-blue-800 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(rec)}
                                title="Delete"
                                className="p-1 text-rose-600 hover:text-rose-800 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Raipur Record"
        message={`Are you sure you want to delete vehicle movement for "${deleteTarget?.vehicleNumber}" on ${deleteTarget?.date}?`}
        confirmText="Delete Record"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteRaipurRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset Raipur Database?"
        message="Are you sure you want to clear all Raipur Database records? Unrelated datasets will remain intact."
        confirmText="Reset"
        confirmVariant="danger"
        onConfirm={() => {
          resetRaipurData();
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
