import React, { useState } from 'react';
import {
  LayoutDashboard,
  Truck,
  FileSpreadsheet,
  Link2,
  Database,
  UploadCloud,
  Layers,
  Calendar,
  Settings,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useApp, PageTab, SapSubTab } from '../context/AppContext';
import { ConfirmationModal } from './ConfirmationModal';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    sapSubTab,
    setSapSubTab,
    settings,
    updateSettings,
    systemAlerts,
    planPendingRows,
    vehicleCallPendingPlans,
    resetEntireApplication,
  } = useApp();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [showSapMenu, setShowSapMenu] = useState(false);

  // Temporary state for editing settings
  const [fy, setFy] = useState(settings.financialYear);
  const [period, setPeriod] = useState(settings.period);
  const [drStart, setDrStart] = useState(settings.dateRangeStart);
  const [drEnd, setDrEnd] = useState(settings.dateRangeEnd);

  const openSettingsModal = () => {
    setFy(settings.financialYear);
    setPeriod(settings.period);
    setDrStart(settings.dateRangeStart);
    setDrEnd(settings.dateRangeEnd);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    updateSettings({
      financialYear: fy,
      period: period,
      dateRangeStart: drStart,
      dateRangeEnd: drEnd,
    });
    setIsSettingsOpen(false);
  };

  const navItems: { id: PageTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: systemAlerts.length > 0 ? systemAlerts.length : undefined,
    },
    {
      id: 'live-dispatch',
      label: 'Live Dispatch Schedule',
      icon: Truck,
      badge: vehicleCallPendingPlans.length > 0 ? vehicleCallPendingPlans.length : undefined,
    },
    {
      id: 'vehicle-status',
      label: 'Vehicle Status Records',
      icon: FileSpreadsheet,
      badge: planPendingRows.length > 0 ? planPendingRows.length : undefined,
    },
    {
      id: 'bridge',
      label: 'Vehicle Status Bridge',
      icon: Link2,
    },
    {
      id: 'raipur',
      label: 'Raipur Database',
      icon: Database,
    },
    {
      id: 'excel-upload',
      label: 'Excel Upload',
      icon: UploadCloud,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-slate-100 shadow-md border-b border-slate-800 select-none">
      {/* Top Banner: Application Title, Editable Settings & Watermark */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/60">
        {/* Title and System Info */}
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs text-xs">
            VMS
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              STO & Vehicle Management System
            </h1>
          </div>
        </div>

        {/* Center: Active FY / Period / Date Range Settings Display */}
        <div
          onClick={openSettingsModal}
          title="Click to edit Financial Year, Period and Date Range"
          className="cursor-pointer group flex items-center gap-3 px-3 py-1 bg-slate-900 border border-slate-700/80 rounded hover:border-blue-500 transition-colors text-xs"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">FY: <strong className="text-white">{settings.financialYear}</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium">{settings.period}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-mono text-[11px]">{settings.dateRangeStart} to {settings.dateRangeEnd}</span>
          </div>
          <Settings className="w-3 h-3 text-slate-400 group-hover:text-blue-300 ml-1" />
        </div>

        {/* Right side: Watermark and Tools */}
        <div className="flex items-center gap-4">
          {/* Subtle Watermark on every page */}
          <div className="text-right">
            <span className="text-[11px] font-serif text-amber-200/90 tracking-wide select-none drop-shadow-xs">
              Manish Pandey
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Reset All Application Button */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            title="Permanently clear all data and reset the entire application"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 rounded transition-colors shadow-xs"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>RESET ALL APPLICATION</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-4 flex items-center justify-between overflow-x-auto">
        <nav className="flex items-center space-x-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setShowSapMenu(false);
                }}
                className={`relative px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-white bg-slate-800/60 font-semibold'
                    : 'border-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/30'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                      item.id === 'dashboard'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* SAP According Dropdown Menu (Section 44) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSapMenu(!showSapMenu);
                if (activeTab !== 'sap') {
                  setActiveTab('sap');
                }
              }}
              className={`relative px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'sap'
                  ? 'border-amber-500 text-white bg-slate-800/60 font-semibold'
                  : 'border-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/30'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>SAP According</span>
              <span className="text-[10px] text-amber-300 font-mono">({sapSubTab})</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSapMenu && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 animate-in fade-in duration-100">
                {(['dashboard', 'online', 'offline', 'raipur-local', 'export'] as SapSubTab[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setActiveTab('sap');
                      setSapSubTab(st);
                      setShowSapMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 capitalize ${
                      sapSubTab === st && activeTab === 'sap' ? 'text-amber-400 font-semibold bg-slate-800/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{st.replace('-', ' ')}</span>
                    {sapSubTab === st && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Quick Pending Counter badges */}
        <div className="flex items-center gap-3 text-xs text-slate-300 pl-4 py-1">
          <div
            onClick={() => setActiveTab('vehicle-status')}
            title="Vehicle Status rows without matched Plan"
            className="flex items-center gap-1 cursor-pointer hover:text-white"
          >
            <span className="text-[11px] text-slate-400">Plan Pending:</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono font-bold ${
              planPendingRows.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {planPendingRows.length}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('live-dispatch')}
            title="Active Plans without matched Vehicle Status"
            className="flex items-center gap-1 cursor-pointer hover:text-white"
          >
            <span className="text-[11px] text-slate-400">Call Pending:</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono font-bold ${
              vehicleCallPendingPlans.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {vehicleCallPendingPlans.length}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white text-slate-800 border border-slate-300 shadow-2xl rounded-md max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-blue-700" />
                <h3 className="font-semibold text-sm">System Parameters & Date Settings</h3>
              </div>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Financial Year</label>
                <input
                  type="text"
                  value={fy}
                  onChange={(e) => setFy(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Period</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g. Period 06 / September"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Range Start</label>
                  <input
                    type="text"
                    value={drStart}
                    onChange={(e) => setDrStart(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Range End</label>
                  <input
                    type="text"
                    value={drEnd}
                    onChange={(e) => setDrEnd(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Changes are saved to browser local storage and persisted across all pages and sessions.
              </p>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded hover:bg-blue-800"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset Entire Application?"
        message="This will permanently clear all application data, configuration, operational datasets, history, bridge data, Excel Gate data, filters/search state, column widths, and other persisted application state. No sample data will be restored. Are you sure you want to proceed?"
        confirmText="Reset All Application"
        confirmVariant="danger"
        onConfirm={() => {
          resetEntireApplication();
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </header>
  );
};
