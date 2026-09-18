import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  VehiclePlan,
  VehicleStatusRecord,
  AuthoritativeRelationship,
  GateRecord,
  LoadingPointMapping,
  LoadingLocationChange,
  ExtraStoRecord,
  RaipurRecord,
  SapRecord,
  AppSettings,
  SystemAlert,
  Page2DerivedRow,
  BridgeEntry,
  FilterState,
} from '../types/models';
import { storageRepo, DEFAULT_SETTINGS } from '../repositories/storageRepository';
import { relationshipService } from '../services/relationshipService';
import { resolvePage2Data } from '../services/page2Resolver';
import { validateDuplicateGateSlips } from '../services/duplicateSlipValidator';
import { evaluateExtraStoRecords, ExtraStoEvaluatedRow } from '../services/extraStoService';
import { parseDispatchSchedulePaste, parseVehicleStatusPaste } from '../utils/excelParser';
import { normalizeDate, calculateDelay } from '../utils/dateUtils';
import { generatePlanId, generateVsId, generateUniqueId } from '../utils/idGenerator';
import { buildGateIndexes, enrichPlan, GateIndexes } from '../services/gateEnrichmentService';
import {
  computeStoPendingDatasets,
  StoPendingItem,
  parseAndValidateStoTokens,
  cleanStoNumber,
} from '../services/stoPendingService';

export type PageTab =
  | 'dashboard'
  | 'live-dispatch'
  | 'vehicle-status'
  | 'bridge'
  | 'raipur'
  | 'excel-upload'
  | 'sap';

export type SapSubTab = 'dashboard' | 'online' | 'offline' | 'raipur-local' | 'export';

interface AppContextType {
  activeTab: PageTab;
  setActiveTab: (tab: PageTab) => void;
  sapSubTab: SapSubTab;
  setSapSubTab: (subTab: SapSubTab) => void;

  plans: VehiclePlan[];
  vehicleStatusRecords: VehicleStatusRecord[];
  relationships: AuthoritativeRelationship[];
  gateRecords: GateRecord[];
  loadingMappings: LoadingPointMapping[];
  locationChanges: LoadingLocationChange[];
  extraStos: ExtraStoRecord[];
  raipurRecords: RaipurRecord[];
  sapRecords: SapRecord[];
  settings: AppSettings;
  bridgeEntries: BridgeEntry[];
  gateIndexes: GateIndexes;

  // Derived datasets
  page2DerivedRows: Page2DerivedRow[];
  systemAlerts: SystemAlert[];
  planPendingRows: Page2DerivedRow[];
  vehicleCallPendingPlans: VehiclePlan[];
  vehicleGateInPendingRows: { row: Page2DerivedRow; delay: { days: number; display: string } }[];
  onloadingBakalRows: Page2DerivedRow[];
  onloadingTolagaonRows: Page2DerivedRow[];
  advanceVehicleCallRows: { vs: VehicleStatusRecord; isMatched: boolean; linkedPlanId: string | null }[];
  vehicleCallPendingBridgeRows: { plan: VehiclePlan; isMatched: boolean; linkedVsId: string | null }[];
  extraStoEvaluated: ExtraStoEvaluatedRow[];
  blockedStos: string[];
  completedStos: string[];
  corePendingItems: StoPendingItem[];
  partialPendingItems: StoPendingItem[];

  // Filters (Persistent)
  filters: Record<string, FilterState>;
  getFilterState: (key: string) => FilterState;
  updateFilterState: (key: string, updates: Partial<FilterState>) => void;

  // Actions
  addPlan: (plan: Omit<VehiclePlan, 'id' | 'createdAt'>) => void;
  updatePlan: (id: string, updates: Partial<VehiclePlan>) => void;
  cancelPlan: (id: string) => void;
  deletePlan: (id: string) => void;

  addVehicleStatus: (record: Omit<VehicleStatusRecord, 'id' | 'createdAt'>) => void;
  updateVehicleStatus: (id: string, updates: Partial<VehicleStatusRecord>) => void;
  deleteVehicleStatus: (id: string) => void;

  pasteDispatchSchedule: (rawText: string, mode: 'APPEND' | 'REPLACE') => { plansCount: number; rawRowsCount: number };
  pasteVehicleStatus: (rawText: string, mode: 'APPEND' | 'REPLACE') => { recordsCount: number; rawRowsCount: number };

  // Bridge Operations
  parseAndSetBridgeEntries: (rawText: string, mode: 'APPEND' | 'REPLACE') => {
    rawRows: number;
    validRows: number;
    matched: number;
    alreadyLinked: number;
    notFound: number;
    mismatch: number;
  };
  applyBridgeEntries: () => { appliedCount: number; errors: string[] };
  clearBridgeEntries: () => void;
  linkExplicit: (vsId: string, planId: string, notes?: string) => { success: boolean; error?: string };
  unlinkRelationship: (relId: string) => void;

  // Gate Data
  appendGateRecords: (newRecords: GateRecord[]) => void;
  replaceGateRecords: (newRecords: GateRecord[]) => void;
  resetGateRecords: () => void;

