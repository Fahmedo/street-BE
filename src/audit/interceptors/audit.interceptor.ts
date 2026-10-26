import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_KEY, AuditOptions } from '../decorators/audit.decorator';
import { Platform } from '../entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // ← Guard: only handle HTTP, skip RPC/WS
    if (context.getType() !== 'http') return next.handle();

    const auditMeta = this.reflector.get<AuditOptions>(
      AUDIT_KEY,
      context.getHandler(),
    );

    // No @Audit decorator — skip immediately
    if (!auditMeta) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req?.user;

    return next.handle().pipe(
      tap({
        next: (result) => {
          if (!user?.userId) return; // skip if no authenticated user

          this.auditLogService.log({
            userId: user.userId,
            organizationId: user.organizationId ?? user.userId,
            action: auditMeta.action,
            entity: auditMeta.entity,
            entityId: auditMeta.getEntityId?.(result),
            details: auditMeta.getDetails?.([]) ?? `${auditMeta.action} performed`,
            platform: this.getPlatform(req),
          });
        },
        error: (err) => {
          this.logger.warn(`Audit skipped due to error: ${err.message}`);
        },
      }),
    );
  }

  private getPlatform(req: any): Platform {
    const ua = req.headers?.['user-agent'] ?? '';
    if (ua.includes('Mobile') || ua.includes('ReactNative')) return Platform.MOBILE;
    return Platform.WEB;
  }
}