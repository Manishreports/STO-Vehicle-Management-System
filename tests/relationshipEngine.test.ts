import {
  generatePlanId,
  generateVsId,
  normalizePlanIdSequence,
} from '../src/utils/idGenerator';
import {
  isExactMatch,
  resolvePage2Data,
} from '../src/services/page2Resolver';
import { relationshipService } from '../src/services/relationshipService';
import {
  validateDuplicateGateSlips,
} from '../src/services/duplicateSlipValidator';
import { enrichPlanWithGateData } from '../src/services/gateEnrichmentService';
import { evaluateExtraStoRecords } from '../src/services/extraStoService';
import {
  VehiclePlan,
  VehicleStatusRecord,
  AuthoritativeRelationship,
  GateRecord,
  ExtraStoRecord,
} from '../src/types/models';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- RUNNING AUTOMATED ENGINE TEST SUITE ---\n');

// 1. ID Generator
console.log('1. Testing ID Generator...');
const id1 = generatePlanId(0);
const id2 = generatePlanId(1);
const id3 = generatePlanId(14);
assert(id1 === 'PLAN-0001', `ID 0 should be PLAN-0001, got ${id1}`);
assert(id2 === 'PLAN-0002', `ID 1 should be PLAN-0002, got ${id2}`);
assert(id3 === 'PLAN-0015', `ID 14 should be PLAN-0015, got ${id3}`);
assert(!id1.includes('NaN'), 'Plan ID must not contain NaN');

const vsId1 = generateVsId();
const vsId2 = generateVsId();
assert(vsId1.startsWith('VS-'), `VS ID must start with VS-, got ${vsId1}`);
assert(vsId1 !== vsId2, 'Subsequent VS IDs must be unique');

// 2. Normal Exact Match (Date + CFA + Loading ↔ Demanded Date + Location + Loading Pt.)
console.log('\n2. Testing Normal Exact Match...');
const planA: VehiclePlan = {
  id: 'PLAN-0001',
  date: '14-09-2026',
  loc: 'MAIN',
  plant: '1001',
  cfa: 'Aurangabad',
  loading: 'TOLAGAON LOADING',
  rawWeight: '18 Ton',
  weightMt: 18,
  children: [{ id: 'CH-1', sto: '4210085492', location: 'Aurangabad', weightKg: 18000 }],
  isCancelled: false,
  createdAt: '2026-09-14T10:00:00Z',
};

const vsA: VehicleStatusRecord = {
  id: 'VS-TEST-01',
  demandedDate: '14-09-2026',
  requiredDate: '14-09-2026',
  loadingPt: 'TOLAGAON LOADING',
  location: 'Aurangabad',
  rawWeight: '18 Ton',
  weightMt: 18,
  createdAt: '2026-09-14T10:00:00Z',
};

const vsMismatchDate: VehicleStatusRecord = {
  ...vsA,
  id: 'VS-TEST-02',
  demandedDate: '15-09-2026',
};

const vsMismatchLoc: VehicleStatusRecord = {
  ...vsA,
  id: 'VS-TEST-03',
  location: 'Nagpur',
};

const vsAliasLoading: VehicleStatusRecord = {
  ...vsA,
  id: 'VS-TEST-04',
  loadingPt: 'Tolagaon', // Alias
};

assert(
  isExactMatch(vsA, planA, []),
  'Exact match with identical date, location, loading pt must return true'
);
assert(
  !isExactMatch(vsMismatchDate, planA, []),
  'Mismatch date must not match in Normal Exact Match'
);
assert(
  !isExactMatch(vsMismatchLoc, planA, []),
  'Mismatch location must not match in Normal Exact Match'
);
assert(
  isExactMatch(vsAliasLoading, planA, [
    { id: '1', sourceString: 'Tolagaon', targetLoadingPoint: 'TOLAGAON LOADING' },
  ]),
  'Loading point alias via mapping table must match correctly'
);

// 3. Authoritative Relationship Service (VS-ID ↔ PLAN-ID)
console.log('\n3. Testing Authoritative Relationship Management & Invariants...');
relationshipService.clearAll();

const planB: VehiclePlan = {
  ...planA,
  id: 'PLAN-0002',
  cfa: 'Pune',
  loading: 'BAKAL LOADING',
  children: [{ id: 'CH-2', sto: '4210099999', location: 'Pune', weightKg: 18000 }],
};
const vsB: VehicleStatusRecord = {
  ...vsA,
  id: 'VS-TEST-02',
  location: 'Pune',
  loadingPt: 'BAKAL LOADING',
};
const testPlans = [planA, planB];
const testVs = [vsA, vsB];

// Establish 1st link: vsA -> planA
const res1 = relationshipService.createRelationship(vsA.id, planA.id, 'NORMAL_MATCH', testPlans, testVs);
assert(res1.success, 'Creating 1st link should succeed');
assert(relationshipService.getAll().length === 1, 'Relationships count should be 1');

// Verify lookup helpers
const lookedUpVs = relationshipService.getForVehicleStatus(vsA.id);
assert(lookedUpVs?.planId === planA.id, 'Lookup for VS should return planA');
const lookedUpPlan = relationshipService.getForPlan(planA.id);
assert(lookedUpPlan?.vehicleStatusId === vsA.id, 'Lookup for Plan should return vsA');

