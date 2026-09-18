import React, { useState, useMemo } from 'react';
import {
  Link2,
  Unlink,
  Clipboard,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Copy,
  ArrowRight,
  Sparkles,
  Search,
  X,
  Layers,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ExcelColumnFilter } from '../components/ExcelColumnFilter';
import { TablePagination } from '../components/TablePagination';
import { useColumnWidths } from '../hooks/useColumnWidths';
import { AuthoritativeRelationship, VehiclePlan, VehicleStatusRecord } from '../types/models';

const DEFAULT_ACTIVE_WIDTHS: Record<string, number> = {
  sNo: 50,
  demandDate: 100,
  requiredDate: 100,
  loadingPt: 120,
  vsLocation: 140,
  planDate: 100,
  planCfa: 140,
  planLoading: 140,
  status: 90,
  action: 110,
};

const DEFAULT_UNLINKED_VS_WIDTHS: Record<string, number> = {
  checkbox: 40,
  sNo: 50,
  demandedDate: 105,
  requiredDate: 105,
  loadingPt: 120,
  location: 140,
  weight: 90,
  action: 85,
};

const DEFAULT_UNLINKED_PLAN_WIDTHS: Record<string, number> = {
  checkbox: 40,
  sNo: 50,
  date: 105,
  cfa: 140,
  loading: 140,
  weight: 90,
  action: 85,
};

interface ActiveLinkItem {
  rel: AuthoritativeRelationship;
  vs: VehicleStatusRecord;
  plan: VehiclePlan;
}

