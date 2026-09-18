import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Clock,
  Truck,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  MapPin,
  ExternalLink,
  Plus,
  Trash2,
  ListFilter,
  ShieldAlert,
  RotateCcw,
  Ban,
  PackageCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AlertsBanner } from '../components/AlertsBanner';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { StoPendingMonitor } from '../components/StoPendingMonitor';
import { BlockCancelStoManagement } from '../components/BlockCancelStoManagement';
import { formatWeight } from '../utils/weightFormatter';
import { computeDisplayLocationNames } from '../utils/locationDisplayUtils';

export const DashboardPage: React.FC = () => {
  const {
    plans,
    vehicleStatusRecords,
    systemAlerts,
    planPendingRows,
    vehicleCallPendingPlans,
    vehicleGateInPendingRows,
    onloadingBakalRows,
    onloadingTolagaonRows,
    advanceVehicleCallRows,
    vehicleCallPendingBridgeRows,
    extraStoEvaluated,
    addExtraSto,
    deleteExtraSto,
    resetExtraStoData,
    locationChanges,
    addLocationChange,
    loadingMappings,
    addLoadingMapping,
    deleteLoadingMapping,
    setActiveTab,
    corePendingItems,
    partialPendingItems,
    blockedStos,
  } = useApp();

  type DashboardTab =
    | 'overview'
    | 'sto-pending'
    | 'block-cancel-sto'
    | 'plan-pending'
    | 'call-pending'
    | 'gate-in-pending'
    | 'onloading'
    | 'advance-calls'
    | 'extra-sto'
    | 'location-change'
    | 'loading-mapping';

  const [activeDashboardSection, setActiveDashboardSection] = useState<DashboardTab>('overview');

  // Compute sequence-based display numbering for locations (Base Name Occurrence Rule)
  // If only 1 occurrence -> base name only (e.g. "Thane").
  // If multiple occurrences -> base name with sequence suffix (e.g. "Thane 1", "Thane 2").
  const displayLocationsGateIn = useMemo(() => {
    return computeDisplayLocationNames(
      vehicleGateInPendingRows,
      (item) => item.row.statusRecord.location
    );
  }, [vehicleGateInPendingRows]);

  const displayLocationsBakal = useMemo(() => {
    return computeDisplayLocationNames(
      onloadingBakalRows,
      (item) => item.statusRecord.location
    );
  }, [onloadingBakalRows]);

  const displayLocationsTolagaon = useMemo(() => {
    return computeDisplayLocationNames(
      onloadingTolagaonRows,
      (item) => item.statusRecord.location
    );
  }, [onloadingTolagaonRows]);

  // Modal / Form states for Extra STO
  const [showAddExtraSto, setShowAddExtraSto] = useState(false);
  const [isResetExtraStoOpen, setIsResetExtraStoOpen] = useState(false);
  const [extraStoNum, setExtraStoNum] = useState('');
  const [extraStoLoc, setExtraStoLoc] = useState('');
  const [extraStoDate, setExtraStoDate] = useState('14-09-2026');
  const [extraStoRemarks, setExtraStoRemarks] = useState('');

  // Modal / Form states for Location Change
  const [showAddLocChange, setShowAddLocChange] = useState(false);
  const [origLoc, setOrigLoc] = useState('');
  const [revLoc, setRevLoc] = useState('');
  const [locChangeReason, setLocChangeReason] = useState('');
  const [locChangePlanId, setLocChangePlanId] = useState('');

  // Form states for Loading Mapping
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [mapSource, setMapSource] = useState('');
  const [mapTarget, setMapTarget] = useState('');

  const handleAddExtraStoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraStoNum) return;
    addExtraSto({
      stoNumber: extraStoNum.trim(),
      location: extraStoLoc.trim() || 'MAIN',
      date: extraStoDate.trim() || '14-09-2026',
      remarks: extraStoRemarks.trim(),
    });
    setExtraStoNum('');
    setExtraStoLoc('');
    setExtraStoRemarks('');
    setShowAddExtraSto(false);
  };

  const handleAddLocChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origLoc || !revLoc) return;
    addLocationChange({
      originalLoadingPoint: origLoc.trim(),
      revisedLoadingPoint: revLoc.trim(),
      reason: locChangeReason.trim() || 'Operational re-routing',
      relatedPlanId: locChangePlanId.trim() || undefined,
    });
    setOrigLoc('');
    setRevLoc('');
    setLocChangeReason('');
    setShowAddLocChange(false);
  };

  const handleAddMappingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSource || !mapTarget) return;
    addLoadingMapping({
      sourceString: mapSource.trim(),
      targetLoadingPoint: mapTarget.trim(),
    });
    setMapSource('');
    setMapTarget('');
    setShowAddMapping(false);
  };

  return (
    <div className="p-4 space-y-4 font-sans text-slate-800">
      {/* Centralized Business & Operational Alerts (Section 40) */}
      <AlertsBanner alerts={systemAlerts} />

      {/* Primary KPI Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
        {/* Total Plans */}
        <div
          onClick={() => setActiveTab('live-dispatch')}
          className="bg-white border border-slate-300 hover:border-blue-500 rounded p-2.5 shadow-xs cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
            <span>Live Plans</span>
            <Truck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-900">
            {plans.filter((p) => !p.isCancelled).length}
          </div>
          <span className="text-[10px] text-slate-500 truncate block">
            {plans.filter((p) => p.isCancelled).length} cancelled
          </span>
        </div>

        {/* Vehicle Calls */}
        <div
          onClick={() => setActiveTab('vehicle-status')}
          className="bg-white border border-slate-300 hover:border-blue-500 rounded p-2.5 shadow-xs cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
            <span>Vehicle Calls</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-900">
            {vehicleStatusRecords.length}
          </div>
          <span className="text-[10px] text-slate-500 truncate block">Status Records</span>
        </div>

        {/* Core STO Pending (Section 15) */}
        <div
          onClick={() => setActiveDashboardSection('sto-pending')}
          className={`border rounded p-2.5 shadow-xs cursor-pointer transition-all ${
            corePendingItems.length > 0
              ? 'bg-amber-50/70 border-amber-300 text-amber-950 hover:border-amber-400'
              : 'bg-white border-slate-300 hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
            <span className={corePendingItems.length > 0 ? 'text-amber-800' : 'text-slate-500'}>
              Core Pending
            </span>
            <Clock className={`w-3.5 h-3.5 ${corePendingItems.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-amber-900">
            {corePendingItems.length}
          </div>
          <span className="text-[10px] text-amber-700 truncate block">Vehicle Out Pending</span>
        </div>

        {/* Partial STO Pending (Section 16) */}
        <div
          onClick={() => setActiveDashboardSection('sto-pending')}
          className="bg-white border border-slate-300 hover:border-blue-500 rounded p-2.5 shadow-xs cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
            <span>Partial Pending</span>
            <Layers className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-purple-900">
            {partialPendingItems.length}
          </div>
          <span className="text-[10px] text-purple-700 truncate block">STO Incomplete</span>
        </div>

        {/* Plan Pending (Section 23) */}
        <div
          onClick={() => setActiveDashboardSection('plan-pending')}
          className={`border rounded p-2.5 shadow-xs cursor-pointer transition-all ${
            planPendingRows.length > 0
              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
              : 'bg-white border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
            <span className={planPendingRows.length > 0 ? 'text-amber-800' : 'text-slate-500'}>
              Plan Pending
            </span>
            <Clock className={`w-3.5 h-3.5 ${planPendingRows.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-amber-900">
            {planPendingRows.length}
          </div>
          <span className="text-[10px] text-amber-700 truncate block">No Plan Assigned</span>
        </div>

        {/* Vehicle Call Pending (Section 24) */}
        <div
          onClick={() => setActiveDashboardSection('call-pending')}
          className={`border rounded p-2.5 shadow-xs cursor-pointer transition-all ${
            vehicleCallPendingPlans.length > 0
              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
              : 'bg-white border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
            <span className={vehicleCallPendingPlans.length > 0 ? 'text-amber-800' : 'text-slate-500'}>
              Call Pending
            </span>
            <ArrowRightLeft className={`w-3.5 h-3.5 ${vehicleCallPendingPlans.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-amber-900">
            {vehicleCallPendingPlans.length}
          </div>
          <span className="text-[10px] text-amber-700 truncate block">Waiting vehicle</span>
        </div>

        {/* Gate In Pending (Section 25) */}
        <div
          onClick={() => setActiveDashboardSection('gate-in-pending')}
          className="bg-white border border-slate-300 hover:border-blue-500 rounded p-2.5 shadow-xs cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
            <span>Gate In Pending</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-900">
            {vehicleGateInPendingRows.length}
          </div>
          <span className="text-[10px] text-slate-500 truncate block">Awaiting arrival</span>
        </div>

        {/* Onloading Vehicles (Section 26) */}
        <div
          onClick={() => setActiveDashboardSection('onloading')}
          className="bg-white border border-slate-300 hover:border-blue-500 rounded p-2.5 shadow-xs cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
            <span>Onloading</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-900">
            {onloadingBakalRows.length + onloadingTolagaonRows.length}
          </div>
          <span className="text-[10px] text-blue-700 truncate block">
            Bakal: {onloadingBakalRows.length} | Tol: {onloadingTolagaonRows.length}
          </span>
        </div>

        {/* Blocked STOs */}
        <div
          onClick={() => setActiveDashboardSection('block-cancel-sto')}
          className={`border rounded p-2.5 shadow-xs cursor-pointer transition-all ${
            blockedStos.length > 0
              ? 'bg-rose-50/70 border-rose-300 text-rose-950 hover:border-rose-400'
              : 'bg-white border-slate-300 hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
            <span className={blockedStos.length > 0 ? 'text-rose-800' : 'text-slate-500'}>
              Blocked STOs
            </span>
            <Ban className={`w-3.5 h-3.5 ${blockedStos.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-rose-900">
            {blockedStos.length}
          </div>
          <span className="text-[10px] text-rose-700 truncate block">Excluded list</span>
        </div>
      </div>

      {/* Operational Monitors Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-300 bg-white p-1 rounded-t">
        {[
          { id: 'overview', label: 'Summary Overview' },
          { id: 'sto-pending', label: `STO Pending (${corePendingItems.length + partialPendingItems.length})` },
          { id: 'block-cancel-sto', label: `Block / Cancel STO (${blockedStos.length})` },
          { id: 'plan-pending', label: `Plan Pending (${planPendingRows.length})` },
          { id: 'call-pending', label: `Call Pending (${vehicleCallPendingPlans.length})` },
          { id: 'gate-in-pending', label: `Gate In Pending (${vehicleGateInPendingRows.length})` },
          { id: 'onloading', label: `Onloading Vehicles (${onloadingBakalRows.length + onloadingTolagaonRows.length})` },
          { id: 'advance-calls', label: 'Advance Calls & Bridge Monitor' },
          { id: 'extra-sto', label: `Extra STO Tracker (${extraStoEvaluated.length})` },
          { id: 'location-change', label: `Location Change Audit (${locationChanges.length})` },
          { id: 'loading-mapping', label: `Loading Mappings (${loadingMappings.length})` },
        ].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveDashboardSection(sec.id as DashboardTab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition-all ${
              activeDashboardSection === sec.id
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: OVERVIEW SUMMARY (Section 39: Vehicle Status Summary) */}
      {activeDashboardSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Summary by Loading Point */}
          <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Vehicle Status Summary by Loading Point (Section 39)
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Live Dispatches</span>
            </div>
            <div className="p-3 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="py-1.5 px-2">Loading Point</th>
                    <th className="py-1.5 px-2 text-center">Total Calls</th>
                    <th className="py-1.5 px-2 text-center">Plan Linked</th>
                    <th className="py-1.5 px-2 text-center">Arrived</th>
                    <th className="py-1.5 px-2 text-center">Onloading</th>
                    <th className="py-1.5 px-2 text-right">Total Ton</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {['TOLAGAON LOADING', 'BAKAL LOADING'].map((pt) => {
                    const records = vehicleStatusRecords.filter((vs) =>
                      vs.loadingPt.toLowerCase().includes(pt.toLowerCase().split(' ')[0])
                    );
                    const linked = records.filter((vs) =>
                      planPendingRows.every((pp) => pp.statusRecord.id !== vs.id)
                    );
                    const totalWeight = records.reduce((acc, vs) => acc + vs.weightMt, 0);

                    return (
                      <tr key={pt} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-bold text-slate-800">{pt}</td>
                        <td className="py-2 px-2 text-center font-mono">{records.length}</td>
                        <td className="py-2 px-2 text-center font-mono text-emerald-700 font-semibold">
                          {linked.length}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {linked.length}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-blue-700">
                          {pt.includes('TOLAGAON') ? onloadingTolagaonRows.length : onloadingBakalRows.length}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold">
                          {formatWeight(totalWeight)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Resolution Quick-Link Box */}
          <div className="bg-white border border-slate-300 rounded shadow-xs p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ArrowRightLeft className="w-4 h-4 text-blue-700" />
                <span>Reconciliation & Operational Bridge</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-amber-50/80 border border-amber-200 rounded p-3">
                  <span className="font-bold text-amber-950 block">Plan Pending Calls</span>
                  <span className="text-xl font-bold font-mono text-amber-900 mt-1 block">
                    {planPendingRows.length}
                  </span>
                  <span className="text-[11px] text-amber-800 mt-0.5 block">
                    Vehicles waiting for dispatch plans
                  </span>
                </div>
                <div className="bg-blue-50/80 border border-blue-200 rounded p-3">
                  <span className="font-bold text-blue-950 block">Vehicle Call Pending</span>
                  <span className="text-xl font-bold font-mono text-blue-900 mt-1 block">
                    {vehicleCallPendingPlans.length}
                  </span>
                  <span className="text-[11px] text-blue-800 mt-0.5 block">
                    Plans waiting for vehicle placement
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs text-slate-500">
                {planPendingRows.length} pending calls, {vehicleCallPendingPlans.length} pending plans
              </span>
              <button
                onClick={() => setActiveTab('bridge')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
              >
                <span>Open Reconciliation Bridge</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: STO PENDING MONITOR (Sections 14-23) */}
      {activeDashboardSection === 'sto-pending' && <StoPendingMonitor />}

      {/* SECTION: BLOCK / CANCEL STO MANAGEMENT */}
      {activeDashboardSection === 'block-cancel-sto' && <BlockCancelStoManagement />}

      {/* SECTION 2: PLAN PENDING (Section 23) */}
      {activeDashboardSection === 'plan-pending' && (
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                Plan Pending Monitor (Section 23)
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Vehicle Status records where no active Vehicle Plan relationship exists.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('bridge')}
              className="text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
            >
              <span>Reconcile via Bridge</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 text-[11px] uppercase">
                <tr className="divide-x divide-slate-200">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-3 w-28">Demanded Date</th>
                  <th className="py-2 px-3 w-28">Required Date</th>
                  <th className="py-2 px-3 w-36">Loading Pt.</th>
                  <th className="py-2 px-4 w-40">Location</th>
                  <th className="py-2 px-3 text-right w-24">Weight</th>
                  <th className="py-2 px-4">Internal ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {planPendingRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-emerald-700 font-medium">
                      All Vehicle Status calls have an authoritative Vehicle Plan assigned.
                    </td>
                  </tr>
                ) : (
                  planPendingRows.map((r, idx) => (
                    <tr key={r.statusRecord.id} className="hover:bg-amber-50/30 divide-x divide-slate-100">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium">{r.statusRecord.demandedDate}</td>
                      <td className="py-2 px-3 text-slate-600">{r.statusRecord.requiredDate}</td>
                      <td className="py-2 px-3">{r.statusRecord.loadingPt}</td>
                      <td className="py-2 px-4 font-semibold text-slate-900">{r.statusRecord.location}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {formatWeight(r.statusRecord.weightMt)}
                      </td>
                      <td className="py-2 px-4 font-mono text-[11px] text-slate-500">{r.statusRecord.id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: VEHICLE CALL PENDING (Section 24) */}
      {activeDashboardSection === 'call-pending' && (
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                Vehicle Call Pending Monitor (Section 24)
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Active Vehicle Planning plans with no active Vehicle Status owner linked.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('bridge')}
              className="text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
            >
              <span>Reconcile via Bridge</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 text-[11px] uppercase">
                <tr className="divide-x divide-slate-200">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-3 w-28">Date</th>
                  <th className="py-2 px-4 w-40">CFA</th>
                  <th className="py-2 px-4 w-40">Loading Point</th>
                  <th className="py-2 px-3 text-right w-24">Weight</th>
                  <th className="py-2 px-3 w-36">STOs</th>
                  <th className="py-2 px-4">Internal Plan ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vehicleCallPendingPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-emerald-700 font-medium">
                      All active plans are owned by an authoritative Vehicle Status record.
                    </td>
                  </tr>
                ) : (
                  vehicleCallPendingPlans.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-amber-50/30 divide-x divide-slate-100">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium">{p.date}</td>
                      <td className="py-2 px-4 font-semibold text-slate-900">{p.cfa}</td>
                      <td className="py-2 px-4 text-slate-700">{p.loading}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {formatWeight(p.weightMt)}
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-900">
                        {p.children.map((c) => c.sto).filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-2 px-4 font-mono text-[11px] text-slate-500">{p.id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: VEHICLE GATE IN PENDING (Section 25) */}
      {activeDashboardSection === 'gate-in-pending' && (
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Vehicle Gate In Pending (Section 25)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sorted by Required Date then Location. Delay calculated from today ({new Date().toISOString().slice(0, 10)}).
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              {vehicleGateInPendingRows.length} Vehicles Pending Gate In
            </span>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 text-[11px] uppercase">
                <tr className="divide-x divide-slate-200">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-3 w-28">Required Date</th>
                  <th className="py-2 px-4 w-40">Location</th>
                  <th className="py-2 px-3 w-32">Loading Pt.</th>
                  <th className="py-2 px-3 text-right w-24">Weight</th>
                  <th className="py-2 px-3 w-28 text-center">Delay Status</th>
                  <th className="py-2 px-4">Plan Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vehicleGateInPendingRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No vehicles currently pending gate-in.
                    </td>
                  </tr>
                ) : (
                  vehicleGateInPendingRows.map(({ row, delay }, idx) => (
                    <tr key={row.statusRecord.id} className="hover:bg-blue-50/40 divide-x divide-slate-100">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{row.statusRecord.requiredDate}</td>
                      <td className="py-2 px-4 font-semibold text-slate-800">
                        {displayLocationsGateIn[idx] || row.statusRecord.location}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.statusRecord.loadingPt}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatWeight(row.statusRecord.weightMt)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            delay.days > 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {delay.display}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-600 font-mono text-[11px]">
                        {row.matchedPlan ? (
                          <span className="text-emerald-800 font-semibold">{row.matchedPlan.cfa} ({row.matchedPlan.id})</span>
                        ) : (
                          <span className="text-amber-700 italic">No Plan Assigned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: ONLOADING VEHICLE (Section 26) */}
      {activeDashboardSection === 'onloading' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bakal Loading */}
          <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
            <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-blue-950 uppercase tracking-wide">
                Bakal Loading — Onloading ({onloadingBakalRows.length})
              </h3>
              <span className="text-[10px] bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
                Active Loading Bay
              </span>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-1.5 px-2">Location / Plan</th>
                    <th className="py-1.5 px-2">Gate Slip</th>
                    <th className="py-1.5 px-2">Vehicle No</th>
                    <th className="py-1.5 px-2 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {onloadingBakalRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        No vehicles onloading at Bakal currently.
                      </td>
                    </tr>
                  ) : (
                    onloadingBakalRows.map((r, idx) => (
                      <tr key={r.statusRecord.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-medium text-slate-800">
                          {displayLocationsBakal[idx] || r.statusRecord.location}
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-emerald-800">{r.gateSlip}</td>
                        <td className="py-2 px-2 font-mono font-bold text-slate-900">{r.vehicleNumber}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatWeight(r.statusRecord.weightMt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tolagaon Loading */}
          <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
            <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                Tolagaon Loading — Onloading ({onloadingTolagaonRows.length})
              </h3>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                Active Loading Bay
              </span>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-1.5 px-2">Location / Plan</th>
                    <th className="py-1.5 px-2">Gate Slip</th>
                    <th className="py-1.5 px-2">Vehicle No</th>
                    <th className="py-1.5 px-2 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {onloadingTolagaonRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        No vehicles onloading at Tolagaon currently.
                      </td>
                    </tr>
                  ) : (
                    onloadingTolagaonRows.map((r, idx) => (
                      <tr key={r.statusRecord.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-medium text-slate-800">
                          {displayLocationsTolagaon[idx] || r.statusRecord.location}
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-emerald-800">{r.gateSlip}</td>
                        <td className="py-2 px-2 font-mono font-bold text-slate-900">{r.vehicleNumber}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatWeight(r.statusRecord.weightMt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: ADVANCE VEHICLE CALL & VEHICLE CALL PENDING BRIDGE (Sections 27 & 28) */}
      {activeDashboardSection === 'advance-calls' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Section 27: Advance Vehicle Call */}
          <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Advance Vehicle Call (Section 27)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                History & monitoring table. Does NOT assign plans. Shows calls created prior to plan link.
              </p>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-1.5 px-2">Demanded</th>
                    <th className="py-1.5 px-2">Location</th>
                    <th className="py-1.5 px-2">Loading Pt.</th>
                    <th className="py-1.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advanceVehicleCallRows.map((item) => (
                    <tr key={item.vs.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium">{item.vs.demandedDate}</td>
                      <td className="py-2 px-2 font-semibold text-slate-900">{item.vs.location}</td>
                      <td className="py-2 px-2 text-slate-600">{item.vs.loadingPt}</td>
                      <td className="py-2 px-2 font-mono text-[11px]">
                        {item.isMatched ? (
                          <span className="text-emerald-700 font-semibold">Linked ({item.linkedPlanId})</span>
                        ) : (
                          <span className="text-amber-700">Advance Call (Pending Plan)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 28: Vehicle Call Pending Bridge */}
          <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Vehicle Call Pending Bridge (Section 28)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                History & monitoring table. Shows active plans before Vehicle Status linked.
              </p>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-1.5 px-2">Plan Date</th>
                    <th className="py-1.5 px-2">CFA</th>
                    <th className="py-1.5 px-2">Loading</th>
                    <th className="py-1.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleCallPendingBridgeRows.map((item) => (
                    <tr key={item.plan.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium">{item.plan.date}</td>
                      <td className="py-2 px-2 font-semibold text-slate-900">{item.plan.cfa}</td>
                      <td className="py-2 px-2 text-slate-600">{item.plan.loading}</td>
                      <td className="py-2 px-2 font-mono text-[11px]">
                        {item.isMatched ? (
                          <span className="text-emerald-700 font-semibold">Matched ({item.linkedVsId})</span>
                        ) : (
                          <span className="text-amber-700">Call Pending Bridge</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: EXTRA STO TRACKER (Section 38) */}
      {activeDashboardSection === 'extra-sto' && (
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Extra STO Tracker (Section 38)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tracks STOs that exist independently of standard planned dispatches. Live evaluated against Gate Records & Plans.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddExtraSto(!showAddExtraSto)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Extra STO</span>
              </button>
              <button
                onClick={() => setIsResetExtraStoOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors shadow-xs"
                title="Reset Extra STO Tracker"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>RESET</span>
              </button>
            </div>
          </div>

          {showAddExtraSto && (
            <form
              onSubmit={handleAddExtraStoSubmit}
              className="bg-blue-50/60 border border-blue-200 rounded p-3 text-xs space-y-2"
            >
              <div className="font-bold text-blue-950">Add Extra STO Record</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="STO Number (e.g. 4210089999)"
                  value={extraStoNum}
                  onChange={(e) => setExtraStoNum(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={extraStoLoc}
                  onChange={(e) => setExtraStoLoc(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Date (DD-MM-YYYY)"
                  value={extraStoDate}
                  onChange={(e) => setExtraStoDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Remarks / Reason"
                  value={extraStoRemarks}
                  onChange={(e) => setExtraStoRemarks(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExtraSto(false)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800"
                >
                  Save Extra STO
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr className="divide-x divide-slate-200">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-3 w-36">STO Number</th>
                  <th className="py-2 px-3 w-32">Location</th>
                  <th className="py-2 px-3 w-28">Date</th>
                  <th className="py-2 px-3 w-28">Gate Slip</th>
                  <th className="py-2 px-3 w-32">Vehicle No</th>
                  <th className="py-2 px-3 w-28">Gate Out</th>
                  <th className="py-2 px-3 w-32">Plan Status</th>
                  <th className="py-2 px-3">Remarks</th>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {extraStoEvaluated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      No Extra STO records logged.
                    </td>
                  </tr>
                ) : (
                  extraStoEvaluated.map((item, idx) => (
                    <tr key={item.record.id} className="hover:bg-blue-50/30 divide-x divide-slate-100">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900">
                        <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {item.record.stoNumber}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium">{item.record.location}</td>
                      <td className="py-2 px-3">{item.record.date}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{item.gateSlip}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{item.vehicleNumber}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{item.vehicleOut}</td>
                      <td className="py-2 px-3 font-mono">
                        {item.isPlanned ? (
                          <span className="text-emerald-700 font-semibold">Planned ({item.matchedPlanId})</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">Unplanned Extra</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.record.remarks || '—'}</td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => deleteExtraSto(item.record.id)}
                          className="p-1 text-rose-600 hover:text-rose-800 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Reset Extra STO Confirmation Modal */}
          <ConfirmationModal
            isOpen={isResetExtraStoOpen}
            title="Reset Extra STO Tracker?"
            message="Are you sure you want to clear all Extra STO Tracker records? Plans and other operational data will not be affected."
            confirmText="Reset"
            confirmVariant="danger"
            onConfirm={() => {
              resetExtraStoData();
              setIsResetExtraStoOpen(false);
            }}
            onCancel={() => setIsResetExtraStoOpen(false)}
          />
        </div>
      )}

      {/* SECTION 8: LOADING LOCATION CHANGE (Section 37) */}
      {activeDashboardSection === 'location-change' && (
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Loading Location Change Audit (Section 37)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dedicated tracking log for changes from one loading facility to another.
              </p>
            </div>
            <button
              onClick={() => setShowAddLocChange(!showAddLocChange)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Location Change</span>
            </button>
          </div>

          {showAddLocChange && (
            <form
              onSubmit={handleAddLocChangeSubmit}
              className="bg-blue-50/60 border border-blue-200 rounded p-3 text-xs space-y-2"
            >
              <div className="font-bold text-blue-950">Log Location Modification</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Original Loading Point"
                  value={origLoc}
                  onChange={(e) => setOrigLoc(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Revised Loading Point"
                  value={revLoc}
                  onChange={(e) => setRevLoc(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Reason for change"
                  value={locChangeReason}
                  onChange={(e) => setLocChangeReason(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Related Plan ID (optional)"
                  value={locChangePlanId}
                  onChange={(e) => setLocChangePlanId(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLocChange(false)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800"
                >
                  Save Log Entry
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr className="divide-x divide-slate-200">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-3 w-40">Original Point</th>
                  <th className="py-2 px-3 w-40">Revised Point</th>
                  <th className="py-2 px-4">Reason</th>
                  <th className="py-2 px-3 w-36">Related Plan</th>
                  <th className="py-2 px-3 w-36">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {locationChanges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No location changes logged.
                    </td>
                  </tr>
                ) : (
                  locationChanges.map((chg, idx) => (
                    <tr key={chg.id} className="hover:bg-blue-50/30 divide-x divide-slate-100">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-700 line-through">{chg.originalLoadingPoint}</td>
                      <td className="py-2 px-3 font-bold text-blue-900">{chg.revisedLoadingPoint}</td>
                      <td className="py-2 px-4 text-slate-700">{chg.reason}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{chg.relatedPlanId || '—'}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                        {new Date(chg.changedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 9: LOADING POINT MAPPING (Section 44) */}
      {activeDashboardSection === 'loading-mapping' && (
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Loading Point Mapping Table (Section 44)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dedicated reference table mapping raw user location strings to canonical loading points.
              </p>
            </div>
            <button
              onClick={() => setShowAddMapping(!showAddMapping)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reference Mapping</span>
            </button>
          </div>

          {showAddMapping && (
            <form
              onSubmit={handleAddMappingSubmit}
              className="bg-blue-50/60 border border-blue-200 rounded p-3 text-xs space-y-2"
            >
              <div className="font-bold text-blue-950">Add Canonical Loading Point Alias</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Source Location String (e.g. Tolagaon)"
                  value={mapSource}
                  onChange={(e) => setMapSource(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Target Canonical Loading Point (e.g. TOLAGAON LOADING)"
                  value={mapTarget}
                  onChange={(e) => setMapTarget(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMapping(false)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto max-w-2xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr className="divide-x divide-slate-200">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-4">Raw Source String</th>
                  <th className="py-2 px-4">Canonical Loading Point</th>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingMappings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No custom mappings defined.
                    </td>
                  </tr>
                ) : (
                  loadingMappings.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-blue-50/30 divide-x divide-slate-100">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 bg-slate-50">{idx + 1}</td>
                      <td className="py-2 px-4 font-mono font-medium text-slate-800">{m.sourceString}</td>
                      <td className="py-2 px-4 font-semibold text-blue-900">{m.targetLoadingPoint}</td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => deleteLoadingMapping(m.id)}
                          className="p-1 text-rose-600 hover:text-rose-800 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
