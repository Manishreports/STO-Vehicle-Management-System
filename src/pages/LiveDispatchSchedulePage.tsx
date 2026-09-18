import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Clipboard,
  Search,
  Filter,
  Trash2,
  Ban,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TablePagination } from '../components/TablePagination';
import { PasteModal } from '../components/PasteModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ExcelColumnFilter } from '../components/ExcelColumnFilter';
import { useColumnWidths } from '../hooks/useColumnWidths';
import { enrichPlanWithGateData } from '../services/gateEnrichmentService';
import { formatWeight, parseWeightToMt } from '../utils/weightFormatter';
import { normalizeDate } from '../utils/dateUtils';
import { VehiclePlan } from '../types/models';

const DEFAULT_DISPATCH_WIDTHS: Record<string, number> = {
  sno: 50,
  date: 115,
  loc: 90,
  plant: 80,
  cfa: 150,
  weight: 95,
  sto: 130,
  loading: 160,
  vehicleIn: 110,
  vehicleNo: 125,
  vehicleOut: 110,
  slipNumber: 115,
  remarks: 130,
  actions: 80,
};

export const LiveDispatchSchedulePage: React.FC = () => {
  const {
    plans,
    gateRecords,
    addPlan,
    updatePlan,
    cancelPlan,
    deletePlan,
    pasteDispatchSchedule,
    resetPlanningData,
    getFilterState,
    updateFilterState,
  } = useApp();

  const filterKey = 'live_dispatch';
  const filterState = getFilterState(filterKey);
  const { getWidth, startResizing } = useColumnWidths('table_width_live_dispatch', DEFAULT_DISPATCH_WIDTHS);

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [deleteTargetPlan, setDeleteTargetPlan] = useState<VehiclePlan | null>(null);
  const [cancelTargetPlan, setCancelTargetPlan] = useState<VehiclePlan | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Quick Add State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState('14-09-2026');
  const [newLoc, setNewLoc] = useState('MAIN');
  const [newPlant, setNewPlant] = useState('1001');
  const [newCfa, setNewCfa] = useState('');
  const [newWeight, setNewWeight] = useState('18 Ton');
  const [newSto, setNewSto] = useState('');
  const [newLoading, setNewLoading] = useState('TOLAGAON LOADING');

  // Compute unique column values for Excel-like filtering with cascading support
  const getCascadedValuesForColumn = (targetColKey: string): string[] => {
    const matchingPlans = plans.filter((plan) => {
      // Global search
      if (filterState.globalSearch) {
        const query = filterState.globalSearch.toLowerCase();
        const matchesPlan =
          plan.date.toLowerCase().includes(query) ||
          plan.cfa.toLowerCase().includes(query) ||
          plan.loading.toLowerCase().includes(query) ||
          plan.plant.toLowerCase().includes(query) ||
          plan.loc.toLowerCase().includes(query);

        const matchesChild = plan.children.some(
          (c) => c.sto.toLowerCase().includes(query) || c.location.toLowerCase().includes(query)
        );
        if (!matchesPlan && !matchesChild) return false;
      }

      // Quick Date filter
      if (filterState.dateFilter && !plan.date.includes(filterState.dateFilter)) {
        return false;
      }

      // Quick CFA filter
      if (filterState.cfaFilter && !plan.cfa.toLowerCase().includes(filterState.cfaFilter.toLowerCase())) {
        return false;
      }

      // Quick Loading filter
      if (filterState.loadingFilter && !plan.loading.toLowerCase().includes(filterState.loadingFilter.toLowerCase())) {
        return false;
      }

      // Column filters (except targetColKey to allow selecting other values in this column)
      if (filterState.columnFilters) {
        for (const [colKey, selected] of Object.entries(filterState.columnFilters)) {
          if (colKey === targetColKey) continue;
          if (!selected || selected.length === 0) continue;

          let val = '';
          if (colKey === 'date') val = plan.date;
          else if (colKey === 'loc') val = plan.loc;
          else if (colKey === 'plant') val = plan.plant;
          else if (colKey === 'cfa') val = plan.cfa;
          else if (colKey === 'weight') val = plan.rawWeight || `${plan.weightMt} MT`;
          else if (colKey === 'loading') val = plan.loading;
          else if (colKey === 'sto') {
            const hasMatch = plan.children.some((c) => selected.includes(c.sto || '(Blank)'));
            if (!hasMatch) return false;
            continue;
          } else if (colKey === 'vehicleIn') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.vehicleIn || '(Blank)';
          } else if (colKey === 'vehicleNo') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.vehicleNumber || '(Blank)';
          } else if (colKey === 'vehicleOut') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.vehicleOut || '(Blank)';
          } else if (colKey === 'slipNumber') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.gateSlip || '(Blank)';
          } else if (colKey === 'remarks') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.remarks || '(Blank)';
          }

          if (val && !selected.includes(val)) return false;
          if (!val && !selected.includes('(Blank)')) return false;
        }
      }

      return true;
    });

    const set = new Set<string>();
    for (const p of matchingPlans) {
      if (targetColKey === 'date') {
        if (p.date) set.add(p.date);
      } else if (targetColKey === 'loc') {
        if (p.loc) set.add(p.loc);
        p.children.forEach((c) => c.location && set.add(c.location));
      } else if (targetColKey === 'plant') {
        if (p.plant) set.add(p.plant);
      } else if (targetColKey === 'cfa') {
        if (p.cfa) set.add(p.cfa);
      } else if (targetColKey === 'weight') {
        set.add(p.rawWeight || `${p.weightMt} MT`);
      } else if (targetColKey === 'loading') {
        if (p.loading) set.add(p.loading);
      } else if (targetColKey === 'sto') {
        p.children.forEach((c) => {
          if (c.sto) set.add(c.sto);
          else set.add('(Blank)');
        });
      } else if (targetColKey === 'vehicleIn') {
        const gate = enrichPlanWithGateData(p, gateRecords);
        set.add(gate.vehicleIn || '(Blank)');
      } else if (targetColKey === 'vehicleNo') {
        const gate = enrichPlanWithGateData(p, gateRecords);
        set.add(gate.vehicleNumber || '(Blank)');
      } else if (targetColKey === 'vehicleOut') {
        const gate = enrichPlanWithGateData(p, gateRecords);
        set.add(gate.vehicleOut || '(Blank)');
      } else if (targetColKey === 'slipNumber') {
        const gate = enrichPlanWithGateData(p, gateRecords);
        set.add(gate.gateSlip || '(Blank)');
      } else if (targetColKey === 'remarks') {
        const gate = enrichPlanWithGateData(p, gateRecords);
        set.add(gate.remarks || '(Blank)');
      }
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  };

  // Filter & Search Logic
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // 1. Column filters
      if (filterState.columnFilters) {
        for (const [colKey, selected] of Object.entries(filterState.columnFilters)) {
          if (!selected || selected.length === 0) continue;
          let val = '';
          if (colKey === 'date') val = plan.date;
          else if (colKey === 'loc') val = plan.loc;
          else if (colKey === 'plant') val = plan.plant;
          else if (colKey === 'cfa') val = plan.cfa;
          else if (colKey === 'weight') val = plan.rawWeight || `${plan.weightMt} MT`;
          else if (colKey === 'loading') val = plan.loading;
          else if (colKey === 'sto') {
            const hasMatch = plan.children.some((c) => selected.includes(c.sto || '(Blank)'));
            if (!hasMatch) return false;
            continue;
          } else if (colKey === 'vehicleIn') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.vehicleIn || '(Blank)';
          } else if (colKey === 'vehicleNo') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.vehicleNumber || '(Blank)';
          } else if (colKey === 'vehicleOut') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.vehicleOut || '(Blank)';
          } else if (colKey === 'slipNumber') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.gateSlip || '(Blank)';
          } else if (colKey === 'remarks') {
            const gate = enrichPlanWithGateData(plan, gateRecords);
            val = gate.remarks || '(Blank)';
          }
          if (val && !selected.includes(val)) return false;
          if (!val && !selected.includes('(Blank)')) return false;
        }
      }

      // 2. Global search term
      if (filterState.globalSearch) {
        const query = filterState.globalSearch.toLowerCase();
        const matchesPlan =
          plan.date.toLowerCase().includes(query) ||
          plan.cfa.toLowerCase().includes(query) ||
          plan.loading.toLowerCase().includes(query) ||
          plan.plant.toLowerCase().includes(query) ||
          plan.loc.toLowerCase().includes(query) ||
          (plan.slipNumber && plan.slipNumber.toLowerCase().includes(query)) ||
          (plan.vehicleNumber && plan.vehicleNumber.toLowerCase().includes(query)) ||
          (plan.remarks && plan.remarks.toLowerCase().includes(query));

        const matchesChild = plan.children.some(
          (c) => c.sto.toLowerCase().includes(query) || c.location.toLowerCase().includes(query)
        );

        if (!matchesPlan && !matchesChild) return false;
      }

      // 3. Date filter
      if (filterState.dateFilter && !plan.date.includes(filterState.dateFilter)) {
        return false;
      }

      // 4. CFA filter
      if (filterState.cfaFilter && !plan.cfa.toLowerCase().includes(filterState.cfaFilter.toLowerCase())) {
        return false;
      }

      // 5. Loading filter
      if (filterState.loadingFilter && !plan.loading.toLowerCase().includes(filterState.loadingFilter.toLowerCase())) {
        return false;
      }

      // 6. Status filter
      if (filterState.statusFilter === 'ACTIVE' && plan.isCancelled) return false;
      if (filterState.statusFilter === 'CANCELLED' && !plan.isCancelled) return false;

      return true;
    });
  }, [plans, filterState, gateRecords]);

  // Pagination
  const paginatedPlans = useMemo(() => {
    const start = (filterState.currentPage - 1) * filterState.rowsPerPage;
    return filteredPlans.slice(start, start + filterState.rowsPerPage);
  }, [filteredPlans, filterState.currentPage, filterState.rowsPerPage]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newCfa || !newLoading) {
      alert('Please fill Date, CFA, and Loading Point.');
      return;
    }

    const normDate = normalizeDate(newDate);
    const weightMt = parseWeightToMt(newWeight);
    const stos = newSto
      .split(/[/,\s]+/)
      .map((s) => s.trim())
      .filter((s) => Boolean(s));

    const children =
      stos.length > 0
        ? stos.map((s, idx) => ({
            id: `CH-${Date.now().toString(36)}-${idx}`,
            location: newLoc || 'MAIN',
            sto: s,
          }))
        : [{ id: `CH-${Date.now().toString(36)}-0`, location: newLoc || 'MAIN', sto: '' }];

    addPlan({
      date: normDate,
      loc: newLoc || 'MAIN',
      plant: newPlant || '1001',
      cfa: newCfa.trim(),
      rawWeight: newWeight,
      weightMt,
      loading: newLoading.trim(),
      children,
      isCancelled: false,
    });

    setNewCfa('');
    setNewSto('');
    setShowAddForm(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'S.No',
      'Date',
      'Loc',
      'Plant',
      'CFA',
      'Weight',
      'STO',
      'Loading',
      'Vehicle In',
      'Vehicle Number',
      'Vehicle Out',
      'Slip Number',
      'Remarks',
      'Status',
    ];

    const rows: string[][] = [];
    let sNo = 1;

    filteredPlans.forEach((plan) => {
      const gate = enrichPlanWithGateData(plan, gateRecords);
      const displayWeight = formatWeight(plan.weightMt);

      plan.children.forEach((child, childIdx) => {
        rows.push([
          String(sNo++),
          childIdx === 0 ? plan.date : '',
          child.location || plan.loc,
          childIdx === 0 ? plan.plant : '',
          childIdx === 0 ? plan.cfa : '',
          childIdx === 0 ? displayWeight : '',
          child.sto,
          childIdx === 0 ? plan.loading : '',
          childIdx === 0 ? gate.vehicleIn : '',
          childIdx === 0 ? gate.vehicleNumber : '',
          childIdx === 0 ? gate.vehicleOut : '',
          childIdx === 0 ? gate.gateSlip : '',
          childIdx === 0 ? (plan.isCancelled ? 'CANCELLED' : gate.remarks) : '',
          plan.isCancelled ? 'CANCELLED' : 'ACTIVE',
        ]);
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell || ''}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Live_Dispatch_Schedule_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-3 font-sans text-slate-800">
      {/* Top Action & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 rounded p-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Live Dispatch Schedule (Vehicle Planning)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Plan</span>
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
            title="Reset Live Dispatch Schedule"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form Drawer / Panel */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-blue-50/50 border border-blue-200 rounded p-3 text-xs space-y-3 animate-in fade-in duration-100 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <span className="font-bold text-blue-900">Add New Logical Dispatch Plan</span>
            <span className="text-[11px] text-blue-700">Multiple STOs can be separated with slashes or commas</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Date</label>
              <input
                type="text"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="14-09-2026"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loc</label>
              <input
                type="text"
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                placeholder="MAIN"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Plant</label>
              <input
                type="text"
                value={newPlant}
                onChange={(e) => setNewPlant(e.target.value)}
                placeholder="1001"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">CFA *</label>
              <input
                type="text"
                value={newCfa}
                onChange={(e) => setNewCfa(e.target.value)}
                placeholder="e.g. Aurangabad"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Weight</label>
              <input
                type="text"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="18 Ton"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">STO Number(s)</label>
              <input
                type="text"
                value={newSto}
                onChange={(e) => setNewSto(e.target.value)}
                placeholder="4210085492 / 4210085493"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Loading Point *</label>
              <input
                type="text"
                value={newLoading}
                onChange={(e) => setNewLoading(e.target.value)}
                placeholder="TOLAGAON LOADING"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                required
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
              Save Plan
            </button>
          </div>
        </form>
      )}

      {/* Filter / Search Bar (Persistent) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 border border-slate-300 rounded p-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={filterState.globalSearch}
              onChange={(e) => updateFilterState(filterKey, { globalSearch: e.target.value, currentPage: 1 })}
              placeholder="Search date, CFA, STO, loading..."
              className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={filterState.statusFilter}
              onChange={(e) => updateFilterState(filterKey, { statusFilter: e.target.value, currentPage: 1 })}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
            >
              <option value="">All Plans</option>
              <option value="ACTIVE">Active Only</option>
              <option value="CANCELLED">Cancelled Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Loading:</span>
            <input
              type="text"
              value={filterState.loadingFilter}
              onChange={(e) => updateFilterState(filterKey, { loadingFilter: e.target.value, currentPage: 1 })}
              placeholder="Filter loading..."
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs max-w-[140px]"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">CFA:</span>
            <input
              type="text"
              value={filterState.cfaFilter}
              onChange={(e) => updateFilterState(filterKey, { cfaFilter: e.target.value, currentPage: 1 })}
              placeholder="Filter CFA..."
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs max-w-[140px]"
            />
          </div>
        </div>

        {(filterState.globalSearch ||
          filterState.loadingFilter ||
          filterState.cfaFilter ||
          filterState.statusFilter ||
          (filterState.columnFilters && Object.keys(filterState.columnFilters).length > 0)) && (
          <button
            onClick={() =>
              updateFilterState(filterKey, {
                globalSearch: '',
                loadingFilter: '',
                cfaFilter: '',
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

      {/* Main Table: Grouped RowSpan rendering (Section 9) */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-xs text-center border-collapse font-sans">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-20 shadow-xs">
              <tr className="divide-x divide-slate-200 text-[11px] uppercase tracking-wider">
                <th
                  style={{ width: getWidth('sno'), minWidth: getWidth('sno') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <span>S.No</span>
                  <div
                    onMouseDown={(e) => startResizing('sno', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('date'), minWidth: getWidth('date') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Date</span>
                    <ExcelColumnFilter
                      columnKey="date"
                      title="Date"
                      allValues={getCascadedValuesForColumn('date')}
                      selectedValues={filterState.columnFilters?.date || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), date: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('date', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('loc'), minWidth: getWidth('loc') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Loc</span>
                    <ExcelColumnFilter
                      columnKey="loc"
                      title="Loc"
                      allValues={getCascadedValuesForColumn('loc')}
                      selectedValues={filterState.columnFilters?.loc || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), loc: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('loc', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('plant'), minWidth: getWidth('plant') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Plant</span>
                    <ExcelColumnFilter
                      columnKey="plant"
                      title="Plant"
                      allValues={getCascadedValuesForColumn('plant')}
                      selectedValues={filterState.columnFilters?.plant || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), plant: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('plant', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('cfa'), minWidth: getWidth('cfa') }}
                  className="py-1 px-2 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>CFA</span>
                    <ExcelColumnFilter
                      columnKey="cfa"
                      title="CFA"
                      allValues={getCascadedValuesForColumn('cfa')}
                      selectedValues={filterState.columnFilters?.cfa || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), cfa: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('cfa', e)}
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
                      allValues={getCascadedValuesForColumn('weight')}
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
                  style={{ width: getWidth('sto'), minWidth: getWidth('sto') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>STO</span>
                    <ExcelColumnFilter
                      columnKey="sto"
                      title="STO"
                      allValues={getCascadedValuesForColumn('sto')}
                      selectedValues={filterState.columnFilters?.sto || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), sto: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('sto', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('loading'), minWidth: getWidth('loading') }}
                  className="py-1 px-2 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Loading</span>
                    <ExcelColumnFilter
                      columnKey="loading"
                      title="Loading Point"
                      allValues={getCascadedValuesForColumn('loading')}
                      selectedValues={filterState.columnFilters?.loading || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), loading: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('loading', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('vehicleIn'), minWidth: getWidth('vehicleIn') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vehicle In</span>
                    <ExcelColumnFilter
                      columnKey="vehicleIn"
                      title="Vehicle In"
                      allValues={getCascadedValuesForColumn('vehicleIn')}
                      selectedValues={filterState.columnFilters?.vehicleIn || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), vehicleIn: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('vehicleIn', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('vehicleNo'), minWidth: getWidth('vehicleNo') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vehicle No</span>
                    <ExcelColumnFilter
                      columnKey="vehicleNo"
                      title="Vehicle No"
                      allValues={getCascadedValuesForColumn('vehicleNo')}
                      selectedValues={filterState.columnFilters?.vehicleNo || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), vehicleNo: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('vehicleNo', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('vehicleOut'), minWidth: getWidth('vehicleOut') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vehicle Out</span>
                    <ExcelColumnFilter
                      columnKey="vehicleOut"
                      title="Vehicle Out"
                      allValues={getCascadedValuesForColumn('vehicleOut')}
                      selectedValues={filterState.columnFilters?.vehicleOut || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), vehicleOut: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('vehicleOut', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: getWidth('slipNumber'), minWidth: getWidth('slipNumber') }}
                  className="py-1 px-1.5 text-center bg-slate-100 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Slip Number</span>
                    <ExcelColumnFilter
                      columnKey="slipNumber"
                      title="Gate Slip Number"
                      allValues={getCascadedValuesForColumn('slipNumber')}
                      selectedValues={filterState.columnFilters?.slipNumber || []}
                      onFilterChange={(selected) =>
                        updateFilterState(filterKey, {
                          columnFilters: { ...(filterState.columnFilters || {}), slipNumber: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('slipNumber', e)}
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
                      allValues={getCascadedValuesForColumn('remarks')}
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
              {paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    No dispatch plans found matching criteria.
                  </td>
                </tr>
              ) : (
                (() => {
                  let runningSno = (filterState.currentPage - 1) * filterState.rowsPerPage + 1;

                  return paginatedPlans.map((plan) => {
                    const gate = enrichPlanWithGateData(plan, gateRecords);
                    const rowSpan = Math.max(1, plan.children.length);
                    const formattedWeightDisplay = formatWeight(plan.weightMt);
                    const currentSno = runningSno++;
                    const isCancelled = plan.isCancelled;

                    // Group contiguous children by location
                    const locGroups: { location: string; startIndex: number; count: number }[] = [];
                    plan.children.forEach((c, idx) => {
                      const locName = c.location || plan.loc || 'MAIN';
                      const lastGroup = locGroups[locGroups.length - 1];
                      if (lastGroup && lastGroup.location === locName) {
                        lastGroup.count++;
                      } else {
                        locGroups.push({ location: locName, startIndex: idx, count: 1 });
                      }
                    });

                    return (
                      <React.Fragment key={plan.id}>
                        {plan.children.map((child, childIdx) => {
                          const isFirstChild = childIdx === 0;
                          const locGroup = locGroups.find((g) => g.startIndex === childIdx);

                          return (
                            <tr
                              key={child.id}
                              className={`transition-colors leading-tight ${
                                isCancelled
                                  ? 'bg-slate-100/80 text-slate-400 line-through'
                                  : 'hover:bg-blue-50/40 text-slate-800'
                              } ${childIdx > 0 ? 'border-t border-dashed border-slate-100' : ''}`}
                            >
                              {/* S.No is display only (Section 3) */}
                              {isFirstChild && (
                                <td
                                  rowSpan={rowSpan}
                                  className="py-1 px-1.5 text-center font-mono font-medium text-slate-500 bg-slate-50/50 border-r border-slate-200 align-top select-none"
                                >
                                  {currentSno}
                                </td>
                              )}

                              {/* Date (Parent Plan level) */}
                              {isFirstChild && (
                                <td
                                  rowSpan={rowSpan}
                                  className="py-1 px-1.5 font-medium border-r border-slate-200 align-top text-center"
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{plan.date}</span>
                                    {isCancelled && (
                                      <span className="no-underline text-[9px] bg-rose-100 text-rose-800 px-1 rounded font-bold">
                                        CANCELLED
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* Child Location - rendered once per contiguous location group */}
                              {locGroup && (
                                <td
                                  rowSpan={locGroup.count}
                                  className="py-1 px-1.5 border-r border-slate-200 font-medium text-center text-slate-800 align-top"
                                >
                                  {locGroup.location}
                                </td>
                              )}

                              {/* Plant (Parent Plan level) */}
                              {isFirstChild && (
                                <td
                                  rowSpan={rowSpan}
                                  className="py-1 px-1.5 font-mono text-slate-600 border-r border-slate-200 align-top text-center"
                                >
                                  {plan.plant}
                                </td>
                              )}

                              {/* CFA (Parent Plan level) */}
                              {isFirstChild && (
                                <td
                                  rowSpan={rowSpan}
                                  className="py-1 px-2 font-semibold text-slate-900 border-r border-slate-200 align-top text-center"
                                >
                                  {plan.cfa}
                                </td>
                              )}

                              {/* Weight (Parent Plan level) */}
                              {isFirstChild && (
                                <td
                                  rowSpan={rowSpan}
                                  className="py-1 px-1.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200 align-top"
                                  title={`Raw: ${plan.rawWeight} (Normalized: ${plan.weightMt} MT)`}
                                >
                                  {formattedWeightDisplay}
                                </td>
                              )}

                              {/* STO (Child level) */}
                              <td className="py-1 px-1.5 font-mono text-blue-800 border-r border-slate-200 text-center align-top">
                                {child.sto ? (
                                  <span className="bg-blue-50/80 px-1 py-0.5 rounded border border-blue-100 text-[11px]">
                                    {child.sto}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">No STO</span>
                                )}
                              </td>

                              {/* Loading (Parent Plan level) */}
                              {isFirstChild && (
                                <td
                                  rowSpan={rowSpan}
                                  className="py-1 px-2 font-medium text-slate-700 border-r border-slate-200 align-top text-center"
                                >
                                  {plan.loading}
                                </td>
                              )}

                              {/* Plan Level Gate Enrichment (Section 8 & 9) */}
                              {isFirstChild && (
                                <>
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-1 px-1.5 font-mono text-slate-600 border-r border-slate-200 align-top text-center"
                                  >
                                    {isCancelled ? '—' : gate.vehicleIn || '—'}
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-1 px-1.5 font-mono font-semibold text-slate-900 border-r border-slate-200 align-top text-center"
                                  >
                                    {isCancelled ? '—' : gate.vehicleNumber || '—'}
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-1 px-1.5 font-mono text-slate-600 border-r border-slate-200 align-top text-center"
                                  >
                                    {isCancelled ? '—' : gate.vehicleOut || '—'}
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-1 px-1.5 font-mono font-bold text-emerald-800 border-r border-slate-200 align-top text-center"
                                  >
                                    {isCancelled ? (
                                      '—'
                                    ) : plan.slipConflict ? (
                                      <span
                                        className="inline-block bg-rose-50 text-rose-700 border border-rose-200 px-1 py-0.5 rounded text-[11px]"
                                        title={`Multiple slips conflict: ${plan.slipConflictSlips?.join(', ')}`}
                                      >
                                        Slip Conflict
                                      </span>
                                    ) : (
                                      gate.gateSlip || '—'
                                    )}
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-1 px-2 text-slate-600 border-r border-slate-200 align-top text-center font-medium"
                                  >
                                    {isCancelled ? (
                                      <span className="no-underline text-rose-600 font-medium">Inactive</span>
                                    ) : gate.remarks === 'Dispatched' ? (
                                      <span className="text-emerald-700 font-semibold">Dispatched</span>
                                    ) : gate.remarks === 'Onloading' ? (
                                      <span className="text-blue-700 font-semibold">Onloading</span>
                                    ) : (
                                      gate.remarks || 'Pending'
                                    )}
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-1 px-1 text-center align-top"
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      {!isCancelled && (
                                        <button
                                          onClick={() => setCancelTargetPlan(plan)}
                                          title="Cancel Plan (Mark Inactive)"
                                          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                                        >
                                          <Ban className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setDeleteTargetPlan(plan)}
                                        title="Delete Plan permanently"
                                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          totalItems={filteredPlans.length}
          currentPage={filterState.currentPage}
          rowsPerPage={filterState.rowsPerPage}
          onPageChange={(p) => updateFilterState(filterKey, { currentPage: p })}
          onRowsPerPageChange={(r) => updateFilterState(filterKey, { rowsPerPage: r })}
        />
      </div>

      {/* Paste Modal */}
      <PasteModal
        isOpen={isPasteModalOpen}
        title="Paste Live Dispatch Schedule Data"
        expectedFormatHelp="Supports Excel copy-paste, Tab-separated, Comma-separated, or Pipe-separated rows. Formats supported: Date | Loc | Plant | CFA | Weight | STO 1 | STO 2 ... | Loading. Merge/Fill-down dates and CFAs are automatically recognized."
        samplePlaceholder={`Date\tLoc\tPlant\tCFA\tWeight\tSTO 1\tSTO 2\tLoading
14-09-2026\tMAIN\t1001\tAurangabad\t18 Ton\t4210085492\t4210085493\tTOLAGAON LOADING
14-09-2026\tAQUA\t1002\tPune\t17.3 Ton\t4210085520\t\tBAKAL LOADING`}
        onClose={() => setIsPasteModalOpen(false)}
        onParse={(text, mode) => {
          const res = pasteDispatchSchedule(text, mode);
          return { count: res.plansCount, rawRows: res.rawRowsCount };
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTargetPlan)}
        title="Delete Logical Vehicle Plan"
        message={`Are you sure you want to permanently delete Plan for "${deleteTargetPlan?.cfa}" on ${deleteTargetPlan?.date}? This will clean all associated relationships.`}
        confirmText="Delete Plan"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTargetPlan) {
            deletePlan(deleteTargetPlan.id);
            setDeleteTargetPlan(null);
          }
        }}
        onCancel={() => setDeleteTargetPlan(null)}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(cancelTargetPlan)}
        title="Cancel Vehicle Plan"
        message={`Are you sure you want to cancel the plan for "${cancelTargetPlan?.cfa}" on ${cancelTargetPlan?.date}? Cancelled plans become inactive: they will not match Vehicle Status, will not provide Gate Slips, and will be excluded from active duplicate checks.`}
        confirmText="Cancel Plan"
        confirmVariant="danger"
        onConfirm={() => {
          if (cancelTargetPlan) {
            cancelPlan(cancelTargetPlan.id);
            setCancelTargetPlan(null);
          }
        }}
        onCancel={() => setCancelTargetPlan(null)}
      />

      {/* Reset Live Dispatch Schedule Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset Live Dispatch Schedule?"
        message="Are you sure you want to clear all Vehicle Planning / Live Dispatch records and associated plan relationships? Search and filter settings will also be reset."
        confirmText="Reset"
        confirmVariant="danger"
        onConfirm={() => {
          resetPlanningData();
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
