import { AuthoritativeRelationship, VehiclePlan, VehicleStatusRecord } from '../types/models';
import { generateRelId } from '../utils/idGenerator';
import { storageRepo } from '../repositories/storageRepository';

export interface LinkResult {
  success: boolean;
  relationship?: AuthoritativeRelationship;
  error?: string;
  reason?: 'ALREADY_LINKED' | 'VS_ALREADY_HAS_PLAN' | 'PLAN_ALREADY_OWNED' | 'PLAN_CANCELLED' | 'NOT_FOUND';
}

class RelationshipService {
  private relationships: AuthoritativeRelationship[] = [];

  constructor() {
    this.reload();
  }

  public reload(): void {
    this.relationships = storageRepo.getRelationships();
  }

  public getAll(): AuthoritativeRelationship[] {
    return [...this.relationships];
  }

  /**
   * Check if a relationship exists for a given Vehicle Status ID
   */
  public getForVehicleStatus(vsId: string): AuthoritativeRelationship | undefined {
    return this.relationships.find((r) => r.vehicleStatusId === vsId);
  }

  /**
   * Check if a relationship exists for a given Plan ID
   */
  public getForPlan(planId: string): AuthoritativeRelationship | undefined {
    return this.relationships.find((r) => r.planId === planId);
  }

  /**
   * Authoritative link creation.
   * Enforces: ONE ACTIVE PLAN = ONE ACTIVE VEHICLE STATUS OWNER.
   */
  public createRelationship(
    vsId: string,
    planId: string,
    source: 'NORMAL_MATCH' | 'BRIDGE_EXPLICIT',
    plans: VehiclePlan[],
    vehicleStatusRecords: VehicleStatusRecord[],
    notes?: string
  ): LinkResult {
    // 1. Verify existence
    const vs = vehicleStatusRecords.find((v) => v.id === vsId);
    if (!vs) {
      return { success: false, error: `Vehicle Status ID ${vsId} not found`, reason: 'NOT_FOUND' };
    }

    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, error: `Vehicle Plan ID ${planId} not found`, reason: 'NOT_FOUND' };
    }

    // 2. Verify Plan is not cancelled
    if (plan.isCancelled) {
      return { success: false, error: `Cannot link cancelled Plan ${planId}`, reason: 'PLAN_CANCELLED' };
    }

    // 3. Duplicate check: Already linked together
    const existingSame = this.relationships.find(
      (r) => r.vehicleStatusId === vsId && r.planId === planId
    );
    if (existingSame) {
      return { success: true, relationship: existingSame, reason: 'ALREADY_LINKED' };
    }

    // 4. STRICT 1-TO-1 INVARIANT: VS ownership check
    // An active Vehicle Status ID may have ONLY ONE active Plan ID.
    // Never silently release or replace an existing relationship.
    const vsExisting = this.relationships.find((r) => r.vehicleStatusId === vsId);
    if (vsExisting) {
      return {
        success: false,
        error: `VEHICLE STATUS ALREADY LINKED: Vehicle Status ${vsId} is already linked to Plan ${vsExisting.planId}`,
        reason: 'VS_ALREADY_HAS_PLAN',
      };
    }

    // 5. STRICT 1-TO-1 INVARIANT: Plan ownership check
    // An active Plan ID may have ONLY ONE active Vehicle Status ID.
    // Never silently release or replace an existing relationship.
    const planExisting = this.relationships.find((r) => r.planId === planId);
    if (planExisting) {
      return {
        success: false,
        error: `PLAN ALREADY LINKED: Plan ${planId} is already owned by Vehicle Status ${planExisting.vehicleStatusId}`,
        reason: 'PLAN_ALREADY_OWNED',
      };
    }

    // 6. Create relationship
    const newRel: AuthoritativeRelationship = {
      id: generateRelId(),
      vehicleStatusId: vsId,
      planId,
      source,
      linkedAt: new Date().toISOString(),
      notes,
    };

    this.relationships.push(newRel);
    storageRepo.saveRelationships(this.relationships);

    return { success: true, relationship: newRel };
  }

  /**
   * Release / delete relationship by ID or entity ID (VS or Plan)
   */
  public removeRelationship(idOrEntityId: string): void {
    this.relationships = this.relationships.filter(
      (r) =>
        r.id !== idOrEntityId &&
        r.vehicleStatusId !== idOrEntityId &&
        r.planId !== idOrEntityId
    );
    storageRepo.saveRelationships(this.relationships);
  }

  /**
   * Clean relationships referencing a deleted or cancelled entity
   */
  public cleanReferencesForDeleted(entityId: string): void {
    const prevCount = this.relationships.length;
    this.relationships = this.relationships.filter(
      (r) => r.vehicleStatusId !== entityId && r.planId !== entityId
    );
    if (this.relationships.length !== prevCount) {
      storageRepo.saveRelationships(this.relationships);
    }
  }

  /**
   * Clean all relationships referencing cancelled plans
   */
  public cleanCancelledPlans(plans: VehiclePlan[]): void {
    const cancelledIds = new Set(plans.filter((p) => p.isCancelled).map((p) => p.id));
    if (cancelledIds.size === 0) return;

    const prevCount = this.relationships.length;
    this.relationships = this.relationships.filter((r) => !cancelledIds.has(r.planId));
    if (this.relationships.length !== prevCount) {
      storageRepo.saveRelationships(this.relationships);
    }
  }

  /**
   * Clear all relationships (e.g. on full reset)
   */
  public clearAll(): void {
    this.relationships = [];
    storageRepo.saveRelationships([]);
  }
}

export const relationshipService = new RelationshipService();
