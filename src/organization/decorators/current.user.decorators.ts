import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Organization } from '../entities/organization.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Organization => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // ← was request.organization
  },
);