  // Reference & Audit
  addLoadingMapping: (mapping: Omit<LoadingPointMapping, 'id'>) => void;
  deleteLoadingMapping: (id: string) => void;
  addLocationChange: (change: Omit<LoadingLocationChange, 'id' | 'changedAt'>) => void;

  // Independent Trackers
  addExtraSto: (record: Omit<ExtraStoRecord, 'id' | 'createdAt'>) => void;
  deleteExtraSto: (id: string) => void;

  addRaipurRecord: (record: Omit<RaipurRecord, 'id'>) => void;
  updateRaipurRecord: (id: string, updates: Partial<RaipurRecord>) => void;
  deleteRaipurRecord: (id: string) => void;

  addSapRecord: (record: Omit<SapRecord, 'id'>) => void;
  deleteSapRecord: (id: string) => void;

  updateSettings: (settings: Partial<AppSettings>) => void;
  resetEntireApplication: () => void;
  resetPlanningData: () => void;
  resetVehicleStatusData: () => void;
  resetRaipurData: () => void;
  resetVehicleStatusBridgeData: () => void;
  resetExtraStoData: () => void;
  resetToSeedData: () => void;

  // Block / Cancel STO Management
  addBlockedStos: (rawInput: string) => { addedCount: number; validStos: string[] };
  removeBlockedSto: (sto: string) => void;
  resetBlockedStos: () => void;

