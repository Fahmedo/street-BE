import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, ILike } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLog, Platform } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId: string;
  organizationId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  platform?: Platform;
  metadata?: Record<string, any>;
  userEmail?: string;
  userName?: string;
  organizationName?: string | null;
}
export interface GetLogsQuery {
  organizationId?: string; // filter by org (org admins)
  userId?: string; // filter by specific user
  entity?: string; // filter by entity type e.g. 'Mentor'
  entityId?: string; // filter by specific entity
  action?: string; // filter by action type
  startDate?: Date;
  organizationName?: string;
  endDate?: Date;
  page?: number; // 1-based
  limit?: number; // default 20
}

export interface PaginatedLogs {
  items: ReturnType<AuditLogService['formatLog']>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * FAANG pattern: emit and return immediately — zero await, zero latency added.
   * The listener handles the actual DB write asynchronously.
   */
  log(dto: CreateAuditLogDto): void {
    // No await — fire and forget
    this.eventEmitter.emit('audit.log', dto);
  }

  //  ── QUERIES (used by reports/admin panels only) ─────────────────────────
  async getLogs(query: GetLogsQuery): Promise<PaginatedLogs> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20)); // cap at 100
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.userId) where.userId = query.userId;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;
    if (query.startDate && query.endDate) {
      where.timestamp = Between(query.startDate, query.endDate);
    }
    if (query.organizationName) {
      where.organizationName = ILike(`%${query.organizationName}%`);
    }

    const [rows, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      take: limit,
      skip,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: rows.map((log) => this.formatLog(log)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
  async getLogsByEntity(
    entity: string,
    entityId: string,
    organizationId: string | undefined, // ← was required, now optional
    limit = 50,
  ) {
    const where: FindOptionsWhere<AuditLog> = { entity, entityId };
    if (organizationId) where.organizationId = organizationId; // ← only filter if provided

    return this.auditLogRepository.find({
      where,
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getLogsByUser(
    userId: string,
    organizationId: string | undefined, // ← optional
    limit = 50,
  ) {
    const where: FindOptionsWhere<AuditLog> = { userId };
    if (organizationId) where.organizationId = organizationId;

    return this.auditLogRepository.find({
      where,
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getRecentLogs(organizationId: string, limit = 100) {
    return this.auditLogRepository.find({
      where: { organizationId },
      //relations: ['user'],
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getLogsForPlatformReport(startDate: Date, endDate: Date) {
    return this.auditLogRepository.find({
      where: { timestamp: Between(startDate, endDate) },
      order: { timestamp: 'DESC' },
    });
  }

  formatLog(log: AuditLog) {
    return {
      id: log.id,
      actor: log.userName ?? log.userEmail ?? 'System',
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      platform: log.platform,
      timestamp: log.timestamp,
      metadata: log.metadata,
      organizationName: log.organizationName ?? null,
    };
  }
}
