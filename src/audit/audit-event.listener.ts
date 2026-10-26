import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, Platform } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './audit-log.service';

@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  // In-memory buffer for batch writes (FAANG pattern: batch inserts = less DB pressure)
  private buffer: CreateAuditLogDto[] = [];
  private flushInterval: NodeJS.Timeout;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 2000; // flush every 2 seconds

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    // Start the periodic flush
    this.flushInterval = setInterval(
      () => this.flush(),
      this.FLUSH_INTERVAL_MS,
    );
  }

  @OnEvent('audit.log', { async: true })
  async handleAuditEvent(dto: CreateAuditLogDto): Promise<void> {
    this.buffer.push(dto);

    // If buffer is full, flush immediately (don't wait for interval)
    if (this.buffer.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    // Drain buffer atomically
    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const entities = batch.map((dto) =>
        this.auditLogRepository.create({
          ...dto,
          platform: dto.platform ?? Platform.WEB,
        }),
      );

      // Single INSERT for entire batch — drastically reduces DB round trips
      await this.auditLogRepository
        .createQueryBuilder()
        .insert()
        .into(AuditLog)
        .values(entities)
        .execute();
    } catch (error) {
      this.logger.error(
        `Audit batch flush failed for ${batch.length} events`,
        error,
      );
      // Optionally: push to dead-letter queue or retry
    }
  }

  // Flush on shutdown so no logs are lost
  async onModuleDestroy() {
    clearInterval(this.flushInterval);
    await this.flush();
  }
}