export const VehicleStatusBridgePage: React.FC = () => {
  const {
    bridgeEntries,
    parseAndSetBridgeEntries,
    applyBridgeEntries,
    resetVehicleStatusBridgeData,
    plans,
    vehicleStatusRecords,
    relationships,
    linkExplicit,
    unlinkRelationship,
    getFilterState,
    updateFilterState,
  } = useApp();

  // Column width hooks for all three tables
  const activeWidths = useColumnWidths('table_width_bridge_active', DEFAULT_ACTIVE_WIDTHS);
  const unlinkedVsWidths = useColumnWidths('table_width_bridge_unlinked_vs', DEFAULT_UNLINKED_VS_WIDTHS);
  const unlinkedPlanWidths = useColumnWidths('table_width_bridge_unlinked_plan', DEFAULT_UNLINKED_PLAN_WIDTHS);

  const handleResetColumns = () => {
    activeWidths.resetWidths();
    unlinkedVsWidths.resetWidths();
    unlinkedPlanWidths.resetWidths();
  };

  // Persistent Filter States for the 3 tables
  const activeFilterKey = 'bridge_active_links';
  const unlinkedVsFilterKey = 'bridge_unlinked_vs';
  const unlinkedPlanFilterKey = 'bridge_unlinked_plans';

  const activeFilterState = getFilterState(activeFilterKey);
  const unlinkedVsFilterState = getFilterState(unlinkedVsFilterKey);
  const unlinkedPlanFilterState = getFilterState(unlinkedPlanFilterKey);

  // Manual 1-to-1 Explicit Linker State
  const [selectedVsId, setSelectedVsId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [manualLinkMsg, setManualLinkMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Delete Link Modal State
  const [relToDelete, setRelToDelete] = useState<ActiveLinkItem | null>(null);

  // Bulk Selection State
  const [selectedVsIds, setSelectedVsIds] = useState<Set<string>>(new Set());
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [isBulkLinkModalOpen, setIsBulkLinkModalOpen] = useState(false);
  const [bulkMatchOrder, setBulkMatchOrder] = useState(true);
  const [bulkResultMsg, setBulkResultMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Page Reset Confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Collapsible Paste Queue Section
  const [showPasteSection, setShowPasteSection] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [summary, setSummary] = useState<{
    rawRows: number;
    validRows: number;
    matched: number;
    alreadyLinked: number;
    notFound: number;
    mismatch: number;
  } | null>(null);
  const [applyResult, setApplyResult] = useState<{ count: number; errors: string[] } | null>(null);

  // -------------------------------------------------------------
  // 1. DERIVED ACTIVE RECONCILIATION LINKS
  // -------------------------------------------------------------
  const activeLinks = useMemo<ActiveLinkItem[]>(() => {
    const vsMap = new Map<string, VehicleStatusRecord>();
    vehicleStatusRecords.forEach((vs) => vsMap.set(vs.id, vs));

    const planMap = new Map<string, VehiclePlan>();
    plans.forEach((p) => {
      if (!p.isCancelled) planMap.set(p.id, p);
    });

    const items: ActiveLinkItem[] = [];
    relationships.forEach((rel) => {
      const vs = vsMap.get(rel.vehicleStatusId);
      const plan = planMap.get(rel.planId);
      if (vs && plan) {
        items.push({ rel, vs, plan });
      }
    });

    return items;
  }, [relationships, vehicleStatusRecords, plans]);

  // Unique values for Excel filters on Active Links
  const activeUniqueValues = useMemo(() => {
    const demandDates = new Set<string>();
    const reqDates = new Set<string>();
    const loadingPts = new Set<string>();
    const locations = new Set<string>();
    const planDates = new Set<string>();
    const cfas = new Set<string>();
    const planLoadings = new Set<string>();

    activeLinks.forEach(({ vs, plan }) => {
      if (vs.demandedDate) demandDates.add(vs.demandedDate);
      if (vs.requiredDate) reqDates.add(vs.requiredDate);
      if (vs.loadingPt) loadingPts.add(vs.loadingPt);
      if (vs.location) locations.add(vs.location);
      if (plan.date) planDates.add(plan.date);
      if (plan.cfa) cfas.add(plan.cfa);
      if (plan.loading) planLoadings.add(plan.loading);
    });

    return {
      demandDate: Array.from(demandDates).sort(),
      requiredDate: Array.from(reqDates).sort(),
      loadingPt: Array.from(loadingPts).sort(),
      vsLocation: Array.from(locations).sort(),
      planDate: Array.from(planDates).sort(),
      planCfa: Array.from(cfas).sort(),
      planLoading: Array.from(planLoadings).sort(),
    };
  }, [activeLinks]);

  // Filtered Active Links
  const filteredActiveLinks = useMemo(() => {
    const q = (activeFilterState.globalSearch || '').trim().toLowerCase();
    const colFilters = activeFilterState.columnFilters || {};

    return activeLinks.filter(({ vs, plan }) => {
      // Search
      if (q) {
        const matchesQ =
          vs.demandedDate.toLowerCase().includes(q) ||
          vs.requiredDate.toLowerCase().includes(q) ||
          vs.loadingPt.toLowerCase().includes(q) ||
          vs.location.toLowerCase().includes(q) ||
          plan.date.toLowerCase().includes(q) ||
          plan.cfa.toLowerCase().includes(q) ||
          plan.loading.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      // Column filters
      if (colFilters.demandDate && colFilters.demandDate.length > 0) {
        if (!colFilters.demandDate.includes(vs.demandedDate)) return false;
      }
      if (colFilters.requiredDate && colFilters.requiredDate.length > 0) {
        if (!colFilters.requiredDate.includes(vs.requiredDate)) return false;
      }
      if (colFilters.loadingPt && colFilters.loadingPt.length > 0) {
        if (!colFilters.loadingPt.includes(vs.loadingPt)) return false;
      }
      if (colFilters.vsLocation && colFilters.vsLocation.length > 0) {
        if (!colFilters.vsLocation.includes(vs.location)) return false;
      }
      if (colFilters.planDate && colFilters.planDate.length > 0) {
        if (!colFilters.planDate.includes(plan.date)) return false;
      }
      if (colFilters.planCfa && colFilters.planCfa.length > 0) {
        if (!colFilters.planCfa.includes(plan.cfa)) return false;
      }
      if (colFilters.planLoading && colFilters.planLoading.length > 0) {
        if (!colFilters.planLoading.includes(plan.loading)) return false;
      }

      return true;
    });
  }, [activeLinks, activeFilterState]);

  // Paginated Active Links
  const paginatedActiveLinks = useMemo(() => {
    const rowsPerPage = activeFilterState.rowsPerPage || 10;
    const effectiveRows = rowsPerPage >= 999999 ? filteredActiveLinks.length : rowsPerPage;
    const page = Math.max(1, activeFilterState.currentPage || 1);
    const start = (page - 1) * effectiveRows;
    return filteredActiveLinks.slice(start, start + effectiveRows);
  }, [filteredActiveLinks, activeFilterState]);

  // -------------------------------------------------------------
  // 2. UNLINKED VEHICLE STATUS CALLS
  // -------------------------------------------------------------
  const activeVsIds = useMemo(() => {
    return new Set(relationships.map((r) => r.vehicleStatusId));
  }, [relationships]);

  const unlinkedVsList = useMemo(() => {
    return vehicleStatusRecords.filter((vs) => !activeVsIds.has(vs.id));
  }, [vehicleStatusRecords, activeVsIds]);

  const unlinkedVsUniqueValues = useMemo(() => {
    const demDates = new Set<string>();
    const reqDates = new Set<string>();
    const loadings = new Set<string>();
    const locations = new Set<string>();
    const weights = new Set<string>();

    unlinkedVsList.forEach((vs) => {
      if (vs.demandedDate) demDates.add(vs.demandedDate);
      if (vs.requiredDate) reqDates.add(vs.requiredDate);
      if (vs.loadingPt) loadings.add(vs.loadingPt);
      if (vs.location) locations.add(vs.location);
      if (vs.rawWeight) weights.add(vs.rawWeight);
    });

    return {
      demandedDate: Array.from(demDates).sort(),
      requiredDate: Array.from(reqDates).sort(),
      loadingPt: Array.from(loadings).sort(),
      location: Array.from(locations).sort(),
      weight: Array.from(weights).sort(),
    };
  }, [unlinkedVsList]);

  const filteredUnlinkedVs = useMemo(() => {
    const q = (unlinkedVsFilterState.globalSearch || '').trim().toLowerCase();
    const colFilters = unlinkedVsFilterState.columnFilters || {};

    return unlinkedVsList.filter((vs) => {
      if (q) {
        const match =
          vs.demandedDate.toLowerCase().includes(q) ||
          vs.requiredDate.toLowerCase().includes(q) ||
          vs.loadingPt.toLowerCase().includes(q) ||
          vs.location.toLowerCase().includes(q) ||
          vs.rawWeight.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (colFilters.demandedDate && colFilters.demandedDate.length > 0) {
        if (!colFilters.demandedDate.includes(vs.demandedDate)) return false;
      }
      if (colFilters.requiredDate && colFilters.requiredDate.length > 0) {
        if (!colFilters.requiredDate.includes(vs.requiredDate)) return false;
      }
      if (colFilters.loadingPt && colFilters.loadingPt.length > 0) {
        if (!colFilters.loadingPt.includes(vs.loadingPt)) return false;
      }
      if (colFilters.location && colFilters.location.length > 0) {
        if (!colFilters.location.includes(vs.location)) return false;
      }
      if (colFilters.weight && colFilters.weight.length > 0) {
        if (!colFilters.weight.includes(vs.rawWeight)) return false;
      }

      return true;
    });
  }, [unlinkedVsList, unlinkedVsFilterState]);

  const paginatedUnlinkedVs = useMemo(() => {
    const rowsPerPage = unlinkedVsFilterState.rowsPerPage || 10;
    const effectiveRows = rowsPerPage >= 999999 ? filteredUnlinkedVs.length : rowsPerPage;
    const page = Math.max(1, unlinkedVsFilterState.currentPage || 1);
    const start = (page - 1) * effectiveRows;
    return filteredUnlinkedVs.slice(start, start + effectiveRows);
  }, [filteredUnlinkedVs, unlinkedVsFilterState]);

  // -------------------------------------------------------------
  // 3. UNLINKED DISPATCH PLANS
  // -------------------------------------------------------------
  const activePlanIds = useMemo(() => {
    return new Set(relationships.map((r) => r.planId));
  }, [relationships]);

  const unlinkedPlansList = useMemo(() => {
    return plans.filter((p) => !p.isCancelled && !activePlanIds.has(p.id));
  }, [plans, activePlanIds]);

  const unlinkedPlanUniqueValues = useMemo(() => {
    const dates = new Set<string>();
    const cfas = new Set<string>();
    const loadings = new Set<string>();
    const weights = new Set<string>();

    unlinkedPlansList.forEach((p) => {
      if (p.date) dates.add(p.date);
      if (p.cfa) cfas.add(p.cfa);
      if (p.loading) loadings.add(p.loading);
      if (p.rawWeight) weights.add(p.rawWeight);
    });

    return {
      date: Array.from(dates).sort(),
      cfa: Array.from(cfas).sort(),
      loading: Array.from(loadings).sort(),
      weight: Array.from(weights).sort(),
    };
  }, [unlinkedPlansList]);

  const filteredUnlinkedPlans = useMemo(() => {
    const q = (unlinkedPlanFilterState.globalSearch || '').trim().toLowerCase();
    const colFilters = unlinkedPlanFilterState.columnFilters || {};

    return unlinkedPlansList.filter((p) => {
      if (q) {
        const match =
          p.date.toLowerCase().includes(q) ||
          p.cfa.toLowerCase().includes(q) ||
          p.loading.toLowerCase().includes(q) ||
          p.rawWeight.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (colFilters.date && colFilters.date.length > 0) {
        if (!colFilters.date.includes(p.date)) return false;
      }
      if (colFilters.cfa && colFilters.cfa.length > 0) {
        if (!colFilters.cfa.includes(p.cfa)) return false;
      }
      if (colFilters.loading && colFilters.loading.length > 0) {
        if (!colFilters.loading.includes(p.loading)) return false;
      }
      if (colFilters.weight && colFilters.weight.length > 0) {
        if (!colFilters.weight.includes(p.rawWeight)) return false;
      }

      return true;
    });
  }, [unlinkedPlansList, unlinkedPlanFilterState]);

  const paginatedUnlinkedPlans = useMemo(() => {
    const rowsPerPage = unlinkedPlanFilterState.rowsPerPage || 10;
    const effectiveRows = rowsPerPage >= 999999 ? filteredUnlinkedPlans.length : rowsPerPage;
    const page = Math.max(1, unlinkedPlanFilterState.currentPage || 1);
    const start = (page - 1) * effectiveRows;
    return filteredUnlinkedPlans.slice(start, start + effectiveRows);
  }, [filteredUnlinkedPlans, unlinkedPlanFilterState]);

  // -------------------------------------------------------------
  // 4. SELECTION LOGIC
  // -------------------------------------------------------------
  const handleToggleVsSelect = (id: string) => {
    setSelectedVsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // If only 1 selected, also populate the 1-to-1 linker
    setSelectedVsId(id);
  };

  const handleSelectAllVisibleVs = () => {
    const allVisibleSelected = paginatedUnlinkedVs.every((v) => selectedVsIds.has(v.id));
    setSelectedVsIds((prev) => {
      const next = new Set(prev);
      paginatedUnlinkedVs.forEach((v) => {
        if (allVisibleSelected) next.delete(v.id);
        else next.add(v.id);
      });
      return next;
    });
  };

  const handleClearVsSelection = () => {
    setSelectedVsIds(new Set());
  };

  const handleTogglePlanSelect = (id: string) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // If only 1 selected, also populate the 1-to-1 linker
    setSelectedPlanId(id);
  };

  const handleSelectAllVisiblePlans = () => {
    const allVisibleSelected = paginatedUnlinkedPlans.every((p) => selectedPlanIds.has(p.id));
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      paginatedUnlinkedPlans.forEach((p) => {
        if (allVisibleSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  };

  const handleClearPlanSelection = () => {
    setSelectedPlanIds(new Set());
  };

  // -------------------------------------------------------------
  // 5. 1-to-1 RECONCILIATION LINK ACTION
  // -------------------------------------------------------------
  const handleManualLink = () => {
    if (!selectedVsId || !selectedPlanId) {
      setManualLinkMsg({ text: 'Please select both a Vehicle Status call and a Vehicle Plan.', isError: true });
      return;
    }

    const res = linkExplicit(selectedVsId, selectedPlanId, 'Manual Bridge Single Link');
    if (res.success) {
      setManualLinkMsg({ text: 'Successfully linked Vehicle Status Call with Dispatch Plan!', isError: false });
      setSelectedVsIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedVsId);
        return next;
      });
      setSelectedPlanIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedPlanId);
        return next;
      });
      setSelectedVsId('');
      setSelectedPlanId('');
    } else {
      setManualLinkMsg({ text: res.error || 'Failed to link', isError: true });
    }
  };

  // -------------------------------------------------------------
  // 6. CONTROLLED BULK LINKING
  // -------------------------------------------------------------
  const selectedVsArray = useMemo(() => {
    return unlinkedVsList.filter((vs) => selectedVsIds.has(vs.id));
  }, [unlinkedVsList, selectedVsIds]);

  const selectedPlanArray = useMemo(() => {
    return unlinkedPlansList.filter((p) => selectedPlanIds.has(p.id));
  }, [unlinkedPlansList, selectedPlanIds]);

  const bulkPairings = useMemo(() => {
    if (!bulkMatchOrder || selectedVsArray.length === 0 || selectedPlanArray.length === 0) {
      return [];
    }
    const count = Math.min(selectedVsArray.length, selectedPlanArray.length);
    const pairs: { vs: VehicleStatusRecord; plan: VehiclePlan; hasConflict: boolean; conflictMsg?: string }[] = [];

    for (let i = 0; i < count; i++) {
      const vs = selectedVsArray[i];
      const plan = selectedPlanArray[i];

      const vsAlreadyLinked = relationships.some((r) => r.vehicleStatusId === vs.id);
      const planAlreadyLinked = relationships.some((r) => r.planId === plan.id);

      let hasConflict = false;
      let conflictMsg: string | undefined;

      if (vsAlreadyLinked) {
        hasConflict = true;
        conflictMsg = 'VEHICLE STATUS ALREADY LINKED';
      } else if (planAlreadyLinked) {
        hasConflict = true;
        conflictMsg = 'PLAN ALREADY LINKED';
      }

      pairs.push({ vs, plan, hasConflict, conflictMsg });
    }

    return pairs;
  }, [bulkMatchOrder, selectedVsArray, selectedPlanArray, relationships]);

  const handleConfirmBulkLink = () => {
    if (bulkPairings.length === 0) return;

    let successCount = 0;
    const errors: string[] = [];

    bulkPairings.forEach(({ vs, plan, hasConflict, conflictMsg }) => {
      if (hasConflict) {
        errors.push(`${vs.location} ↔ ${plan.cfa}: ${conflictMsg}`);
        return;
      }

      const res = linkExplicit(vs.id, plan.id, 'Manual Bridge Bulk Link');
      if (res.success) {
        successCount++;
      } else {
        errors.push(`${vs.location} ↔ ${plan.cfa}: ${res.error}`);
      }
    });

    if (errors.length > 0) {
      setBulkResultMsg({
        text: `Linked ${successCount} pair(s). ${errors.length} conflict(s) prevented: ${errors.join('; ')}`,
        isError: true,
      });
    } else {
      setBulkResultMsg({
        text: `Successfully linked ${successCount} relationship(s)!`,
        isError: false,
      });
    }

    // Clear selections and close modal
    setSelectedVsIds(new Set());
    setSelectedPlanIds(new Set());
    setSelectedVsId('');
    setSelectedPlanId('');
    setIsBulkLinkModalOpen(false);
  };

  // -------------------------------------------------------------
  // 7. DELETE LINK ACTION
  // -------------------------------------------------------------
  const handleConfirmDeleteLink = () => {
    if (!relToDelete) return;
    unlinkRelationship(relToDelete.rel.id);
    setRelToDelete(null);
  };

  // -------------------------------------------------------------
  // 8. PASTE QUEUE ACTIONS (PRESERVED)
  // -------------------------------------------------------------
  const handleParse = () => {
    if (!pasteInput.trim()) {
      alert('Please paste data into the text box first.');
      return;
    }
    const res = parseAndSetBridgeEntries(pasteInput, importMode);
    setSummary(res);
    setApplyResult(null);
  };

  const handleApply = () => {
    const res = applyBridgeEntries();
    setApplyResult({ count: res.appliedCount, errors: res.errors });
  };

  const handleCopyToExcel = () => {
    const headers = [
      'Demand Date',
      'Required Date',
      'Loading Pt.',
      'Location',
      'Plan Date',
      'Plan CFA',
      'Plan Loading',
      'Status',
    ];

    const rows = activeLinks.map(({ vs, plan }) => [
      vs.demandedDate,
      vs.requiredDate,
      vs.loadingPt,
      vs.location,
      plan.date,
      plan.cfa,
      plan.loading,
      'Linked',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      alert('Copied Active Reconciliation Links table to clipboard (Excel Tab-Separated format)!');
    });
  };

  return (
    <div className="p-4 space-y-4 font-sans text-slate-800">
      {/* 1. Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 rounded p-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Vehicle Status Bridge (Manual / Bulk Reconciliation)
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Manage authoritative VS-ID ↔ PLAN-ID relationships, view unlinked calls, and link records safely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeLinks.length > 0 && (
            <button
              onClick={handleCopyToExcel}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors shadow-xs"
              title="Copy active links to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-slate-600" />
              <span>Copy Active Links</span>
            </button>
          )}

          <button
            onClick={handleResetColumns}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors shadow-xs"
            title="Reset column widths on this page"
          >
            Reset Columns
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors shadow-xs"
            title="Reset Vehicle Status Bridge input/history dataset"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>RESET BRIDGE DATA</span>
          </button>
        </div>
      </div>

      {/* Global Results or Bulk Messages */}
      {bulkResultMsg && (
        <div
          className={`p-2.5 rounded text-xs flex items-center justify-between gap-2 border ${
            bulkResultMsg.isError
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bulkResultMsg.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{bulkResultMsg.text}</span>
          </div>
          <button
            onClick={() => setBulkResultMsg(null)}
            className="text-slate-500 hover:text-slate-800 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Direct 1-to-1 Reconciliation Linker */}
      <div className="bg-slate-50 border border-slate-300 rounded p-3 shadow-xs space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1.5 gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Direct 1-to-1 Reconciliation Linker</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Select an unlinked Vehicle Status call and pair with an unlinked Dispatch Plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-1">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Unlinked Vehicle Status Call:
            </label>
            <select
              value={selectedVsId}
              onChange={(e) => {
                setSelectedVsId(e.target.value);
                setManualLinkMsg(null);
              }}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Choose Unlinked Vehicle Status ({unlinkedVsList.length}) --</option>
              {unlinkedVsList.map((vs) => (
                <option key={vs.id} value={vs.id}>
                  {vs.demandedDate} | {vs.location} ({vs.loadingPt}) - {vs.rawWeight}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Unlinked Dispatch Plan:
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                setManualLinkMsg(null);
              }}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Choose Unlinked Dispatch Plan ({unlinkedPlansList.length}) --</option>
              {unlinkedPlansList.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.date} | {plan.cfa} ({plan.loading}) - {plan.rawWeight}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={handleManualLink}
              disabled={!selectedVsId || !selectedPlanId}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors shadow-xs"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Establish Authoritative Link</span>
            </button>
          </div>
        </div>

        {manualLinkMsg && (
          <div
            className={`p-2 rounded text-xs flex items-center justify-between gap-2 border ${
              manualLinkMsg.isError
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {manualLinkMsg.isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
              <span>{manualLinkMsg.text}</span>
            </div>
            <button
              onClick={() => setManualLinkMsg(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 3. ACTIVE RECONCILIATION LINKS SECTION */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
              Active Reconciliation Links
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              {activeLinks.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Search Active Links..."
                value={activeFilterState.globalSearch || ''}
                onChange={(e) =>
                  updateFilterState(activeFilterKey, { globalSearch: e.target.value, currentPage: 1 })
                }
                className="pl-7 pr-7 py-1 text-xs bg-white border border-slate-300 rounded w-48 focus:w-64 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {activeFilterState.globalSearch && (
                <button
                  onClick={() => updateFilterState(activeFilterKey, { globalSearch: '', currentPage: 1 })}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Clear Filters if any active */}
            {Boolean(
              activeFilterState.globalSearch ||
                (activeFilterState.columnFilters && Object.keys(activeFilterState.columnFilters).length > 0)
            ) && (
              <button
                onClick={() =>
                  updateFilterState(activeFilterKey, { globalSearch: '', columnFilters: {}, currentPage: 1 })
                }
                className="text-xs text-blue-700 hover:underline px-1.5 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Links Table */}
        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-xs text-center border-collapse font-sans">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr className="divide-x divide-slate-200">
                <th
                  style={{ width: activeWidths.getWidth('sNo'), minWidth: activeWidths.getWidth('sNo') }}
                  className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                >
                  <span>S No.</span>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('sNo', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('demandDate'), minWidth: activeWidths.getWidth('demandDate') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Demand Date</span>
                    <ExcelColumnFilter
                      columnKey="demandDate"
                      title="Demand Date"
                      allValues={activeUniqueValues.demandDate}
                      selectedValues={activeFilterState.columnFilters?.demandDate}
                      onFilterChange={(selected) =>
                        updateFilterState(activeFilterKey, {
                          columnFilters: { ...(activeFilterState.columnFilters || {}), demandDate: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('demandDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('requiredDate'), minWidth: activeWidths.getWidth('requiredDate') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Required Date</span>
                    <ExcelColumnFilter
                      columnKey="requiredDate"
                      title="Required Date"
                      allValues={activeUniqueValues.requiredDate}
                      selectedValues={activeFilterState.columnFilters?.requiredDate}
                      onFilterChange={(selected) =>
                        updateFilterState(activeFilterKey, {
                          columnFilters: { ...(activeFilterState.columnFilters || {}), requiredDate: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('requiredDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('loadingPt'), minWidth: activeWidths.getWidth('loadingPt') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Loading Pt.</span>
                    <ExcelColumnFilter
                      columnKey="loadingPt"
                      title="Loading Pt."
                      allValues={activeUniqueValues.loadingPt}
                      selectedValues={activeFilterState.columnFilters?.loadingPt}
                      onFilterChange={(selected) =>
                        updateFilterState(activeFilterKey, {
                          columnFilters: { ...(activeFilterState.columnFilters || {}), loadingPt: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('loadingPt', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('vsLocation'), minWidth: activeWidths.getWidth('vsLocation') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status Location</span>
                    <ExcelColumnFilter
                      columnKey="vsLocation"
                      title="Status Location"
                      allValues={activeUniqueValues.vsLocation}
                      selectedValues={activeFilterState.columnFilters?.vsLocation}
                      onFilterChange={(selected) =>
                        updateFilterState(activeFilterKey, {
                          columnFilters: { ...(activeFilterState.columnFilters || {}), vsLocation: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('vsLocation', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('planDate'), minWidth: activeWidths.getWidth('planDate') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Plan Date</span>
                    <ExcelColumnFilter
                      columnKey="planDate"
                      title="Plan Date"
                      allValues={activeUniqueValues.planDate}
                      selectedValues={activeFilterState.columnFilters?.planDate}
                      onFilterChange={(selected) =>
                        updateFilterState(activeFilterKey, {
                          columnFilters: { ...(activeFilterState.columnFilters || {}), planDate: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('planDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('planCfa'), minWidth: activeWidths.getWidth('planCfa') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Plan CFA</span>
                    <ExcelColumnFilter
                      columnKey="planCfa"
                      title="Plan CFA"
                      allValues={activeUniqueValues.planCfa}
                      selectedValues={activeFilterState.columnFilters?.planCfa}
                      onFilterChange={(selected) =>
                        updateFilterState(activeFilterKey, {
                          columnFilters: { ...(activeFilterState.columnFilters || {}), planCfa: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('planCfa', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('planLoading'), minWidth: activeWidths.getWidth('planLoading') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Plan Loading</span>
                    <ExcelColumnFilter
                      columnKey="planLoading"
                      title="Plan Loading"
                      allValues={activeUniqueValues.planLoading}
                      selectedValues={activeFilterState.columnFilters?.planLoading}
                      onFilterChange={(selected) =>
                        updateFilterState(activeFilterKey, {
                          columnFilters: { ...(activeFilterState.columnFilters || {}), planLoading: selected },
                          currentPage: 1,
                        })
                      }
                    />
                  </div>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('planLoading', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('status'), minWidth: activeWidths.getWidth('status') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <span>Status</span>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('status', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>

                <th
                  style={{ width: activeWidths.getWidth('action'), minWidth: activeWidths.getWidth('action') }}
                  className="py-1 px-2 text-center bg-slate-50 relative select-none"
                >
                  <span>Action</span>
                  <div
                    onMouseDown={(e) => activeWidths.startResizing('action', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                  />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredActiveLinks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400 font-medium">
                    {activeLinks.length === 0
                      ? 'No active reconciliation links.'
                      : 'No active reconciliation links match the current search/filter.'}
                  </td>
                </tr>
              ) : (
                paginatedActiveLinks.map((item, idx) => {
                  const sNo =
                    ((activeFilterState.currentPage || 1) - 1) *
                      (activeFilterState.rowsPerPage >= 999999 ? filteredActiveLinks.length : activeFilterState.rowsPerPage || 10) +
                    idx +
                    1;

                  return (
                    <tr
                      key={item.rel.id}
                      className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-100 text-slate-800 leading-tight"
                    >
                      <td className="py-1 px-1.5 text-center font-mono text-slate-500 bg-slate-50/70">
                        {sNo}
                      </td>
                      <td className="py-1 px-2 font-medium text-center">{item.vs.demandedDate}</td>
                      <td className="py-1 px-2 font-medium text-center text-slate-600">{item.vs.requiredDate}</td>
                      <td className="py-1 px-2 text-center text-slate-600">{item.vs.loadingPt}</td>
                      <td className="py-1 px-2 font-semibold text-slate-900 text-center">{item.vs.location}</td>
                      <td className="py-1 px-2 font-medium text-center">{item.plan.date}</td>
                      <td className="py-1 px-2 font-semibold text-slate-900 text-center">{item.plan.cfa}</td>
                      <td className="py-1 px-2 text-center text-slate-600">{item.plan.loading}</td>
                      <td className="py-1 px-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Linked</span>
                        </span>
                      </td>
                      <td className="py-1 px-2 text-center">
                        <button
                          onClick={() => setRelToDelete(item)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                          title="Remove reconciliation link"
                        >
                          <Unlink className="w-3 h-3 text-rose-600" />
                          <span>DELETE LINK</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Active Links Pagination */}
        <TablePagination
          totalItems={filteredActiveLinks.length}
          currentPage={activeFilterState.currentPage || 1}
          rowsPerPage={activeFilterState.rowsPerPage || 10}
          onPageChange={(p) => updateFilterState(activeFilterKey, { currentPage: p })}
          onRowsPerPageChange={(r) => updateFilterState(activeFilterKey, { rowsPerPage: r })}
          rowOptions={[5, 10, 15, 'All']}
        />
      </div>

      {/* Floating / Sticky Bulk Action Bar if items selected */}
      {(selectedVsIds.size > 0 || selectedPlanIds.size > 0) && (
        <div className="bg-blue-900 text-white p-2.5 rounded shadow-md flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Selected: <strong className="text-amber-300">{selectedVsIds.size}</strong> Vehicle Status Call(s) and{' '}
              <strong className="text-amber-300">{selectedPlanIds.size}</strong> Dispatch Plan(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleClearVsSelection();
                handleClearPlanSelection();
              }}
              className="px-2.5 py-1 bg-blue-800 hover:bg-blue-700 text-slate-200 rounded transition-colors text-xs"
            >
              Clear All Selections
            </button>

            <button
              onClick={() => setIsBulkLinkModalOpen(true)}
              disabled={selectedVsIds.size === 0 || selectedPlanIds.size === 0}
              className="flex items-center gap-1.5 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed font-bold text-white rounded transition-colors shadow-xs text-xs"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>LINK SELECTED ({Math.min(selectedVsIds.size, selectedPlanIds.size)})</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 & 5. UNLINKED DATASETS (2-COLUMN GRID ON LARGE DESKTOPS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 4. UNLINKED VEHICLE STATUS CALL SECTION */}
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden flex flex-col">
          <div className="p-2.5 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Unlinked Vehicle Status Call
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                {unlinkedVsList.length}
              </span>
              {selectedVsIds.size > 0 && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  {selectedVsIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Search unlinked calls..."
                  value={unlinkedVsFilterState.globalSearch || ''}
                  onChange={(e) =>
                    updateFilterState(unlinkedVsFilterKey, { globalSearch: e.target.value, currentPage: 1 })
                  }
                  className="pl-7 pr-7 py-1 text-xs bg-white border border-slate-300 rounded w-36 focus:w-48 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {unlinkedVsFilterState.globalSearch && (
                  <button
                    onClick={() => updateFilterState(unlinkedVsFilterKey, { globalSearch: '', currentPage: 1 })}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedVsIds.size > 0 && (
                <button
                  onClick={handleClearVsSelection}
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[350px]">
            <table className="w-full text-xs text-center border-collapse font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                <tr className="divide-x divide-slate-200">
                  <th
                    style={{ width: unlinkedVsWidths.getWidth('checkbox'), minWidth: unlinkedVsWidths.getWidth('checkbox') }}
                    className="py-1 px-1 text-center bg-slate-50 select-none"
                  >
                    <button
                      onClick={handleSelectAllVisibleVs}
                      title="Select all visible calls"
                      className="text-slate-600 hover:text-blue-600"
                    >
                      {paginatedUnlinkedVs.length > 0 &&
                      paginatedUnlinkedVs.every((v) => selectedVsIds.has(v.id)) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                      ) : (
                        <Square className="w-4 h-4 mx-auto" />
                      )}
                    </button>
                  </th>

                  <th
                    style={{ width: unlinkedVsWidths.getWidth('sNo'), minWidth: unlinkedVsWidths.getWidth('sNo') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <span>S No.</span>
                    <div
                      onMouseDown={(e) => unlinkedVsWidths.startResizing('sNo', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedVsWidths.getWidth('demandedDate'), minWidth: unlinkedVsWidths.getWidth('demandedDate') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Demanded</span>
                      <ExcelColumnFilter
                        columnKey="demandedDate"
                        title="Demanded Date"
                        allValues={unlinkedVsUniqueValues.demandedDate}
                        selectedValues={unlinkedVsFilterState.columnFilters?.demandedDate}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedVsFilterKey, {
                            columnFilters: { ...(unlinkedVsFilterState.columnFilters || {}), demandedDate: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedVsWidths.startResizing('demandedDate', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedVsWidths.getWidth('requiredDate'), minWidth: unlinkedVsWidths.getWidth('requiredDate') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Required</span>
                      <ExcelColumnFilter
                        columnKey="requiredDate"
                        title="Required Date"
                        allValues={unlinkedVsUniqueValues.requiredDate}
                        selectedValues={unlinkedVsFilterState.columnFilters?.requiredDate}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedVsFilterKey, {
                            columnFilters: { ...(unlinkedVsFilterState.columnFilters || {}), requiredDate: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedVsWidths.startResizing('requiredDate', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedVsWidths.getWidth('loadingPt'), minWidth: unlinkedVsWidths.getWidth('loadingPt') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Loading Pt.</span>
                      <ExcelColumnFilter
                        columnKey="loadingPt"
                        title="Loading Pt."
                        allValues={unlinkedVsUniqueValues.loadingPt}
                        selectedValues={unlinkedVsFilterState.columnFilters?.loadingPt}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedVsFilterKey, {
                            columnFilters: { ...(unlinkedVsFilterState.columnFilters || {}), loadingPt: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedVsWidths.startResizing('loadingPt', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedVsWidths.getWidth('location'), minWidth: unlinkedVsWidths.getWidth('location') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Location</span>
                      <ExcelColumnFilter
                        columnKey="location"
                        title="Location"
                        allValues={unlinkedVsUniqueValues.location}
                        selectedValues={unlinkedVsFilterState.columnFilters?.location}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedVsFilterKey, {
                            columnFilters: { ...(unlinkedVsFilterState.columnFilters || {}), location: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedVsWidths.startResizing('location', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedVsWidths.getWidth('weight'), minWidth: unlinkedVsWidths.getWidth('weight') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Weight</span>
                      <ExcelColumnFilter
                        columnKey="weight"
                        title="Weight"
                        allValues={unlinkedVsUniqueValues.weight}
                        selectedValues={unlinkedVsFilterState.columnFilters?.weight}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedVsFilterKey, {
                            columnFilters: { ...(unlinkedVsFilterState.columnFilters || {}), weight: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedVsWidths.startResizing('weight', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedVsWidths.getWidth('action'), minWidth: unlinkedVsWidths.getWidth('action') }}
                    className="py-1 px-1.5 text-center bg-slate-50 select-none"
                  >
                    <span>Link</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredUnlinkedVs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400 font-medium">
                      {unlinkedVsList.length === 0
                        ? 'No unlinked Vehicle Status calls.'
                        : 'No unlinked Vehicle Status calls match search.'}
                    </td>
                  </tr>
                ) : (
                  paginatedUnlinkedVs.map((vs, idx) => {
                    const isSelected = selectedVsIds.has(vs.id);
                    const isDirectChosen = selectedVsId === vs.id;
                    const sNo =
                      ((unlinkedVsFilterState.currentPage || 1) - 1) *
                        (unlinkedVsFilterState.rowsPerPage >= 999999 ? filteredUnlinkedVs.length : unlinkedVsFilterState.rowsPerPage || 10) +
                      idx +
                      1;

                    return (
                      <tr
                        key={vs.id}
                        className={`transition-colors divide-x divide-slate-100 text-slate-800 leading-tight ${
                          isSelected || isDirectChosen
                            ? 'bg-blue-50 font-medium'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => handleToggleVsSelect(vs.id)}
                            className="text-slate-600 hover:text-blue-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 mx-auto" />
                            )}
                          </button>
                        </td>
                        <td className="py-1 px-1.5 text-center font-mono text-slate-500 bg-slate-50/50">
                          {sNo}
                        </td>
                        <td className="py-1 px-1.5 text-center">{vs.demandedDate}</td>
                        <td className="py-1 px-1.5 text-center text-slate-600">{vs.requiredDate}</td>
                        <td className="py-1 px-1.5 text-center text-slate-600">{vs.loadingPt}</td>
                        <td className="py-1 px-1.5 font-semibold text-slate-900 text-center">{vs.location}</td>
                        <td className="py-1 px-1.5 text-center">{vs.rawWeight}</td>
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => {
                              setSelectedVsId(vs.id);
                              setManualLinkMsg(null);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                              isDirectChosen
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-100 hover:bg-blue-100 text-blue-700 border border-slate-300'
                            }`}
                          >
                            {isDirectChosen ? 'Chosen' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            totalItems={filteredUnlinkedVs.length}
            currentPage={unlinkedVsFilterState.currentPage || 1}
            rowsPerPage={unlinkedVsFilterState.rowsPerPage || 10}
            onPageChange={(p) => updateFilterState(unlinkedVsFilterKey, { currentPage: p })}
            onRowsPerPageChange={(r) => updateFilterState(unlinkedVsFilterKey, { rowsPerPage: r })}
            rowOptions={[5, 10, 15, 'All']}
          />
        </div>

        {/* 5. UNLINKED DISPATCH PLAN SECTION */}
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden flex flex-col">
          <div className="p-2.5 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Unlinked Dispatch Plan
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                {unlinkedPlansList.length}
              </span>
              {selectedPlanIds.size > 0 && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  {selectedPlanIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Search unlinked plans..."
                  value={unlinkedPlanFilterState.globalSearch || ''}
                  onChange={(e) =>
                    updateFilterState(unlinkedPlanFilterKey, { globalSearch: e.target.value, currentPage: 1 })
                  }
                  className="pl-7 pr-7 py-1 text-xs bg-white border border-slate-300 rounded w-36 focus:w-48 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {unlinkedPlanFilterState.globalSearch && (
                  <button
                    onClick={() => updateFilterState(unlinkedPlanFilterKey, { globalSearch: '', currentPage: 1 })}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedPlanIds.size > 0 && (
                <button
                  onClick={handleClearPlanSelection}
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[350px]">
            <table className="w-full text-xs text-center border-collapse font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                <tr className="divide-x divide-slate-200">
                  <th
                    style={{ width: unlinkedPlanWidths.getWidth('checkbox'), minWidth: unlinkedPlanWidths.getWidth('checkbox') }}
                    className="py-1 px-1 text-center bg-slate-50 select-none"
                  >
                    <button
                      onClick={handleSelectAllVisiblePlans}
                      title="Select all visible plans"
                      className="text-slate-600 hover:text-blue-600"
                    >
                      {paginatedUnlinkedPlans.length > 0 &&
                      paginatedUnlinkedPlans.every((p) => selectedPlanIds.has(p.id)) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                      ) : (
                        <Square className="w-4 h-4 mx-auto" />
                      )}
                    </button>
                  </th>

                  <th
                    style={{ width: unlinkedPlanWidths.getWidth('sNo'), minWidth: unlinkedPlanWidths.getWidth('sNo') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <span>S No.</span>
                    <div
                      onMouseDown={(e) => unlinkedPlanWidths.startResizing('sNo', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedPlanWidths.getWidth('date'), minWidth: unlinkedPlanWidths.getWidth('date') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Date</span>
                      <ExcelColumnFilter
                        columnKey="date"
                        title="Plan Date"
                        allValues={unlinkedPlanUniqueValues.date}
                        selectedValues={unlinkedPlanFilterState.columnFilters?.date}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedPlanFilterKey, {
                            columnFilters: { ...(unlinkedPlanFilterState.columnFilters || {}), date: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedPlanWidths.startResizing('date', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedPlanWidths.getWidth('cfa'), minWidth: unlinkedPlanWidths.getWidth('cfa') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>CFA</span>
                      <ExcelColumnFilter
                        columnKey="cfa"
                        title="CFA"
                        allValues={unlinkedPlanUniqueValues.cfa}
                        selectedValues={unlinkedPlanFilterState.columnFilters?.cfa}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedPlanFilterKey, {
                            columnFilters: { ...(unlinkedPlanFilterState.columnFilters || {}), cfa: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedPlanWidths.startResizing('cfa', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedPlanWidths.getWidth('loading'), minWidth: unlinkedPlanWidths.getWidth('loading') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Loading</span>
                      <ExcelColumnFilter
                        columnKey="loading"
                        title="Loading"
                        allValues={unlinkedPlanUniqueValues.loading}
                        selectedValues={unlinkedPlanFilterState.columnFilters?.loading}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedPlanFilterKey, {
                            columnFilters: { ...(unlinkedPlanFilterState.columnFilters || {}), loading: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedPlanWidths.startResizing('loading', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedPlanWidths.getWidth('weight'), minWidth: unlinkedPlanWidths.getWidth('weight') }}
                    className="py-1 px-1.5 text-center bg-slate-50 relative select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Weight</span>
                      <ExcelColumnFilter
                        columnKey="weight"
                        title="Weight"
                        allValues={unlinkedPlanUniqueValues.weight}
                        selectedValues={unlinkedPlanFilterState.columnFilters?.weight}
                        onFilterChange={(selected) =>
                          updateFilterState(unlinkedPlanFilterKey, {
                            columnFilters: { ...(unlinkedPlanFilterState.columnFilters || {}), weight: selected },
                            currentPage: 1,
                          })
                        }
                      />
                    </div>
                    <div
                      onMouseDown={(e) => unlinkedPlanWidths.startResizing('weight', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: unlinkedPlanWidths.getWidth('action'), minWidth: unlinkedPlanWidths.getWidth('action') }}
                    className="py-1 px-1.5 text-center bg-slate-50 select-none"
                  >
                    <span>Link</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredUnlinkedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 font-medium">
                      {unlinkedPlansList.length === 0
                        ? 'No unlinked Dispatch Plans.'
                        : 'No unlinked Dispatch Plans match search.'}
                    </td>
                  </tr>
                ) : (
                  paginatedUnlinkedPlans.map((plan, idx) => {
                    const isSelected = selectedPlanIds.has(plan.id);
                    const isDirectChosen = selectedPlanId === plan.id;
                    const sNo =
                      ((unlinkedPlanFilterState.currentPage || 1) - 1) *
                        (unlinkedPlanFilterState.rowsPerPage >= 999999 ? filteredUnlinkedPlans.length : unlinkedPlanFilterState.rowsPerPage || 10) +
                      idx +
                      1;

                    return (
                      <tr
                        key={plan.id}
                        className={`transition-colors divide-x divide-slate-100 text-slate-800 leading-tight ${
                          isSelected || isDirectChosen
                            ? 'bg-blue-50 font-medium'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => handleTogglePlanSelect(plan.id)}
                            className="text-slate-600 hover:text-blue-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 mx-auto" />
                            )}
                          </button>
                        </td>
                        <td className="py-1 px-1.5 text-center font-mono text-slate-500 bg-slate-50/50">
                          {sNo}
                        </td>
                        <td className="py-1 px-1.5 text-center">{plan.date}</td>
                        <td className="py-1 px-1.5 font-semibold text-slate-900 text-center">{plan.cfa}</td>
                        <td className="py-1 px-1.5 text-center text-slate-600">{plan.loading}</td>
                        <td className="py-1 px-1.5 text-center">{plan.rawWeight}</td>
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => {
                              setSelectedPlanId(plan.id);
                              setManualLinkMsg(null);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                              isDirectChosen
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-100 hover:bg-blue-100 text-blue-700 border border-slate-300'
                            }`}
                          >
                            {isDirectChosen ? 'Chosen' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            totalItems={filteredUnlinkedPlans.length}
            currentPage={unlinkedPlanFilterState.currentPage || 1}
            rowsPerPage={unlinkedPlanFilterState.rowsPerPage || 10}
            onPageChange={(p) => updateFilterState(unlinkedPlanFilterKey, { currentPage: p })}
            onRowsPerPageChange={(r) => updateFilterState(unlinkedPlanFilterKey, { rowsPerPage: r })}
            rowOptions={[5, 10, 15, 'All']}
          />
        </div>
      </div>

      {/* 6. COLLAPSIBLE BULK RECONCILIATION PASTE & QUEUE (EXPANDABLE) */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        <button
          onClick={() => setShowPasteSection((prev) => !prev)}
          className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-slate-700" />
            <span className="font-bold text-xs text-slate-800">
              Bulk Reconciliation Paste & Queue Tool (Optional)
            </span>
            {bridgeEntries.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {bridgeEntries.length} items in queue
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <span>{showPasteSection ? 'Hide Paste Tool' : 'Show Paste Tool'}</span>
            {showPasteSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showPasteSection && (
          <div className="p-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-4 text-slate-600">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="bridgeImportMode"
                    checked={importMode === 'APPEND'}
                    onChange={() => setImportMode('APPEND')}
                    className="text-blue-600"
                  />
                  <span>Append to Queue</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="bridgeImportMode"
                    checked={importMode === 'REPLACE'}
                    onChange={() => setImportMode('REPLACE')}
                    className="text-rose-600"
                  />
                  <span className="text-rose-800 font-medium">Replace Queue Only</span>
                </label>
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded p-2 text-blue-900 leading-relaxed font-sans text-[11px]">
              <strong>Expected Paste Columns:</strong> Demanded Date | Required Date | Loading Pt. | Location | Plan Date | CFA | Loading
              <br />
              <em>Paste rows directly from Excel. Matches will be verified against authoritative records.</em>
            </div>

            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder={`14-09-2026\t15-09-2026\tTolagaon\tAurangabad 1\t15-09-2026\tAurangabad 1\tTOLAGAON LOADING
14-09-2026\t15-09-2026\tTolagaon\tAurangabad 2\t15-09-2026\tAurangabad 2\tTOLAGAON LOADING`}
              rows={3}
              className="w-full font-mono text-xs p-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={handleParse}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded transition-colors shadow-xs"
              >
                Parse & Validate Bridge Rows
              </button>

              {bridgeEntries.length > 0 && (
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>APPLY Confirmed Bridge Links</span>
                </button>
              )}
            </div>

            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-100 border border-slate-200 rounded p-2.5 text-center text-xs">
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Raw Rows</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{summary.rawRows}</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Valid Rows</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{summary.validRows}</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-emerald-200 text-emerald-800">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Matched</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">{summary.matched}</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-800">
                  <span className="text-blue-700 block text-[10px] uppercase font-bold">Already Linked</span>
                  <span className="font-mono font-bold text-blue-800 text-sm">{summary.alreadyLinked}</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-amber-200 text-amber-800">
                  <span className="text-amber-700 block text-[10px] uppercase font-bold">Not Found</span>
                  <span className="font-mono font-bold text-amber-800 text-sm">{summary.notFound}</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-rose-200 text-rose-800">
                  <span className="text-rose-700 block text-[10px] uppercase font-bold">Mismatch</span>
                  <span className="font-mono font-bold text-rose-800 text-sm">{summary.mismatch}</span>
                </div>
              </div>
            )}

            {applyResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Applied {applyResult.count} authoritative links to system state.</span>
                </div>
                {applyResult.errors.length > 0 && (
                  <span className="text-rose-700 font-semibold text-[11px]">
                    {applyResult.errors.length} errors occurred.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Reconciliation Link Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(relToDelete)}
        title="Delete this reconciliation link?"
        message="This will remove only the relationship between the selected Vehicle Status Call and Vehicle Plan. The original Vehicle Status and Vehicle Plan records will NOT be deleted."
        confirmText="Delete Link"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteLink}
        onCancel={() => setRelToDelete(null)}
      />

      {/* Controlled Bulk Link Preview Modal */}
      {isBulkLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">Controlled Bulk Link Pairing Preview</h3>
              </div>
              <button
                onClick={() => setIsBulkLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 text-xs">
              <p className="text-slate-600">
                Review the proposed 1-to-1 pairings between your selected Vehicle Status Calls and Dispatch Plans.
                Strict 1-to-1 rules apply. Existing relationships will never be silently overwritten.
              </p>

              {/* Status summary */}
              <div className="flex flex-wrap items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded gap-2">
                <div className="space-x-3">
                  <span>Selected Calls: <strong>{selectedVsArray.length}</strong></span>
                  <span>Selected Plans: <strong>{selectedPlanArray.length}</strong></span>
                </div>
                {selectedVsArray.length !== selectedPlanArray.length && (
                  <span className="text-amber-700 font-semibold text-[11px]">
                    Counts differ ({selectedVsArray.length} vs {selectedPlanArray.length}) — only the first {Math.min(selectedVsArray.length, selectedPlanArray.length)} will be paired.
                  </span>
                )}
              </div>

              {/* Explicit match by order checkbox */}
              <label className="flex items-center gap-2 p-2 bg-blue-50/70 border border-blue-200 rounded cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkMatchOrder}
                  onChange={(e) => setBulkMatchOrder(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-slate-800 font-semibold">
                  Match by Displayed Order (sequential 1-to-1 pairing)
                </span>
              </label>

              {/* Pair Preview Table */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr className="divide-x divide-slate-200">
                      <th className="py-1 px-1.5 w-10">#</th>
                      <th className="py-1 px-2">Vehicle Status Call</th>
                      <th className="py-1 px-1 w-8">↔</th>
                      <th className="py-1 px-2">Dispatch Plan</th>
                      <th className="py-1 px-2 w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bulkPairings.map((pair, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 divide-x divide-slate-100 leading-tight">
                        <td className="py-1 px-1.5 text-center font-mono text-slate-500 bg-slate-50">{idx + 1}</td>
                        <td className="py-1 px-2 text-left font-medium text-slate-800">
                          {pair.vs.demandedDate} | {pair.vs.location} ({pair.vs.loadingPt})
                        </td>
                        <td className="py-1 px-1 text-center text-blue-500">↔</td>
                        <td className="py-1 px-2 text-left font-medium text-slate-800">
                          {pair.plan.date} | {pair.plan.cfa} ({pair.plan.loading})
                        </td>
                        <td className="py-1 px-2 text-center">
                          {pair.hasConflict ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Conflict</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Ready</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                onClick={() => setIsBulkLinkModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmBulkLink}
                disabled={bulkPairings.length === 0 || bulkPairings.some((p) => p.hasConflict)}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Link ({bulkPairings.filter((p) => !p.hasConflict).length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Bridge Data */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset Vehicle Status Bridge Data?"
        message="This will clear only the Vehicle Status Bridge dataset, input queue, and paste history. Your active VS-ID ↔ PLAN-ID relationships and source records will NOT be deleted."
        confirmText="Reset Bridge Data"
        confirmVariant="danger"
        onConfirm={() => {
          resetVehicleStatusBridgeData();
          setSummary(null);
          setApplyResult(null);
          setPasteInput('');
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
