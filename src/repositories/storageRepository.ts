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
  FilterState,
} from '../types/models';
import { setInitialSequences } from '../utils/idGenerator';

const STORAGE_KEYS = {
  PLANS: 'vms_plans_v2',
  VEHICLE_STATUS: 'vms_vehicle_status_v2',
  RELATIONSHIPS: 'vms_relationships_v2',
  GATE_RECORDS: 'vms_gate_records_v2',
  LOADING_MAPPINGS: 'vms_loading_mappings_v2',
  LOCATION_CHANGES: 'vms_location_changes_v2',
  EXTRA_STO: 'vms_extra_sto_v2',
  RAIPUR: 'vms_raipur_v2',
  SAP: 'vms_sap_v2',
  SETTINGS: 'vms_settings_v2',
  FILTERS: 'vms_filters_v2',
  BRIDGE_ITEMS: 'vms_bridge_items_v2',
  BLOCKED_STOS: 'vms_blocked_stos_v2',
  COMPLETED_STOS: 'vms_completed_stos_v2',
};

export const DEFAULT_SETTINGS: AppSettings = {
  financialYear: '2026-2027',
  period: 'Period 06 / September',
  dateRangeStart: '01-09-2026',
  dateRangeEnd: '30-09-2026',
};

export const DEFAULT_LOADING_MAPPINGS: LoadingPointMapping[] = [
  { id: 'MAP-001', sourceString: 'Tolagaon', targetLoadingPoint: 'TOLAGAON LOADING' },
  { id: 'MAP-002', sourceString: 'Bakal', targetLoadingPoint: 'BAKAL LOADING' },
  { id: 'MAP-003', sourceString: 'Butibori', targetLoadingPoint: 'BUTIBORI LOADING' },
  { id: 'MAP-004', sourceString: 'Waluj', targetLoadingPoint: 'WALUJ LOADING' },
];

export const INITIAL_SEED_PLANS: VehiclePlan[] = [
  {
    id: 'PLAN-A001',
    date: '14-09-2026',
    loc: 'MAIN',
    plant: '1001',
    cfa: 'Aurangabad',
    rawWeight: '18 Ton',
    weightMt: 18,
    loading: 'TOLAGAON LOADING',
    children: [
      { id: 'CH-001', location: 'MAIN', sto: '4210085492' },
      { id: 'CH-002', location: 'MAIN', sto: '4210085493' },
    ],
    isCancelled: false,
    createdAt: '2026-09-14T08:00:00Z',
  },
  {
    id: 'PLAN-A002',
    date: '15-09-2026',
    loc: 'MAIN',
    plant: '1001',
    cfa: 'Aurangabad 1',
    rawWeight: '18 Ton',
    weightMt: 18,
    loading: 'TOLAGAON LOADING',
    children: [
      { id: 'CH-003', location: 'MAIN', sto: '4210085501' },
    ],
    isCancelled: false,
    createdAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'PLAN-A003',
    date: '15-09-2026',
    loc: 'MAIN',
    plant: '1001',
    cfa: 'Aurangabad 2',
    rawWeight: '18 Ton',
    weightMt: 18,
    loading: 'TOLAGAON LOADING',
    children: [
      { id: 'CH-004', location: 'MAIN', sto: '4210085502' },
    ],
    isCancelled: false,
    createdAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'PLAN-A004',
    date: '14-09-2026',
    loc: 'AQUA',
    plant: '1002',
    cfa: 'Pune',
    rawWeight: '300 Kgs + 06 Ton + 11 Ton',
    weightMt: 17.3,
    loading: 'BAKAL LOADING',
    children: [
      { id: 'CH-005', location: 'AQUA', sto: '4210085520' },
      { id: 'CH-006', location: 'PUNE', sto: '4210085521' },
    ],
    isCancelled: false,
    createdAt: '2026-09-14T09:30:00Z',
  },
  {
    id: 'PLAN-A005',
    date: '16-09-2026',
    loc: 'MAIN',
    plant: '1001',
    cfa: 'Nagpur',
    rawWeight: '24 Ton',
    weightMt: 24,
    loading: 'TOLAGAON LOADING',
    children: [
      { id: 'CH-007', location: 'MAIN', sto: '4210085600' },
    ],
    isCancelled: true, // Cancelled plan test
    createdAt: '2026-09-16T10:00:00Z',
  },
];

