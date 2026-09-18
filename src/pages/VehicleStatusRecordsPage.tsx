import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Clipboard,
  Search,
  Trash2,
  Link2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TablePagination } from '../components/TablePagination';
import { PasteModal } from '../components/PasteModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ExcelColumnFilter } from '../components/ExcelColumnFilter';
import { useColumnWidths } from '../hooks/useColumnWidths';
import { formatWeight, parseWeightToMt } from '../utils/weightFormatter';
import { normalizeDate } from '../utils/dateUtils';
import { VehicleStatusRecord, Page2DerivedRow } from '../types/models';

const DEFAULT_VEHICLE_STATUS_WIDTHS: Record<string, number> = {
  sNo: 50,
  demandedDate: 115,
  requiredDate: 115,
  loadingPt: 130,
  location: 150,
  weight: 95,
  gateSlip: 120,
  vehicleArrived: 125,
  vehicleNumber: 130,
  vehicleDispatch: 125,
  remarks: 135,
  planLink: 130,
  actions: 80,
};

export const VehicleStatusRecordsPage: React.FC = () => {
  const {
    page2DerivedRows,
    addVehicleStatus,
    deleteVehicleStatus,
    pasteVehicleStatus,
    resetVehicleStatusData,
    getFilterState,
    updateFilterState,
    setActiveTab,
  } = useApp();

  const filterKey = 'vehicle_status';
  const filterState = getFilterState(filterKey);
  const { getWidth, startResizing } = useColumnWidths('table_width_vehicle_status', DEFAULT_VEHICLE_STATUS_WIDTHS);

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [deleteTargetRecord, setDeleteTargetRecord] = useState<VehicleStatusRecord | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Quick Add State
  const [showAddForm, setShowAddForm] = useState(false);
  const [demandedDate, setDemandedDate] = useState('14-09-2026');
  const [requiredDate, setRequiredDate] = useState('15-09-2026');
  const [loadingPt, setLoadingPt] = useState('Tolagaon');
  const [location, setLocation] = useState('');
  const [rawWeight, setRawWeight] = useState('18 Ton');

  // Compute unique column values for Excel-like filtering
  const uniqueValues = useMemo(() => {
    const demDates = new Set<string>();
    const reqDates = new Set<string>();
    const loadings = new Set<string>();
    const locations = new Set<string>();
    const weights = new Set<string>();
    const slips = new Set<string>();
    const arrived = new Set<string>();
    const vehicleNos = new Set<string>();
    const dispatched = new Set<string>();
    const remarks = new Set<string>();
    const planLinks = new Set<string>();

    for (const row of page2DerivedRows) {
      const vs = row.statusRecord;
      if (vs.demandedDate) demDates.add(vs.demandedDate);
      if (vs.requiredDate) reqDates.add(vs.requiredDate);
      if (vs.loadingPt) loadings.add(vs.loadingPt);
      if (vs.location) locations.add(vs.location);
      if (vs.rawWeight) weights.add(vs.rawWeight);
      if (row.gateSlip) slips.add(row.gateSlip);
      if (row.vehicleArrived) arrived.add(row.vehicleArrived);
      if (row.vehicleNumber) vehicleNos.add(row.vehicleNumber);
      if (row.vehicleDispatch) dispatched.add(row.vehicleDispatch);
      if (row.remarks) remarks.add(row.remarks);
      planLinks.add(row.matchedPlan ? `Linked (${row.matchedPlan.cfa})` : 'Pending Plan Match');
    }

    return {
      demandedDate: Array.from(demDates).sort(),
      requiredDate: Array.from(reqDates).sort(),
      loadingPt: Array.from(loadings).sort(),
      location: Array.from(locations).sort(),
      weight: Array.from(weights).sort(),
      gateSlip: Array.from(slips).sort(),
      vehicleArrived: Array.from(arrived).sort(),
      vehicleNumber: Array.from(vehicleNos).sort(),
      vehicleDispatch: Array.from(dispatched).sort(),
      remarks: Array.from(remarks).sort(),
      planLink: Array.from(planLinks).sort(),
    };
  }, [page2DerivedRows]);

  // Filter & Search Logic
  const filteredRows = useMemo(() => {
    return page2DerivedRows.filter((row) => {
      const vs = row.statusRecord;

      // 1. Column filters
      if (filterState.columnFilters) {
        for (const [colKey, selected] of Object.entries(filterState.columnFilters)) {
          if (!selected || selected.length === 0) continue;
          let val = '';
          if (colKey === 'demandedDate') val = vs.demandedDate;
          else if (colKey === 'requiredDate') val = vs.requiredDate;
          else if (colKey === 'loadingPt') val = vs.loadingPt;
          else if (colKey === 'location') val = vs.location;
          else if (colKey === 'weight') val = vs.rawWeight || `${vs.weightMt} MT`;
          else if (colKey === 'gateSlip') val = row.gateSlip || '(Blank)';
          else if (colKey === 'vehicleArrived') val = row.vehicleArrived || '(Blank)';
          else if (colKey === 'vehicleNumber') val = row.vehicleNumber || '(Blank)';
          else if (colKey === 'vehicleDispatch') val = row.vehicleDispatch || '(Blank)';
          else if (colKey === 'remarks') val = row.remarks || '(Blank)';
          else if (colKey === 'planLink') val = row.matchedPlan ? `Linked (${row.matchedPlan.cfa})` : 'Pending Plan Match';

          if (val && !selected.includes(val)) return false;
          if (!val && !selected.includes('(Blank)')) return false;
        }
      }

      // 2. Global Search
      if (filterState.globalSearch) {
        const query = filterState.globalSearch.toLowerCase();
        const matches =
          vs.demandedDate.toLowerCase().includes(query) ||
          vs.requiredDate.toLowerCase().includes(query) ||
          vs.location.toLowerCase().includes(query) ||
          vs.loadingPt.toLowerCase().includes(query) ||
          row.gateSlip.toLowerCase().includes(query) ||
          row.vehicleNumber.toLowerCase().includes(query) ||
          row.remarks.toLowerCase().includes(query);

        if (!matches) return false;
      }

      // 3. Date filter
      if (filterState.dateFilter && !vs.demandedDate.includes(filterState.dateFilter)) {
        return false;
      }

      // 4. Location filter
      if (filterState.locationFilter && !vs.location.toLowerCase().includes(filterState.locationFilter.toLowerCase())) {
        return false;
      }

      // 5. Loading filter
      if (filterState.loadingFilter && !vs.loadingPt.toLowerCase().includes(filterState.loadingFilter.toLowerCase())) {
        return false;
      }

      // 6. Status filter
      if (filterState.statusFilter === 'MATCHED' && !row.matchedPlan) return false;
      if (filterState.statusFilter === 'PENDING' && row.matchedPlan) return false;

      return true;
    });
  }, [page2DerivedRows, filterState]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = (filterState.currentPage - 1) * filterState.rowsPerPage;
    return filteredRows.slice(start, start + filterState.rowsPerPage);
  }, [filteredRows, filterState.currentPage, filterState.rowsPerPage]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandedDate || !location || !loadingPt) {
      alert('Please fill Demanded Date, Location, and Loading Point.');
      return;
    }

    const normDemDate = normalizeDate(demandedDate);
    const normReqDate = normalizeDate(requiredDate || demandedDate);
    const weightMt = parseWeightToMt(rawWeight);

    addVehicleStatus({
      demandedDate: normDemDate,
      requiredDate: normReqDate,
      loadingPt: loadingPt.trim(),
      location: location.trim(),
      rawWeight,
      weightMt,
    });

    setLocation('');
    setShowAddForm(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'S No',
      'Demanded Date',
      'Required Date',
      'Loading Pt.',
      'Location',
      'Weight',
      'Vehicle Arrived',
      'Vehicle Dispatch',
      'Remarks',
      'Gate Slip No.',
      'Link Status',
    ];

    const rows = filteredRows.map((r, idx) => [
      String(idx + 1),
      r.statusRecord.demandedDate,
      r.statusRecord.requiredDate,
      r.statusRecord.loadingPt,
      r.statusRecord.location,
      formatWeight(r.statusRecord.weightMt),
      r.vehicleArrived,
      r.vehicleDispatch,
      r.remarks,
      r.gateSlip,
      r.matchedPlan ? (r.relationshipSource === 'NORMAL_MATCH' ? 'Normal Exact' : 'Bridge Explicit') : 'Plan Pending',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vehicle_Status_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-3 font-sans text-slate-800">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 rounded p-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Vehicle Status Records (Page 2)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle Call</span>
          </button>

          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5 text-blue-700" />
            <span>Bulk Paste</span>
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
            title="Reset Vehicle Status Records"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-blue-50/50 border border-blue-200 rounded p-3 text-xs space-y-3 animate-in fade-in duration-100 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <span className="font-bold text-blue-900">Add New Vehicle Status Call</span>
            <span className="text-[11px] text-blue-700">Section 10 Input: Demanded Date, Required Date, Loading Pt., Location, Weight</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Demanded Date *</label>
              <input
                type="text"
                value={demandedDate}
                onChange={(e) => setDemandedDate(e.target.value)}
                placeholder="14-09-2026"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Required Date *</label>
              <input
                type="text"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                placeholder="15-09-2026"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loading Pt. *</label>
              <input
                type="text"
                value={loadingPt}
                onChange={(e) => setLoadingPt(e.target.value)}
                placeholder="Tolagaon"
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
                placeholder="e.g. Aurangabad 1"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Weight</label>
              <input
                type="text"
                value={rawWeight}
                onChange={(e) => setRawWeight(e.target.value)}
                placeholder="18 Ton"
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

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 border border-slate-300 rounded p-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={filterState.globalSearch}
              onChange={(e) => updateFilterState(filterKey, { globalSearch: e.target.value, currentPage: 1 })}
              placeholder="Search location, slip, remarks..."
              className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Link Status:</span>
            <select
              value={filterState.statusFilter}
              onChange={(e) => updateFilterState(filterKey, { statusFilter: e.target.value, currentPage: 1 })}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
            >
              <option value="">All Calls</option>
              <option value="MATCHED">Plan Linked</option>
              <option value="PENDING">Plan Pending</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Location:</span>
            <input
              type="text"
              value={filterState.locationFilter}
              onChange={(e) => updateFilterState(filterKey, { locationFilter: e.target.value, currentPage: 1 })}
              placeholder="Filter location..."
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs max-w-[140px]"
            />
          </div>
        </div>

        {(filterState.globalSearch ||
          filterState.locationFilter ||
          filterState.statusFilter ||
          (filterState.columnFilters && Object.keys(filterState.columnFilters).length > 0)) && (
          <button
            onClick={() =>
              updateFilterState(filterKey, {
                globalSearch: '',
                locationFilter: '',
                statusFilter: '',
                columnFilters: {},
                currentPage: 1,
              })
            }
            className="text-xs text-blue-700 hover:underline px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Table: Section 10 Columns */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-xs text-center border-collapse font-sans">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-20 shadow-xs">
              <tr className="divide-x divide-slate-200 text-[11px] uppercase tracking-wider">
                <th
                  style={{ width: getWidth('sNo'), minWidth: getWidth('sNo') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <span>S No</span>
                  <div
                    onMouseDown={(e) => startResizing('sNo', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('demandedDate'), minWidth: getWidth('demandedDate') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Demanded Date</span>
                    <ExcelColumnFilter
                      columnKey="demandedDate"
                      title="Demanded Date"
                      allValues={uniqueValues.demandedDate}
                      selectedValues={filterState.columnFilters?.demandedDate || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), demandedDate: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('demandedDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('requiredDate'), minWidth: getWidth('requiredDate') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Required Date</span>
                    <ExcelColumnFilter
                      columnKey="requiredDate"
                      title="Required Date"
                      allValues={uniqueValues.requiredDate}
                      selectedValues={filterState.columnFilters?.requiredDate || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), requiredDate: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('requiredDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('loadingPt'), minWidth: getWidth('loadingPt') }}
                  className="py-1 px-2 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Loading Pt.</span>
                    <ExcelColumnFilter
                      columnKey="loadingPt"
                      title="Loading Point"
                      allValues={uniqueValues.loadingPt}
                      selectedValues={filterState.columnFilters?.loadingPt || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), loadingPt: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('loadingPt', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('location'), minWidth: getWidth('location') }}
                  className="py-1 px-2 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Location</span>
                    <ExcelColumnFilter
                      columnKey="location"
                      title="Location"
                      allValues={uniqueValues.location}
                      selectedValues={filterState.columnFilters?.location || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), location: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('location', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('weight'), minWidth: getWidth('weight') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Weight</span>
                    <ExcelColumnFilter
                      columnKey="weight"
                      title="Weight"
                      allValues={uniqueValues.weight}
                      selectedValues={filterState.columnFilters?.weight || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), weight: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('weight', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('gateSlip'), minWidth: getWidth('gateSlip') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Gate Slip No.</span>
                    <ExcelColumnFilter
                      columnKey="gateSlip"
                      title="Gate Slip No."
                      allValues={uniqueValues.gateSlip}
                      selectedValues={filterState.columnFilters?.gateSlip || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), gateSlip: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('gateSlip', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('vehicleArrived'), minWidth: getWidth('vehicleArrived') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vehicle Arrived</span>
                    <ExcelColumnFilter
                      columnKey="vehicleArrived"
                      title="Vehicle Arrived"
                      allValues={uniqueValues.vehicleArrived}
                      selectedValues={filterState.columnFilters?.vehicleArrived || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), vehicleArrived: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('vehicleArrived', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('vehicleNumber'), minWidth: getWidth('vehicleNumber') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vehicle Number</span>
                    <ExcelColumnFilter
                      columnKey="vehicleNumber"
                      title="Vehicle Number"
                      allValues={uniqueValues.vehicleNumber}
                      selectedValues={filterState.columnFilters?.vehicleNumber || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), vehicleNumber: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('vehicleNumber', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('vehicleDispatch'), minWidth: getWidth('vehicleDispatch') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vehicle Dispatch</span>
                    <ExcelColumnFilter
                      columnKey="vehicleDispatch"
                      title="Vehicle Dispatch"
                      allValues={uniqueValues.vehicleDispatch}
                      selectedValues={filterState.columnFilters?.vehicleDispatch || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), vehicleDispatch: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('vehicleDispatch', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('remarks'), minWidth: getWidth('remarks') }}
                  className="py-1 px-2 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Remarks</span>
                    <ExcelColumnFilter
                      columnKey="remarks"
                      title="Remarks"
                      allValues={uniqueValues.remarks}
                      selectedValues={filterState.columnFilters?.remarks || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), remarks: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('remarks', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('planLink'), minWidth: getWidth('planLink') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Plan Link</span>
                    <ExcelColumnFilter
                      columnKey="planLink"
                      title="Plan Link Status"
                      allValues={uniqueValues.planLink}
                      selectedValues={filterState.columnFilters?.planLink || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), planLink: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('planLink', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('actions'), minWidth: getWidth('actions') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <span>Actions</span>
                  <div
                    onMouseDown={(e) => startResizing('actions', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    No vehicle status records found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const sNo = (filterState.currentPage - 1) * filterState.rowsPerPage + idx + 1;
                  const vs = row.statusRecord;
                  const isLinked = Boolean(row.matchedPlan);

                  return (
                    <tr
                      key={vs.id}
                      className="hover:bg-blue-50/40 transition-colors text-slate-800 divide-x divide-slate-100 leading-tight"
                    >
                      {/* S No is display only (Section 3) */}
                      <td className="py-1 px-1.5 text-center font-mono font-medium text-slate-500 bg-slate-50/50 select-none">
                        {sNo}
                      </td>

                      {/* Demanded Date */}
                      <td className="py-1 px-1.5 font-medium text-slate-800 text-center">
                        {vs.demandedDate}
                      </td>

                      {/* Required Date */}
                      <td className="py-1 px-1.5 text-slate-700 text-center">
                        {vs.requiredDate}
                      </td>

                      {/* Loading Pt. */}
                      <td className="py-1 px-2 font-medium text-slate-800 text-center">
                        {vs.loadingPt}
                      </td>

                      {/* Location */}
                      <td className="py-1 px-2 font-semibold text-slate-900 text-center">
                        {vs.location}
                      </td>

                      {/* Weight */}
                      <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-800">
                        {formatWeight(vs.weightMt)}
                      </td>

                      {/* Gate Slip No. */}
                      <td className="py-1 px-1.5 font-mono font-bold text-emerald-800 text-center">
                        {row.gateSlip !== '—' ? (
                          <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {row.gateSlip}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Vehicle Arrived (Section 17: derived from linked plan + gate) */}
                      <td className="py-1 px-1.5 font-mono text-slate-700 text-center">
                        {row.vehicleArrived === 'Pending' ? (
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                            Pending
                          </span>
                        ) : (
                          <span className="text-emerald-800 font-medium">{row.vehicleArrived}</span>
                        )}
                      </td>

                      {/* Vehicle Number */}
                      <td className="py-1 px-1.5 font-mono font-semibold text-slate-900 text-center">
                        {row.vehicleNumber !== '—' && row.vehicleNumber ? (
                          <span>{row.vehicleNumber}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Vehicle Dispatch */}
                      <td className="py-1 px-1.5 font-mono text-slate-700 text-center">
                        {row.vehicleDispatch === 'Pending' ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="text-blue-800 font-medium">{row.vehicleDispatch}</span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-1 px-2 text-slate-700 text-center font-medium">
                        {row.remarks === 'Dispatched' ? (
                          <span className="text-emerald-700 font-semibold">{row.remarks}</span>
                        ) : row.remarks === 'Onloading' ? (
                          <span className="text-blue-700 font-semibold">{row.remarks}</span>
                        ) : (
                          <span>{row.remarks}</span>
                        )}
                      </td>

                      {/* Plan Link Status (Authoritative VS ↔ PLAN) */}
                      <td className="py-1 px-1.5 text-center">
                        {isLinked ? (
                          <div className="flex items-center justify-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-emerald-800 font-mono">
                              {row.matchedPlan?.cfa}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({row.relationshipSource === 'NORMAL_MATCH' ? 'Exact' : 'Bridge'})
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveTab('bridge')}
                            title="Unresolved. Click to reconcile via Vehicle Status Bridge"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors"
                          >
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Plan Pending</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </button>
                        )}
                      </td>

                      {/* Row Delete with Stable ID (Section 22) */}
                      <td className="py-1 px-1.5 text-center">
                        <button
                          onClick={() => setDeleteTargetRecord(vs)}
                          title="Delete vehicle status record"
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
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

        {/* Table Pagination */}
        <TablePagination
          totalItems={filteredRows.length}
          currentPage={filterState.currentPage}
          rowsPerPage={filterState.rowsPerPage}
          onPageChange={(p) => updateFilterState(filterKey, { currentPage: p })}
          onRowsPerPageChange={(r) => updateFilterState(filterKey, { rowsPerPage: r })}
        />
      </div>

      {/* Paste Modal */}
      <PasteModal
        isOpen={isPasteModalOpen}
        title="Paste Vehicle Status Records"
        expectedFormatHelp="Supports Excel copy-paste, Tab-separated, Comma-separated, or Pipe-separated. Expected columns: Demanded Date | Required Date | Loading Pt. | Location | Weight."
        samplePlaceholder={`Demanded Date\tRequired Date\tLoading Pt.\tLocation\tWeight
14-09-2026\t15-09-2026\tTolagaon\tAurangabad 1\t18 Ton
14-09-2026\t15-09-2026\tTolagaon\tAurangabad 2\t18 Ton
14-09-2026\t14-09-2026\tTolagaon\tAurangabad\t18 Ton`}
        onClose={() => setIsPasteModalOpen(false)}
        onParse={(text, mode) => {
          const res = pasteVehicleStatus(text, mode);
          return { count: res.recordsCount, rawRows: res.rawRowsCount };
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTargetRecord)}
        title="Delete Vehicle Status Record"
        message={`Are you sure you want to permanently delete Vehicle Status call for "${deleteTargetRecord?.location}" on ${deleteTargetRecord?.demandedDate}? This will release any linked plan.`}
        confirmText="Delete Record"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTargetRecord) {
            deleteVehicleStatus(deleteTargetRecord.id);
            setDeleteTargetRecord(null);
          }
        }}
        onCancel={() => setDeleteTargetRecord(null)}
      />

      {/* Reset Vehicle Status Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset Vehicle Status Records?"
        message="Are you sure you want to clear all Vehicle Status records and associated plan relationships? Search and filter settings will also be reset."
        confirmText="Reset"
        confirmVariant="danger"
        onConfirm={() => {
          resetVehicleStatusData();
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
