import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { LiveDispatchSchedulePage } from './pages/LiveDispatchSchedulePage';
import { VehicleStatusRecordsPage } from './pages/VehicleStatusRecordsPage';
import { VehicleStatusBridgePage } from './pages/VehicleStatusBridgePage';
import { RaipurDatabasePage } from './pages/RaipurDatabasePage';
import { ExcelUploadPage } from './pages/ExcelUploadPage';
import { SapAccordingPage } from './pages/SapAccordingPage';

const AppContent: React.FC = () => {
  const { activeTab, settings, relationships, plans, vehicleStatusRecords } = useApp();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Enterprise Sticky Header */}
      <Header />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'live-dispatch' && <LiveDispatchSchedulePage />}
        {activeTab === 'vehicle-status' && <VehicleStatusRecordsPage />}
        {activeTab === 'bridge' && <VehicleStatusBridgePage />}
        {activeTab === 'raipur' && <RaipurDatabasePage />}
        {activeTab === 'excel-upload' && <ExcelUploadPage />}
        {activeTab === 'sap' && <SapAccordingPage />}
      </main>

      {/* Enterprise Status Footer with Section 43 Watermark */}
      <footer className="bg-slate-900 border-t border-slate-800 py-2.5 px-4 text-xs text-slate-400 select-none">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">
              STO & Vehicle Management System
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] font-mono text-slate-400">
              Engine: Authoritative VS-ID ↔ PLAN-ID ({relationships.length} Active Links)
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-400">
              FY {settings.financialYear} ({settings.period})
            </span>
          </div>

          {/* Section 43: Subtle Watermark "Manish Pandey" on every page */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Authorized Logistics Control:</span>
            <span className="font-serif tracking-wide text-amber-300/80 font-medium select-none">
              Manish Pandey
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