  // STO Fulfillment / Completion (Partial Pending)
  toggleCompletedSto: (sto: string) => void;
  markStoCompleted: (sto: string) => void;
  markStoIncomplete: (sto: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<PageTab>('dashboard');
  const [sapSubTab, setSapSubTab] = useState<SapSubTab>('dashboard');

  const [plans, setPlans] = useState<VehiclePlan[]>([]);
  const [vehicleStatusRecords, setVehicleStatusRecords] = useState<VehicleStatusRecord[]>([]);
  const [relationships, setRelationships] = useState<AuthoritativeRelationship[]>([]);
  const [gateRecords, setGateRecords] = useState<GateRecord[]>([]);
  const [loadingMappings, setLoadingMappings] = useState<LoadingPointMapping[]>([]);
  const [locationChanges, setLocationChanges] = useState<LoadingLocationChange[]>([]);
  const [extraStos, setExtraStos] = useState<ExtraStoRecord[]>([]);
  const [raipurRecords, setRaipurRecords] = useState<RaipurRecord[]>([]);
  const [sapRecords, setSapRecords] = useState<SapRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [bridgeEntries, setBridgeEntries] = useState<BridgeEntry[]>([]);
  const [filters, setFilters] = useState<Record<string, FilterState>>({});
  const [blockedStos, setBlockedStos] = useState<string[]>([]);
  const [completedStos, setCompletedStos] = useState<string[]>([]);

  // Initialize data on mount
  useEffect(() => {
    storageRepo.init();
    setPlans(storageRepo.getPlans());
    setVehicleStatusRecords(storageRepo.getVehicleStatusRecords());
    relationshipService.reload();
    setRelationships(relationshipService.getAll());
    setGateRecords(storageRepo.getGateRecords());
    setLoadingMappings(storageRepo.getLoadingMappings());
    setLocationChanges(storageRepo.getLocationChanges());
    setExtraStos(storageRepo.getExtraStoRecords());
    setRaipurRecords(storageRepo.getRaipurRecords());
    setSapRecords(storageRepo.getSapRecords());
    setSettings(storageRepo.getSettings());
    setFilters(storageRepo.getFilters());
    setBridgeEntries(storageRepo.getBridgeItems());
    setBlockedStos(storageRepo.getBlockedStos());
    setCompletedStos(storageRepo.getCompletedStos());
  }, []);

  const refreshRelationships = useCallback(() => {
    relationshipService.reload();
    setRelationships(relationshipService.getAll());
  }, []);

  // 1. Build canonical runtime Gate indexes (STO -> Slip, Slip -> Gate In/Out)
  const gateIndexes = useMemo(() => {
    return buildGateIndexes(gateRecords);
  }, [gateRecords]);

  // 2. Canonical plan enrichment: All plans receive plan-level gate fields
  const enrichedPlans = useMemo(() => {
    return plans.map((p) => enrichPlan(p, gateIndexes));
  }, [plans, gateIndexes]);

  // Compute Page 2 Derived Data using enrichedPlans
  const page2DerivedRows = useMemo(() => {
    return resolvePage2Data(vehicleStatusRecords, enrichedPlans, gateRecords, loadingMappings);
  }, [vehicleStatusRecords, enrichedPlans, gateRecords, loadingMappings, relationships]);

  // Compute System Alerts (Centralized for Dashboard)
  const systemAlerts = useMemo(() => {
    const alerts = validateDuplicateGateSlips(enrichedPlans, gateRecords);

    // Also check for empty STO or missing weights
    const emptyWeightCount = enrichedPlans.filter((p) => !p.isCancelled && p.weightMt <= 0).length;
    if (emptyWeightCount > 0) {
      alerts.push({
        id: 'ALERT-WEIGHT-ZERO',
        type: 'WARNING',
        title: 'MISSING PLAN WEIGHT',
        message: `${emptyWeightCount} active plan(s) have zero or unparsed weight values. Please verify raw weights.`,
        createdAt: new Date().toISOString(),
      });
    }

    return alerts;
  }, [enrichedPlans, gateRecords]);

  // Section 23: PLAN PENDING
  // A Vehicle Status source record exists, but no active Vehicle Plan relationship exists.
  const planPendingRows = useMemo(() => {
    return page2DerivedRows.filter((row) => row.matchedPlan === null);
  }, [page2DerivedRows]);

  // Section 24: VEHICLE CALL PENDING
  // An active Vehicle Planning plan exists, but no active Vehicle Status owner exists.
  const vehicleCallPendingPlans = useMemo(() => {
    const activePlans = enrichedPlans.filter((p) => !p.isCancelled);
    const linkedPlanIds = new Set(
      relationships.map((r) => r.planId)
    );
    return activePlans.filter((p) => !linkedPlanIds.has(p.id));
  }, [enrichedPlans, relationships]);

  // Section 25: VEHICLE GATE IN PENDING
  // Source: Vehicle Status Records
  // Condition: Vehicle Arrived = Pending
  // Sort: Required Date then Location
  // Delayed: today - Required Date
  const vehicleGateInPendingRows = useMemo(() => {
    const pendingArrival = page2DerivedRows.filter(
      (r) => r.vehicleArrived === 'Pending' || !r.vehicleArrived
    );

    const sorted = [...pendingArrival].sort((a, b) => {
      const dateA = normalizeDate(a.statusRecord.requiredDate);
      const dateB = normalizeDate(b.statusRecord.requiredDate);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.statusRecord.location.localeCompare(b.statusRecord.location);
    });

    return sorted.map((row) => ({
      row,
      delay: calculateDelay(row.statusRecord.requiredDate),
    }));
  }, [page2DerivedRows]);

  // Section 26: ONLOADING VEHICLE
  // Source: Vehicle Status Records
  // Condition: Remarks = Onloading
  // Two sections: Bakal Loading, Tolagaon Loading
  const onloadingBakalRows = useMemo(() => {
    return page2DerivedRows.filter((r) => {
      const isTolagaon = r.statusRecord.loadingPt.toLowerCase().includes('bakal') ||
        (r.matchedPlan?.loading || '').toLowerCase().includes('bakal');
      const isOnloading = r.remarks.toLowerCase().includes('onloading');
      return isTolagaon && isOnloading;
    });
  }, [page2DerivedRows]);

  const onloadingTolagaonRows = useMemo(() => {
    return page2DerivedRows.filter((r) => {
      const isTolagaon = r.statusRecord.loadingPt.toLowerCase().includes('tolagaon') ||
        (r.matchedPlan?.loading || '').toLowerCase().includes('tolagaon');
      const isOnloading = r.remarks.toLowerCase().includes('onloading');
      return isTolagaon && isOnloading;
    });
  }, [page2DerivedRows]);

  // Section 27: ADVANCE VEHICLE CALL
  // History / monitoring table. Does NOT assign plans.
  // Shows vehicle calls that were created before their corresponding plan relationship existed.
  const advanceVehicleCallRows = useMemo(() => {
    return vehicleStatusRecords.map((vs) => {
      const rel = relationships.find((r) => r.vehicleStatusId === vs.id);
      return {
        vs,
        isMatched: Boolean(rel),
        linkedPlanId: rel ? rel.planId : null,
      };
    });
  }, [vehicleStatusRecords, relationships]);

  // Section 28: VEHICLE CALL PENDING BRIDGE
  // History / monitoring table. Does NOT assign plans.
  const vehicleCallPendingBridgeRows = useMemo(() => {
    return plans.map((plan) => {
      const rel = relationships.find((r) => r.planId === plan.id);
      return {
        plan,
        isMatched: Boolean(rel),
        linkedVsId: rel ? rel.vehicleStatusId : null,
      };
    });
  }, [plans, relationships]);

  // Section 38: EXTRA STO TRACKER (Evaluated)
  const extraStoEvaluated = useMemo(() => {
    return evaluateExtraStoRecords(extraStos, plans, gateRecords);
  }, [extraStos, plans, gateRecords]);

  // STO PENDING MONITOR: Core Pending & Partial Pending (Sections 14-23)
  const { corePending: corePendingItems, partialPending: partialPendingItems } = useMemo(() => {
    return computeStoPendingDatasets(
      enrichedPlans,
      blockedStos,
      completedStos,
      gateRecords,
      extraStos
    );
  }, [enrichedPlans, blockedStos, completedStos, gateRecords, extraStos]);

  // Filter persistence (Section 41)
  const getFilterState = useCallback(
    (key: string): FilterState => {
      if (filters[key]) return filters[key];
      return {
        globalSearch: '',
        dateFilter: '',
        locationFilter: '',
        loadingFilter: '',
        cfaFilter: '',
        statusFilter: '',
        rowsPerPage: 25,
        currentPage: 1,
      };
    },
    [filters]
  );

  const updateFilterState = useCallback((key: string, updates: Partial<FilterState>) => {
    setFilters((prev) => {
      const current = prev[key] || {
        globalSearch: '',
        dateFilter: '',
        locationFilter: '',
        loadingFilter: '',
        cfaFilter: '',
        statusFilter: '',
        rowsPerPage: 25,
        currentPage: 1,
      };
      const updated = { ...prev, [key]: { ...current, ...updates } };
      storageRepo.saveFilters(updated);
      return updated;
    });
  }, []);

  // CRUD for Plans (Live Dispatch Schedule)
  const addPlan = useCallback(
    (planData: Omit<VehiclePlan, 'id' | 'createdAt'>) => {
      const newPlan: VehiclePlan = {
        ...planData,
        id: generatePlanId(),
        createdAt: new Date().toISOString(),
      };
      const updated = [newPlan, ...plans];
      setPlans(updated);
      storageRepo.savePlans(updated);
    },
    [plans]
  );

  const updatePlan = useCallback(
    (id: string, updates: Partial<VehiclePlan>) => {
      const updated = plans.map((p) => (p.id === id ? { ...p, ...updates } : p));
      setPlans(updated);
      storageRepo.savePlans(updated);
    },
    [plans]
  );

  // Section 21: CANCELLED PLAN
  const cancelPlan = useCallback(
    (id: string) => {
      const updated = plans.map((p) => (p.id === id ? { ...p, isCancelled: true } : p));
      setPlans(updated);
      storageRepo.savePlans(updated);
      // Clean relationship referencing cancelled plan
      relationshipService.cleanReferencesForDeleted(id);
      refreshRelationships();
    },
    [plans, refreshRelationships]
  );

  // Section 22: DELETE PLAN
  const deletePlan = useCallback(
    (id: string) => {
      const updated = plans.filter((p) => p.id !== id);
      setPlans(updated);
      storageRepo.savePlans(updated);
      relationshipService.cleanReferencesForDeleted(id);
      refreshRelationships();
    },
    [plans, refreshRelationships]
  );

  // CRUD for Vehicle Status Records
  const addVehicleStatus = useCallback(
    (recordData: Omit<VehicleStatusRecord, 'id' | 'createdAt'>) => {
      const newRecord: VehicleStatusRecord = {
        ...recordData,
        id: generateVsId(),
        createdAt: new Date().toISOString(),
      };
      const updated = [newRecord, ...vehicleStatusRecords];
      setVehicleStatusRecords(updated);
      storageRepo.saveVehicleStatusRecords(updated);
    },
    [vehicleStatusRecords]
  );

  const updateVehicleStatus = useCallback(
    (id: string, updates: Partial<VehicleStatusRecord>) => {
      const updated = vehicleStatusRecords.map((v) => (v.id === id ? { ...v, ...updates } : v));
      setVehicleStatusRecords(updated);
      storageRepo.saveVehicleStatusRecords(updated);
    },
    [vehicleStatusRecords]
  );

  // Section 22: DELETE VEHICLE STATUS
  const deleteVehicleStatus = useCallback(
    (id: string) => {
      const updated = vehicleStatusRecords.filter((v) => v.id !== id);
      setVehicleStatusRecords(updated);
      storageRepo.saveVehicleStatusRecords(updated);
      relationshipService.cleanReferencesForDeleted(id);
      refreshRelationships();
    },
    [vehicleStatusRecords, refreshRelationships]
  );

  // Paste Dispatch Schedule
  const pasteDispatchSchedule = useCallback(
    (rawText: string, mode: 'APPEND' | 'REPLACE') => {
      const current = mode === 'REPLACE' ? [] : plans;
      const { plans: parsedPlans, rawRowsCount } = parseDispatchSchedulePaste(rawText, current);
      const combined = mode === 'REPLACE' ? parsedPlans : [...parsedPlans, ...plans];
      setPlans(combined);
      storageRepo.savePlans(combined);
      return { plansCount: parsedPlans.length, rawRowsCount };
    },
    [plans]
  );

  // Paste Vehicle Status
  const pasteVehicleStatus = useCallback(
    (rawText: string, mode: 'APPEND' | 'REPLACE') => {
      const { records: parsedRecords, rawRowsCount } = parseVehicleStatusPaste(rawText);
      const combined = mode === 'REPLACE' ? parsedRecords : [...parsedRecords, ...vehicleStatusRecords];
      setVehicleStatusRecords(combined);
      storageRepo.saveVehicleStatusRecords(combined);
      return { recordsCount: parsedRecords.length, rawRowsCount };
    },
    [vehicleStatusRecords]
  );

  // Section 29 to 36: VEHICLE STATUS BRIDGE
  const parseAndSetBridgeEntries = useCallback(
    (rawText: string, mode: 'APPEND' | 'REPLACE') => {
      const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      let startIndex = 0;
      if (lines.length > 0) {
        const first = lines[0].toLowerCase();
        if (first.includes('demanded') || first.includes('loading') || first.includes('cfa') || first.includes('location')) {
          startIndex = 1;
        }
      }

      let rawRows = 0;
      let validRows = 0;
      let matched = 0;
      let alreadyLinked = 0;
      let notFound = 0;
      let mismatch = 0;

      const newEntries: BridgeEntry[] = [];
      const currentRelationships = relationshipService.getAll();
      const activePlans = plans.filter((p) => !p.isCancelled);

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        rawRows++;

        let delimiter = '\t';
        if (line.includes('\t')) delimiter = '\t';
        else if (line.includes('|')) delimiter = '|';
        else if (line.includes(',')) delimiter = ',';

        const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        let colOffset = 0;
        if (/^\d{1,4}$/.test(parts[0]) && parts.length > 6) {
          colOffset = 1;
        }

        // Expected input (Section 29):
        // Demanded Date | Required Date | Loading Pt. | Location | Date | CFA | Loading
        const demandedDate = normalizeDate(parts[colOffset] || '');
        const requiredDate = normalizeDate(parts[colOffset + 1] || demandedDate);
        const loadingPt = parts[colOffset + 2] || '';
        const location = parts[colOffset + 3] || '';
        const planDate = normalizeDate(parts[colOffset + 4] || demandedDate);
        const cfa = parts[colOffset + 5] || '';
        const loading = parts[colOffset + 6] || '';

        if (!demandedDate || !location || !cfa) {
          mismatch++;
          continue;
        }

        validRows++;

        // 1. Resolve VS-ID
        // In Bridge: Section 31 allows Base Location if explicitly supplied
        const matchedVs = vehicleStatusRecords.find((vs) => {
          const vsDate = normalizeDate(vs.demandedDate);
          const vsLoc = vs.location.trim().toUpperCase();
          const targetLoc = location.trim().toUpperCase();

          const dateMatch = vsDate === demandedDate;
          const locMatch =
            vsLoc === targetLoc ||
            vsLoc.startsWith(targetLoc) ||
            targetLoc.startsWith(vsLoc);

          return dateMatch && locMatch;
        });

        // 2. Resolve PLAN-ID
        // Section 30: Bridge allows Demand Date != Plan Date
        const matchedPlan = activePlans.find((p) => {
          const pDate = normalizeDate(p.date);
          const pCfa = p.cfa.trim().toUpperCase();
          const targetCfa = cfa.trim().toUpperCase();

          const dateMatch = pDate === planDate;
          const cfaMatch =
            pCfa === targetCfa ||
            pCfa.startsWith(targetCfa) ||
            targetCfa.startsWith(pCfa);

          return dateMatch && cfaMatch;
        });

        let status: BridgeEntry['status'] = 'READY';
        let message = 'Ready to link';

        if (!matchedVs || !matchedPlan) {
          status = 'NOT_FOUND';
          message = !matchedVs
            ? `Vehicle Status not found for ${demandedDate} / ${location}`
            : `Vehicle Plan not found for ${planDate} / ${cfa}`;
          notFound++;
        } else {
          // Check if already linked
          const isLinkedAlready = currentRelationships.some(
            (r) => r.vehicleStatusId === matchedVs.id && r.planId === matchedPlan.id
          );

          if (isLinkedAlready) {
            status = 'ALREADY_LINKED';
            message = 'Already Linked';
            alreadyLinked++;
          } else {
            // Check if VS or Plan already owned
            const vsOwned = currentRelationships.some((r) => r.vehicleStatusId === matchedVs.id);
            const planOwned = currentRelationships.some((r) => r.planId === matchedPlan.id);

            if (vsOwned || planOwned) {
              status = 'MISMATCH';
              message = vsOwned ? 'Vehicle Status already owns another Plan' : 'Plan already owned by another Vehicle Status';
              mismatch++;
            } else {
              matched++;
            }
          }
        }

        newEntries.push({
          id: generateUniqueId('BR'),
          demandedDate,
          requiredDate,
          loadingPt,
          location,
          planDate,
          cfa,
          loading,
          status,
          resolvedVsId: matchedVs?.id,
          resolvedPlanId: matchedPlan?.id,
          message,
        });
      }

      const combined = mode === 'REPLACE' ? newEntries : [...bridgeEntries, ...newEntries];
      setBridgeEntries(combined);
      storageRepo.saveBridgeItems(combined);

      return {
        rawRows,
        validRows,
        matched,
        alreadyLinked,
        notFound,
        mismatch,
      };
    },
    [vehicleStatusRecords, plans, bridgeEntries]
  );