export const INITIAL_SEED_STATUS_RECORDS: VehicleStatusRecord[] = [
  {
    id: 'VS-A001',
    demandedDate: '14-09-2026',
    requiredDate: '15-09-2026',
    loadingPt: 'Tolagaon',
    location: 'Aurangabad 1',
    rawWeight: '18 Ton',
    weightMt: 18,
    createdAt: '2026-09-14T07:00:00Z',
  },
  {
    id: 'VS-A002',
    demandedDate: '14-09-2026',
    requiredDate: '15-09-2026',
    loadingPt: 'Tolagaon',
    location: 'Aurangabad 2',
    rawWeight: '18 Ton',
    weightMt: 18,
    createdAt: '2026-09-14T07:10:00Z',
  },
  {
    id: 'VS-A003',
    demandedDate: '14-09-2026',
    requiredDate: '16-09-2026',
    loadingPt: 'Tolagaon',
    location: 'Aurangabad 3',
    rawWeight: '18 Ton',
    weightMt: 18,
    createdAt: '2026-09-14T07:20:00Z',
  },
  {
    id: 'VS-A004',
    demandedDate: '14-09-2026',
    requiredDate: '14-09-2026',
    loadingPt: 'Tolagaon',
    location: 'Aurangabad',
    rawWeight: '18 Ton',
    weightMt: 18,
    createdAt: '2026-09-14T07:30:00Z',
  },
  {
    id: 'VS-A005',
    demandedDate: '14-09-2026',
    requiredDate: '14-09-2026',
    loadingPt: 'Bakal',
    location: 'Pune',
    rawWeight: '17.3 Ton',
    weightMt: 17.3,
    createdAt: '2026-09-14T07:45:00Z',
  },
  {
    id: 'VS-A006',
    demandedDate: '13-09-2026',
    requiredDate: '13-09-2026',
    loadingPt: 'Tolagaon',
    location: 'Nashik',
    rawWeight: '18 Ton',
    weightMt: 18,
    createdAt: '2026-09-13T09:00:00Z',
  },
];

export const INITIAL_SEED_GATE_RECORDS: GateRecord[] = [
  {
    id: 'GATE-001',
    type: 'GATE_IN',
    sto: '4210085492',
    gateSlip: '234513',
    vehicleNumber: 'MH-20-DE-1234',
    vehicleInTime: '14-09-2026 08:30',
    vehicleOutTime: '14-09-2026 12:45',
    remarks: 'Dispatched',
    uploadDate: '14-09-2026',
  },
  {
    id: 'GATE-002',
    type: 'GATE_IN',
    sto: '4210085520',
    gateSlip: '234515',
    vehicleNumber: 'MH-12-PQ-9988',
    vehicleInTime: '14-09-2026 10:15',
    remarks: 'Onloading',
    uploadDate: '14-09-2026',
  },
];

export const INITIAL_SEED_EXTRA_STO: ExtraStoRecord[] = [
  {
    id: 'EX-001',
    date: '14-09-2026',
    location: 'Aurangabad',
    stoNumber: '4210085493',
    remarks: 'Additional coil dispatch',
    createdAt: '2026-09-14T11:00:00Z',
  },
  {
    id: 'EX-002',
    date: '14-09-2026',
    location: 'Pune',
    stoNumber: '4210099999', // Extra unmerged
    remarks: 'Spot order',
    createdAt: '2026-09-14T11:30:00Z',
  },
];

export const INITIAL_SEED_RAIPUR: RaipurRecord[] = [
  {
    id: 'RAI-001',
    date: '14-09-2026',
    cfa: 'Raipur Local',
    location: 'Bhilai Yard',
    stoNumber: '4210077001',
    gateSlip: 'RP-9081',
    vehicleNumber: 'CG-04-A-5521',
    weight: '18 Ton',
    status: 'Delivered',
    remarks: 'Local transfer completed',
  },
  {
    id: 'RAI-002',
    date: '15-09-2026',
    cfa: 'Raipur Hub',
    location: 'Durg Depot',
    stoNumber: '4210077002',
    gateSlip: 'RP-9082',
    vehicleNumber: 'CG-07-M-3344',
    weight: '17.5 Ton',
    status: 'In Transit',
    remarks: 'Expected EOD',
  },
];

