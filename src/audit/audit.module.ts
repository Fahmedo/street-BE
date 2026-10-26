import { Module, Global, Scope } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogService } from './audit-log.service';
import { AuditEventListener } from './audit-event.listener';
import { AuditLogController } from './audit-log.controller'; // ← ADD

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    EventEmitterModule.forRoot({
      wildcard: false,
      maxListeners: 20,
    }),
  ],
  controllers: [AuditLogController],
  providers: [
    {
      provide: AuditLogService,
      useClass: AuditLogService,
    },
    AuditEventListener,   
  ],
  exports: [AuditLogService],
})
export class AuditModule {}