  const applyBridgeEntries = useCallback(() => {
    let appliedCount = 0;
    const errors: string[] = [];

    const updated = bridgeEntries.map((entry) => {
      if (entry.status === 'READY' && entry.resolvedVsId && entry.resolvedPlanId) {
        const res = relationshipService.createRelationship(
          entry.resolvedVsId,
          entry.resolvedPlanId,
          'BRIDGE_EXPLICIT',
          plans,
          vehicleStatusRecords,
          'Vehicle Status Bridge Reconciliation'
        );

        if (res.success) {
          appliedCount++;
          return { ...entry, status: 'APPLIED' as const, message: 'Linked Successfully' };
        } else {
          errors.push(res.error || 'Failed to link');
          return { ...entry, status: 'MISMATCH' as const, message: res.error || 'Link error' };
        }
      }
      return entry;
    });

    setBridgeEntries(updated);
    storageRepo.saveBridgeItems(updated);
    refreshRelationships();

    return { appliedCount, errors };
  }, [bridgeEntries, plans, vehicleStatusRecords, refreshRelationships]);

  const clearBridgeEntries = useCallback(() => {
    setBridgeEntries([]);
    storageRepo.saveBridgeItems([]);
  }, []);

  const linkExplicit = useCallback(
    (vsId: string, planId: string, notes?: string) => {
      const res = relationshipService.createRelationship(
        vsId,
        planId,
        'BRIDGE_EXPLICIT',
        plans,
        vehicleStatusRecords,
        notes
      );
      if (res.success) {
        refreshRelationships();
      }
      return res;
    },
    [plans, vehicleStatusRecords, refreshRelationships]
  );