// 3.1 Test: VS already linked -> second Plan assignment blocked
// (Attempting vsA -> planB must fail and NOT silently release planA)
const resVsBlocked = relationshipService.createRelationship(vsA.id, planB.id, 'BRIDGE_EXPLICIT', testPlans, testVs);
assert(
  !resVsBlocked.success,
  'Re-linking an already-linked VS to another PLAN must be rejected unless the original relationship has first been explicitly released.'
);
assert(
  resVsBlocked.reason === 'VS_ALREADY_HAS_PLAN',
  'Failure reason must be VS_ALREADY_HAS_PLAN'
);
assert(
  resVsBlocked.error?.includes('VEHICLE STATUS ALREADY LINKED') || false,
  'Error message must indicate VEHICLE STATUS ALREADY LINKED'
);
// Confirm planA is still the active linked plan for vsA (no silent release)
assert(
  relationshipService.getForVehicleStatus(vsA.id)?.planId === planA.id,
  'Plan for vsA must remain planA after blocked re-link attempt'
);

// 3.2 Test: Plan already linked -> second VS assignment blocked
// (Attempting vsB -> planA must fail because planA is already owned by vsA)
const resPlanBlocked = relationshipService.createRelationship(vsB.id, planA.id, 'BRIDGE_EXPLICIT', testPlans, testVs);
assert(
  !resPlanBlocked.success,
  'Linking a second VS to an already-owned PLAN must be rejected'
);
assert(
  resPlanBlocked.reason === 'PLAN_ALREADY_OWNED',
  'Failure reason must be PLAN_ALREADY_OWNED'
);
assert(
  resPlanBlocked.error?.includes('PLAN ALREADY LINKED') || false,
  'Error message must indicate PLAN ALREADY LINKED'
);
// Confirm vsA is still the sole owner of planA
assert(
  relationshipService.getForPlan(planA.id)?.vehicleStatusId === vsA.id,
  'Owner for planA must remain vsA after blocked assignment attempt'
);

// 3.3 Test: Explicit unlink -> new relationship can then be created
// Explicitly remove relationship for vsA
relationshipService.removeRelationship(vsA.id);
assert(relationshipService.getAll().length === 0, 'Relationship table should be empty after explicit removal');
assert(!relationshipService.getForVehicleStatus(vsA.id), 'vsA must have no active relationship after removal');
assert(!relationshipService.getForPlan(planA.id), 'planA must have no active relationship after removal');

// Now re-linking vsA to planB succeeds after explicit release
const resAfterUnlink = relationshipService.createRelationship(vsA.id, planB.id, 'BRIDGE_EXPLICIT', testPlans, testVs);
assert(
  resAfterUnlink.success,
  'Explicit unlink -> new relationship can then be created'
);
assert(
  relationshipService.getForVehicleStatus(vsA.id)?.planId === planB.id,
  'Active plan for vsA must now be planB'
);

// 3.4 Test: Normal exact match never silently overrides an existing relationship
// vsA has exact match attributes with planA (demandedDate, location=Aurangabad, loadingPt=TOLAGAON LOADING)
// But vsA is currently authoritatively linked to planB.
// When resolvePage2Data is executed, it must honor the authoritative relationship (planB) and never overwrite with planA.
const gateRecordsForEngine: GateRecord[] = [
  {
    id: 'G1',
    type: 'GATE_IN',
    sto: '4210085492', // STO of planA
    gateSlip: 'GS-7788',
    vehicleNumber: 'MH-20-DE-1234',
    vehicleInTime: '10:30',
    uploadDate: '2026-09-14',
  },
  {
    id: 'G2',
    type: 'GATE_IN',
    sto: '4210099999', // STO of planB
    gateSlip: 'GS-8899',
    vehicleNumber: 'MH-12-PQ-9999',
    vehicleInTime: '11:15',
    uploadDate: '2026-09-14',
  },
];

const derivedBeforeExact = resolvePage2Data([vsA], [planA, planB], gateRecordsForEngine, []);
assert(
  derivedBeforeExact[0].matchedPlan?.id === planB.id,
  'Normal exact match never silently overrides an existing relationship (must remain planB)'
);
assert(
  derivedBeforeExact[0].relationshipSource === 'BRIDGE_EXPLICIT',
  'Derived row must retain BRIDGE_EXPLICIT source'
);

// Also verify an explicit NORMAL_MATCH call cannot overwrite an existing link
const resNormalAttempt = relationshipService.createRelationship(vsA.id, planA.id, 'NORMAL_MATCH', testPlans, testVs);
assert(
  !resNormalAttempt.success,
  'Normal exact match attempt on already-linked VS must be rejected'
);

