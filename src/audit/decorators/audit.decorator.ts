import { applyDecorators, SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_metadata';

export interface AuditOptions {
  action: string;
  entity: string;
  getEntityId?: (result: any, req?: any) => string; 
  getDetails?: (args: any[]) => string;
}

/**
 * Usage:
 * @Audit({ action: AuditAction.MENTOR_CREATED, entity: 'Mentor' })
 * async createMentor(...) {}
 */
export const Audit = (options: AuditOptions) =>
  applyDecorators(SetMetadata(AUDIT_KEY, options));