  const unlinkRelationship = useCallback(
    (relId: string) => {
      relationshipService.removeRelationship(relId);
      refreshRelationships();
    },
    [refreshRelationships]
  );

  // Gate Data operations (Excel Upload)
  const appendGateRecords = useCallback(
    (newRecords: GateRecord[]) => {
      const updated = [...gateRecords, ...newRecords];
      setGateRecords(updated);
      storageRepo.saveGateRecords(updated);
    },
    [gateRecords]
  );

  const replaceGateRecords = useCallback((newRecords: GateRecord[]) => {
    setGateRecords(newRecords);
    storageRepo.saveGateRecords(newRecords);
  }, []);

  const resetGateRecords = useCallback(() => {
    setGateRecords([]);
    storageRepo.saveGateRecords([]);
  }, []);

  // Reference & Audit
  const addLoadingMapping = useCallback(
    (m: Omit<LoadingPointMapping, 'id'>) => {
      const newM: LoadingPointMapping = { ...m, id: generateUniqueId('MAP') };
      const updated = [...loadingMappings, newM];
      setLoadingMappings(updated);
      storageRepo.saveLoadingMappings(updated);
    },
    [loadingMappings]
  );

  const deleteLoadingMapping = useCallback(
    (id: string) => {
      const updated = loadingMappings.filter((m) => m.id !== id);
      setLoadingMappings(updated);
      storageRepo.saveLoadingMappings(updated);
    },
    [loadingMappings]
  );