// 3.5 Test: Vehicle Status Bridge never silently overrides an existing relationship
// Attempting to link vsA to planA via Bridge without prior unlink must fail
const resBridgeAttempt = relationshipService.createRelationship(vsA.id, planA.id, 'BRIDGE_EXPLICIT', testPlans, testVs, 'Bridge overwrite attempt');
assert(
  !resBridgeAttempt.success,
  'Vehicle Status Bridge never silently overrides an existing relationship'
);
assert(
  relationshipService.getForVehicleStatus(vsA.id)?.planId === planB.id,
  'vsA link must remain planB after failed Bridge overwrite attempt'
);

// 3.6 Test: Gate Slip/derived Page 2 data continue using the existing authoritative relationship only
// Because vsA is linked to planB (which contains STO 4210099999), it must derive planB\'s gate slip GS-8899 and MH-12-PQ-9999, NOT planA\'s GS-7788
const derivedAuthCheck = resolvePage2Data([vsA], [planA, planB], gateRecordsForEngine, []);
assert(
  derivedAuthCheck[0].gateSlip === 'GS-8899',
  `Derived row must use gate slip from authoritative linked planB (GS-8899), got ${derivedAuthCheck[0].gateSlip}`
);
assert(
  derivedAuthCheck[0].vehicleNumber === 'MH-12-PQ-9999',
  `Derived row must use vehicle number from authoritative linked planB (MH-12-PQ-9999), got ${derivedAuthCheck[0].vehicleNumber}`
);

// Clean up relationships for remaining tests
relationshipService.clearAll();

// 4. Duplicate Gate Slip Validator
console.log('\n4. Testing Duplicate Gate Slip & Anomaly Validation...');
const gateRecords: GateRecord[] = [
  {
    id: 'G1',
    type: 'GATE_IN',
    sto: '4210085492',
    gateSlip: 'GS-7788',
    vehicleNumber: 'MH-20-DE-1234',
    vehicleInTime: '10:30',
    uploadDate: '2026-09-14',
  },
  {
    id: 'G2',
    type: 'GATE_IN',
    sto: '4210099999',
    gateSlip: 'GS-7788', // DUPLICATE SLIP
    vehicleNumber: 'MH-12-AB-9999',
    vehicleInTime: '11:00',
    uploadDate: '2026-09-14',
  },
];

const plansForValidation: VehiclePlan[] = [
  planA,
  {
    ...planB,
    children: [{ id: 'CH-2', sto: '4210099999', location: 'Pune', weightKg: 18000 }],
  },
];

const duplicateAlerts = validateDuplicateGateSlips(plansForValidation, gateRecords);
assert(
  duplicateAlerts.length > 0,
  'Duplicate slip across two distinct plans must raise a SYSTEM_ALERT'
);
assert(
  duplicateAlerts[0].title.includes('DUPLICATE GATE SLIP'),
  'Alert title must specify DUPLICATE GATE SLIP'
);

// 5. Gate Enrichment Service
console.log('\n5. Testing Gate Enrichment Service...');
const enriched = enrichPlanWithGateData(planA, gateRecords);
assert(
  enriched.gateSlip === 'GS-7788',
  `Gate slip should be GS-7788, got ${enriched.gateSlip}`
);
assert(
  enriched.vehicleNumber === 'MH-20-DE-1234',
  `Vehicle number should be MH-20-DE-1234, got ${enriched.vehicleNumber}`
);
assert(
  enriched.vehicleIn === '10:30',
  `Vehicle in time should be 10:30, got ${enriched.vehicleIn}`
);

// 6. Extra STO Service
console.log('\n6. Testing Extra STO Tracker...');
const extraStos: ExtraStoRecord[] = [
  {
    id: 'EX-01',
    stoNumber: '4210085492', // present in planA
    location: 'Aurangabad',
    date: '14-09-2026',
    remarks: 'Merged test',
    createdAt: '2026-09-14T10:00:00Z',
  },
  {
    id: 'EX-02',
    stoNumber: '9999999999', // not in any plan
    location: 'Pune',
    date: '14-09-2026',
    remarks: 'Unmerged extra',
    createdAt: '2026-09-14T10:00:00Z',
  },
];

const evaluatedExtra = evaluateExtraStoRecords(extraStos, [planA], gateRecords);
assert(evaluatedExtra.length === 2, 'Should evaluate 2 extra STOs');
assert(
  evaluatedExtra[0].isPlanned === true,
  'First extra STO is present in planA and should have isPlanned=true'
);
assert(
  evaluatedExtra[1].isPlanned === false,
  'Second extra STO is not present in any plan and should have isPlanned=false'
);

// 7. Page 2 Derived Rows Generation
console.log('\n7. Testing Page 2 Derived Rows Generation...');

const derived = resolvePage2Data(
  [vsA],
  [planA],
  gateRecords,
  []
);

assert(derived.length === 1, 'Derived rows count must match vehicle status count');
assert(
  derived[0].matchedPlan?.id === planA.id,
  'Derived row must link to planA'
);
assert(
  derived[0].gateSlip === 'GS-7788',
  'Derived row must show gateSlip GS-7788'
);
assert(
  derived[0].vehicleNumber === 'MH-20-DE-1234',
  'Derived row must show vehicle number MH-20-DE-1234'
);

console.log('\n==================================================');
console.log('ALL TESTS PASSED SUCCESSFULLY (7/7 suites)');
console.log('==================================================\n');