export const INITIAL_SEED_SAP: SapRecord[] = [
  {
    id: 'SAP-001',
    mode: 'ONLINE',
    docNumber: '800452199',
    stoNumber: '4210085492',
    date: '14-09-2026',
    plant: '1001',
    material: 'TMT BAR FE550D 12MM',
    quantity: 18,
    uom: 'TO',
    syncStatus: 'SYNCED',
  },
  {
    id: 'SAP-002',
    mode: 'OFFLINE',
    docNumber: '800452200',
    stoNumber: '4210085494',
    date: '14-09-2026',
    plant: '1002',
    material: 'WIRE ROD 8MM COIL',
    quantity: 17.3,
    uom: 'TO',
    syncStatus: 'PENDING',
  },
];

class StorageRepository {
  private get<T>(key: string, defaultVal: T): T {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return defaultVal;
    }
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultVal;
      return JSON.parse(data) as T;
    } catch {
      return defaultVal;
    }
  }

  private set<T>(key: string, val: T): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (err) {
      console.error('Failed to save to localStorage:', key, err);
    }
  }

  public init() {
    // Check if initial seed is required
    const isInitialized = this.get<boolean>('vms_initialized_v2', false);
    if (!isInitialized) {
      this.resetToSeedData();
      this.set('vms_initialized_v2', true);
    } else {
      // Sync ID sequences
      let maxPlan = 0;
      const plans = this.getPlans();
      plans.forEach((p) => {
        const num = parseInt(p.id.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxPlan) maxPlan = num;
      });

      let maxVs = 0;
      const vsRecords = this.getVehicleStatusRecords();
      vsRecords.forEach((v) => {
        const num = parseInt(v.id.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxVs) maxVs = num;
      });

      let maxRel = 0;
      const rels = this.getRelationships();
      rels.forEach((r) => {
        const num = parseInt(r.id.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxRel) maxRel = num;
      });

      setInitialSequences(maxPlan, maxVs, maxRel);
    }
  }

  public resetEntireApplication() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('vms_') || key.startsWith('vms-') || key.startsWith('table_width_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('vms_initialized_v2', 'true');
    }

    this.set(STORAGE_KEYS.PLANS, []);
    this.set(STORAGE_KEYS.VEHICLE_STATUS, []);
    this.set(STORAGE_KEYS.RELATIONSHIPS, []);
    this.set(STORAGE_KEYS.GATE_RECORDS, []);
    this.set(STORAGE_KEYS.LOADING_MAPPINGS, []);
    this.set(STORAGE_KEYS.LOCATION_CHANGES, []);
    this.set(STORAGE_KEYS.EXTRA_STO, []);
    this.set(STORAGE_KEYS.RAIPUR, []);
    this.set(STORAGE_KEYS.SAP, []);
    this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.set(STORAGE_KEYS.BRIDGE_ITEMS, []);
    this.set(STORAGE_KEYS.FILTERS, {});
    setInitialSequences(0, 0, 0);
  }

  public resetToSeedData() {
    this.set(STORAGE_KEYS.PLANS, INITIAL_SEED_PLANS);
    this.set(STORAGE_KEYS.VEHICLE_STATUS, INITIAL_SEED_STATUS_RECORDS);
    this.set(STORAGE_KEYS.RELATIONSHIPS, []); // Clean authoritative relationships
    this.set(STORAGE_KEYS.GATE_RECORDS, INITIAL_SEED_GATE_RECORDS);
    this.set(STORAGE_KEYS.LOADING_MAPPINGS, DEFAULT_LOADING_MAPPINGS);
    this.set(STORAGE_KEYS.LOCATION_CHANGES, []);
    this.set(STORAGE_KEYS.EXTRA_STO, INITIAL_SEED_EXTRA_STO);
    this.set(STORAGE_KEYS.RAIPUR, INITIAL_SEED_RAIPUR);
    this.set(STORAGE_KEYS.SAP, INITIAL_SEED_SAP);
    this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.set(STORAGE_KEYS.BRIDGE_ITEMS, []);
    setInitialSequences(10, 10, 10);
  }

  public getPlans(): VehiclePlan[] {
    return this.get<VehiclePlan[]>(STORAGE_KEYS.PLANS, []);
  }

  public savePlans(plans: VehiclePlan[]): void {
    this.set(STORAGE_KEYS.PLANS, plans);
  }

  public getVehicleStatusRecords(): VehicleStatusRecord[] {
    return this.get<VehicleStatusRecord[]>(STORAGE_KEYS.VEHICLE_STATUS, []);
  }

  public saveVehicleStatusRecords(records: VehicleStatusRecord[]): void {
    this.set(STORAGE_KEYS.VEHICLE_STATUS, records);
  }

  public getRelationships(): AuthoritativeRelationship[] {
    return this.get<AuthoritativeRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, []);
  }

  public saveRelationships(relationships: AuthoritativeRelationship[]): void {
    this.set(STORAGE_KEYS.RELATIONSHIPS, relationships);
  }

  public getGateRecords(): GateRecord[] {
    return this.get<GateRecord[]>(STORAGE_KEYS.GATE_RECORDS, []);
  }

  public saveGateRecords(records: GateRecord[]): void {
    this.set(STORAGE_KEYS.GATE_RECORDS, records);
  }

  public getLoadingMappings(): LoadingPointMapping[] {
    return this.get<LoadingPointMapping[]>(STORAGE_KEYS.LOADING_MAPPINGS, DEFAULT_LOADING_MAPPINGS);
  }

  public saveLoadingMappings(mappings: LoadingPointMapping[]): void {
    this.set(STORAGE_KEYS.LOADING_MAPPINGS, mappings);
  }

  public getLocationChanges(): LoadingLocationChange[] {
    return this.get<LoadingLocationChange[]>(STORAGE_KEYS.LOCATION_CHANGES, []);
  }

  public saveLocationChanges(changes: LoadingLocationChange[]): void {
    this.set(STORAGE_KEYS.LOCATION_CHANGES, changes);
  }

  public getExtraStoRecords(): ExtraStoRecord[] {
    return this.get<ExtraStoRecord[]>(STORAGE_KEYS.EXTRA_STO, []);
  }

  public saveExtraStoRecords(records: ExtraStoRecord[]): void {
    this.set(STORAGE_KEYS.EXTRA_STO, records);
  }

  public getRaipurRecords(): RaipurRecord[] {
    return this.get<RaipurRecord[]>(STORAGE_KEYS.RAIPUR, []);
  }

  public saveRaipurRecords(records: RaipurRecord[]): void {
    this.set(STORAGE_KEYS.RAIPUR, records);
  }

  public getSapRecords(): SapRecord[] {
    return this.get<SapRecord[]>(STORAGE_KEYS.SAP, []);
  }

  public saveSapRecords(records: SapRecord[]): void {
    this.set(STORAGE_KEYS.SAP, records);
  }

  public getSettings(): AppSettings {
    return this.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public saveSettings(settings: AppSettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  public getFilters(): Record<string, FilterState> {
    return this.get<Record<string, FilterState>>(STORAGE_KEYS.FILTERS, {});
  }

  public saveFilters(filters: Record<string, FilterState>): void {
    this.set(STORAGE_KEYS.FILTERS, filters);
  }

  public getBridgeItems(): any[] {
    return this.get<any[]>(STORAGE_KEYS.BRIDGE_ITEMS, []);
  }

  public saveBridgeItems(items: any[]): void {
    this.set(STORAGE_KEYS.BRIDGE_ITEMS, items);
  }

  public getBlockedStos(): string[] {
    return this.get<string[]>(STORAGE_KEYS.BLOCKED_STOS, []);
  }

  public saveBlockedStos(stos: string[]): void {
    this.set(STORAGE_KEYS.BLOCKED_STOS, stos);
  }

  public getCompletedStos(): string[] {
    return this.get<string[]>(STORAGE_KEYS.COMPLETED_STOS, []);
  }

  public saveCompletedStos(stos: string[]): void {
    this.set(STORAGE_KEYS.COMPLETED_STOS, stos);
  }
}

export const storageRepo = new StorageRepository();
