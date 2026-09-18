export interface PlanChild {
  id: string; // STO child row id
  location: string; // Loc (e.g. MAIN, AQUA, Pune)
  sto: string; // e.g. 4210085492
  weight?: string; // Child row weight e.g. "01 Ton"
  weightMt?: number; // Normalized child MT
  weightKg?: number; // optional child weight breakdown
  isCompleted?: boolean;
  status?: string;
}

export interface VehiclePlan {
  id: string; // Stable internal ID e.g. PLAN-A001
  date: string; // e.g. "14-09-2026"
  loc: string; // Primary Loc / default
  plant: string; // Plant code / name e.g. "1001" or "Pune Plant"
  cfa: string; // CFA e.g. "Aurangabad"
  rawWeight: string; // e.g. "18 Ton" or "300 Kgs + 06 Ton"
  weightMt: number; // Normalized weight in Metric Tons
  loading: string; // e.g. "TOLAGAON LOADING"
  children: PlanChild[]; // Multiple locations / STOs
  isCancelled: boolean; // Cancelled plans become inactive
  createdAt: string;

  // Plan-level Enriched Gate Fields (Authoritative STO -> Gate Slip -> Vehicle In/No/Out)
  slipNumber?: string | null;
  vehicleIn?: string;
  vehicleNumber?: string;
  vehicleOut?: string;
  remarks?: string;
  slipConflict?: boolean;
  slipConflictSlips?: string[];
}

export interface VehicleStatusRecord {
  id: string; // Stable internal ID e.g. VS-A001
  demandedDate: string; // e.g. "14-09-2026"
  requiredDate: string; // e.g. "15-09-2026"
  loadingPt: string; // e.g. "Tolagaon"
  location: string; // e.g. "Aurangabad 1"
  rawWeight: string; // e.g. "18 Ton"
  weightMt: number; // Normalized MT
  createdAt: string;
}

export interface AuthoritativeRelationship {
  id: string; // e.g. REL-001
  vehicleStatusId: string; // VS-ID
  planId: string; // PLAN-ID
  source: 'NORMAL_MATCH' | 'BRIDGE_EXPLICIT';
  linkedAt: string;
  notes?: string;
}

export interface GateRecord {
  id: string;
  type: 'GATE_IN' | 'GATE_OUT';
  sto: string;
  gateSlip: string;
  vehicleNumber: string;
  vehicleInTime?: string;
  vehicleOutTime?: string;
  remarks?: string;
  uploadDate: string;
}

export interface LoadingPointMapping {
  id: string;
  sourceString: string; // e.g. "Tolagaon"
  targetLoadingPoint: string; // e.g. "TOLAGAON LOADING"
  notes?: string;
}

export interface LoadingLocationChange {
  id: string;
  originalLoadingPoint: string;
  revisedLoadingPoint: string;
  reason: string;
  relatedPlanId?: string;
  changedAt: string;
}

export interface ExtraStoRecord {
  id: string;
  stoNumber: string;
  location: string;
  date: string;
  remarks?: string;
  createdAt: string;
}

export interface RaipurRecord {
  id: string;
  date: string;
  cfa?: string;
  location: string;
  stoNumber: string;
  gateSlip?: string;
  vehicleNumber: string;
  weight: string;
  status?: string;
  remarks?: string;
}

export interface SapRecord {
  id: string;
  date: string;
  mode: 'ONLINE' | 'OFFLINE';
  docNumber: string;
  stoNumber: string;
  plant: string;
  material: string;
  quantity: number;
  uom: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'ERROR';
}

export interface AppSettings {
  financialYear: string;
  period: string;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface SystemAlert {
  id: string;
  type: 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  relatedPlanIds?: string[];
  relatedGateSlips?: string[];
  createdAt: string;
}

export interface Page2DerivedRow {
  statusRecord: VehicleStatusRecord;
  matchedPlan: VehiclePlan | null;
  relationshipSource: 'NORMAL_MATCH' | 'BRIDGE_EXPLICIT' | null;
  gateSlip: string;
  vehicleArrived: string; // e.g. Time or "Pending"
  vehicleNumber: string;
  vehicleDispatch: string; // Vehicle Out or "Pending"
  remarks: string;
}

export interface BridgeEntry {
  id: string;
  demandedDate: string;
  requiredDate: string;
  loadingPt: string;
  location: string;
  planDate: string;
  cfa: string;
  loading: string;
  status: 'READY' | 'ALREADY_LINKED' | 'NOT_FOUND' | 'MISMATCH' | 'APPLIED';
  resolvedVsId?: string;
  resolvedPlanId?: string;
  message?: string;
}

export interface FilterState {
  globalSearch: string;
  dateFilter: string;
  locationFilter: string;
  loadingFilter: string;
  cfaFilter: string;
  statusFilter: string;
  rowsPerPage: number;
  currentPage: number;
  columnFilters?: Record<string, string[]>;
}