  const addLocationChange = useCallback(
    (change: Omit<LoadingLocationChange, 'id' | 'changedAt'>) => {
      const newChange: LoadingLocationChange = {
        ...change,
        id: generateUniqueId('LOC-CHG'),
        changedAt: new Date().toISOString(),
      };
      const updated = [newChange, ...locationChanges];
      setLocationChanges(updated);
      storageRepo.saveLocationChanges(updated);
    },
    [locationChanges]
  );

  // Independent Trackers
  const addExtraSto = useCallback(
    (rec: Omit<ExtraStoRecord, 'id' | 'createdAt'>) => {
      const newRec: ExtraStoRecord = {
        ...rec,
        id: generateUniqueId('EX'),
        createdAt: new Date().toISOString(),
      };
      const updated = [newRec, ...extraStos];
      setExtraStos(updated);
      storageRepo.saveExtraStoRecords(updated);
    },
    [extraStos]
  );

  const deleteExtraSto = useCallback(
    (id: string) => {
      const updated = extraStos.filter((e) => e.id !== id);
      setExtraStos(updated);
      storageRepo.saveExtraStoRecords(updated);
    },
    [extraStos]
  );

  const addRaipurRecord = useCallback(
    (rec: Omit<RaipurRecord, 'id'>) => {
      const newRec: RaipurRecord = { ...rec, id: generateUniqueId('RAI') };
      const updated = [newRec, ...raipurRecords];
      setRaipurRecords(updated);
      storageRepo.saveRaipurRecords(updated);
    },
    [raipurRecords]
  );

  const updateRaipurRecord = useCallback(
    (id: string, updates: Partial<RaipurRecord>) => {
      const updated = raipurRecords.map((r) => (r.id === id ? { ...r, ...updates } : r));
      setRaipurRecords(updated);
      storageRepo.saveRaipurRecords(updated);
    },
    [raipurRecords]
  );

  const deleteRaipurRecord = useCallback(
    (id: string) => {
      const updated = raipurRecords.filter((r) => r.id !== id);
      setRaipurRecords(updated);
      storageRepo.saveRaipurRecords(updated);
    },
    [raipurRecords]
  );

  const addSapRecord = useCallback(
    (rec: Omit<SapRecord, 'id'>) => {
      const newRec: SapRecord = { ...rec, id: generateUniqueId('SAP') };
      const updated = [newRec, ...sapRecords];
      setSapRecords(updated);
      storageRepo.saveSapRecords(updated);
    },
    [sapRecords]
  );

  const deleteSapRecord = useCallback(
    (id: string) => {
      const updated = sapRecords.filter((s) => s.id !== id);
      setSapRecords(updated);
      storageRepo.saveSapRecords(updated);
    },
    [sapRecords]
  );

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      storageRepo.saveSettings(updated);
      return updated;
    });
  }, []);

  const resetEntireApplication = useCallback(() => {
    storageRepo.resetEntireApplication();
    relationshipService.clearAll();
    setPlans([]);
    setVehicleStatusRecords([]);
    setRelationships([]);
    setGateRecords([]);
    setLoadingMappings([]);
    setLocationChanges([]);
    setExtraStos([]);
    setRaipurRecords([]);
    setSapRecords([]);
    setSettings(DEFAULT_SETTINGS);
    setBridgeEntries([]);
    setFilters({});
    setBlockedStos([]);
    setCompletedStos([]);
    storageRepo.saveBlockedStos([]);
    storageRepo.saveCompletedStos([]);
  }, []);

  const resetPlanningData = useCallback(() => {
    setPlans([]);
    storageRepo.savePlans([]);
    relationshipService.clearAll();
    setRelationships([]);
    storageRepo.saveRelationships([]);
    setFilters((prev) => {
      const updated = {
        ...prev,
        live_dispatch: {
          globalSearch: '',
          dateFilter: '',
          locationFilter: '',
          loadingFilter: '',
          cfaFilter: '',
          statusFilter: '',
          rowsPerPage: 25,
          currentPage: 1,
          columnFilters: {},
        },
      };
      storageRepo.saveFilters(updated);
      return updated;
    });
  }, []);

  const resetVehicleStatusData = useCallback(() => {
    setVehicleStatusRecords([]);
    storageRepo.saveVehicleStatusRecords([]);
    relationshipService.clearAll();
    setRelationships([]);
    storageRepo.saveRelationships([]);
    setFilters((prev) => {
      const updated = {
        ...prev,
        vehicle_status: {
          globalSearch: '',
          dateFilter: '',
          locationFilter: '',
          loadingFilter: '',
          cfaFilter: '',
          statusFilter: '',
          rowsPerPage: 25,
          currentPage: 1,
          columnFilters: {},
        },
      };
      storageRepo.saveFilters(updated);
      return updated;
    });
  }, []);

  const resetRaipurData = useCallback(() => {
    setRaipurRecords([]);
    storageRepo.saveRaipurRecords([]);
    setFilters((prev) => {
      const updated = {
        ...prev,
        raipur_database: {
          globalSearch: '',
          dateFilter: '',
          locationFilter: '',
          loadingFilter: '',
          cfaFilter: '',
          statusFilter: '',
          rowsPerPage: 25,
          currentPage: 1,
          columnFilters: {},
        },
      };
      storageRepo.saveFilters(updated);
      return updated;
    });
  }, []);

  const resetVehicleStatusBridgeData = useCallback(() => {
    setBridgeEntries([]);
    storageRepo.saveBridgeItems([]);
  }, []);

  const resetExtraStoData = useCallback(() => {
    setExtraStos([]);
    storageRepo.saveExtraStoRecords([]);
  }, []);

  // Block / Cancel STO Management
  const addBlockedStos = useCallback(
    (rawInput: string) => {
      const tokens = parseAndValidateStoTokens(rawInput);
      if (tokens.length === 0) return { addedCount: 0, validStos: [] };
      const currentSet = new Set<string>(blockedStos);
      const newlyAdded: string[] = [];
      for (const t of tokens) {
        if (!currentSet.has(t)) {
          currentSet.add(t);
          newlyAdded.push(t);
        }
      }
      const updated = Array.from(currentSet);
      setBlockedStos(updated);
      storageRepo.saveBlockedStos(updated);
      return { addedCount: newlyAdded.length, validStos: newlyAdded };
    },
    [blockedStos]
  );

  const removeBlockedSto = useCallback(
    (sto: string) => {
      const clean = cleanStoNumber(sto);
      const updated = blockedStos.filter((s) => s !== clean);
      setBlockedStos(updated);
      storageRepo.saveBlockedStos(updated);
    },
    [blockedStos]
  );

  const resetBlockedStos = useCallback(() => {
    setBlockedStos([]);
    storageRepo.saveBlockedStos([]);
  }, []);

  // STO Fulfillment / Completion (Partial Pending)
  const toggleCompletedSto = useCallback(
    (sto: string) => {
      const clean = cleanStoNumber(sto);
      if (!clean) return;
      const currentSet = new Set<string>(completedStos);
      if (currentSet.has(clean)) {
        currentSet.delete(clean);
      } else {
        currentSet.add(clean);
      }
      const updated = Array.from(currentSet);
      setCompletedStos(updated);
      storageRepo.saveCompletedStos(updated);
    },
    [completedStos]
  );

  const markStoCompleted = useCallback(
    (sto: string) => {
      const clean = cleanStoNumber(sto);
      if (!clean) return;
      if (!completedStos.includes(clean)) {
        const updated = [...completedStos, clean];
        setCompletedStos(updated);
        storageRepo.saveCompletedStos(updated);
      }
    },
    [completedStos]
  );

  const markStoIncomplete = useCallback(
    (sto: string) => {
      const clean = cleanStoNumber(sto);
      if (!clean) return;
      const updated = completedStos.filter((s) => s !== clean);
      setCompletedStos(updated);
      storageRepo.saveCompletedStos(updated);
    },
    [completedStos]
  );

  const resetToSeedData = useCallback(() => {
    storageRepo.resetToSeedData();
    relationshipService.clearAll();
    setPlans(storageRepo.getPlans());
    setVehicleStatusRecords(storageRepo.getVehicleStatusRecords());
    setRelationships([]);
    setGateRecords(storageRepo.getGateRecords());
    setLoadingMappings(storageRepo.getLoadingMappings());
    setLocationChanges([]);
    setExtraStos(storageRepo.getExtraStoRecords());
    setRaipurRecords(storageRepo.getRaipurRecords());
    setSapRecords(storageRepo.getSapRecords());
    setSettings(storageRepo.getSettings());
    setBridgeEntries([]);
  }, []);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      sapSubTab,
      setSapSubTab,
      plans: enrichedPlans,
      vehicleStatusRecords,
      relationships,
      gateRecords,
      gateIndexes,
      loadingMappings,
      locationChanges,
      extraStos,
      raipurRecords,
      sapRecords,
      settings,
      bridgeEntries,
      page2DerivedRows,
      systemAlerts,
      planPendingRows,
      vehicleCallPendingPlans,
      vehicleGateInPendingRows,
      onloadingBakalRows,
      onloadingTolagaonRows,
      advanceVehicleCallRows,
      vehicleCallPendingBridgeRows,
      extraStoEvaluated,
      blockedStos,
      completedStos,
      corePendingItems,
      partialPendingItems,
      filters,
      getFilterState,
      updateFilterState,
      addPlan,
      updatePlan,
      cancelPlan,
      deletePlan,
      addVehicleStatus,
      updateVehicleStatus,
      deleteVehicleStatus,
      pasteDispatchSchedule,
      pasteVehicleStatus,
      parseAndSetBridgeEntries,
      applyBridgeEntries,
      clearBridgeEntries,
      linkExplicit,
      unlinkRelationship,
      appendGateRecords,
      replaceGateRecords,
      resetGateRecords,
      addLoadingMapping,
      deleteLoadingMapping,
      addLocationChange,
      addExtraSto,
      deleteExtraSto,
      addRaipurRecord,
      updateRaipurRecord,
      deleteRaipurRecord,
      addSapRecord,
      deleteSapRecord,
      updateSettings,
      resetEntireApplication,
      resetPlanningData,
      resetVehicleStatusData,
      resetRaipurData,
      resetVehicleStatusBridgeData,
      resetExtraStoData,
      resetToSeedData,
      addBlockedStos,
      removeBlockedSto,
      resetBlockedStos,
      toggleCompletedSto,
      markStoCompleted,
      markStoIncomplete,
    }),
    [
      activeTab,
      sapSubTab,
      enrichedPlans,
      vehicleStatusRecords,
      relationships,
      gateRecords,
      gateIndexes,
      loadingMappings,
      locationChanges,
      extraStos,
      raipurRecords,
      sapRecords,
      settings,
      bridgeEntries,
      page2DerivedRows,
      systemAlerts,
      planPendingRows,
      vehicleCallPendingPlans,
      vehicleGateInPendingRows,
      onloadingBakalRows,
      onloadingTolagaonRows,
      advanceVehicleCallRows,
      vehicleCallPendingBridgeRows,
      extraStoEvaluated,
      blockedStos,
      completedStos,
      corePendingItems,
      partialPendingItems,
      filters,
      getFilterState,
      updateFilterState,
      addPlan,
      updatePlan,
      cancelPlan,
      deletePlan,
      addVehicleStatus,
      updateVehicleStatus,
      deleteVehicleStatus,
      pasteDispatchSchedule,
      pasteVehicleStatus,
      parseAndSetBridgeEntries,
      applyBridgeEntries,
      clearBridgeEntries,
      linkExplicit,
      unlinkRelationship,
      appendGateRecords,
      replaceGateRecords,
      resetGateRecords,
      addLoadingMapping,
      deleteLoadingMapping,
      addLocationChange,
      addExtraSto,
      deleteExtraSto,
      addRaipurRecord,
      updateRaipurRecord,
      deleteRaipurRecord,
      addSapRecord,
      deleteSapRecord,
      updateSettings,
      resetEntireApplication,
      resetPlanningData,
      resetVehicleStatusData,
      resetRaipurData,
      resetVehicleStatusBridgeData,
      resetExtraStoData,
      resetToSeedData,
      addBlockedStos,
      removeBlockedSto,
      resetBlockedStos,
      toggleCompletedSto,
      markStoCompleted,
      markStoIncomplete,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
